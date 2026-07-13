/**
 * Claude Terminal Stream API Route (CLI-based)
 *
 * GET: Server-Sent Events stream for real-time CLI execution updates
 */

import { NextRequest } from 'next/server';
import {
  getExecution,
  waitForExecution,
  startExecution,
  subscribeToExecution,
  type CLIExecutionEvent,
} from '@/lib/claude-terminal/cli-service';
import { type CLIEvent, encodeEvent } from '@/components/cli/protocol';

/**
 * GET: Stream execution events via SSE
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('executionId');

  // For direct prompt execution (without pre-created execution)
  const projectPath = searchParams.get('projectPath');
  const prompt = searchParams.get('prompt');
  const resumeSessionId = searchParams.get('resumeSessionId');

  let activeExecutionId = executionId;

  // CSRF guard: when starting a new execution via GET (side-effecting),
  // verify the request originates from this application by checking
  // the Origin or Referer header against the request host.
  if (!activeExecutionId && projectPath && prompt) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host') || 'localhost';
    const isSameOrigin =
      (origin && (origin.includes(host) || origin.includes('localhost'))) ||
      (referer && (referer.includes(host) || referer.includes('localhost')));

    if (!isSameOrigin) {
      return new Response('Forbidden: missing or invalid origin', { status: 403 });
    }

    activeExecutionId = startExecution(
      decodeURIComponent(projectPath),
      decodeURIComponent(prompt),
      resumeSessionId ? decodeURIComponent(resumeSessionId) : undefined
    );
  }

  if (!activeExecutionId) {
    return new Response('Execution ID or (projectPath + prompt) required', { status: 400 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let isStreamClosed = false;
  let lastEventIndex = 0;

  // Hoist refs so cancel() can clear them
  let safetyNetInterval: ReturnType<typeof setInterval> | undefined;
  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE event
      const sendEvent = (event: CLIEvent) => {
        if (isStreamClosed) return;

        try {
          const data = `data: ${encodeEvent(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          isStreamClosed = true;
        }
      };

      // Send initial connected event
      sendEvent({
        type: 'connected',
        data: { executionId: activeExecutionId },
        timestamp: Date.now(),
      });

      // Convert CLI execution events to typed protocol events.
      // CLIExecutionEvent.data is Record<string, unknown> from the CLI process —
      // this is the serialization boundary where we cast to typed protocol shapes.
      const d = (e: CLIExecutionEvent) => e.data as Record<string, never>;

      const convertEvent = (cliEvent: CLIExecutionEvent): CLIEvent | null => {
        const data = d(cliEvent);
        switch (cliEvent.type) {
          case 'init':
            return {
              type: 'connected',
              data: {
                executionId: activeExecutionId,
                sessionId: data.sessionId,
                model: data.model,
                tools: data.tools,
                version: data.version,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'text':
            return {
              type: 'message',
              data: {
                type: 'assistant',
                content: data.content,
                model: data.model,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'tool_use':
            return {
              type: 'tool_use',
              data: {
                toolUseId: data.id,
                toolName: data.name,
                toolInput: data.input,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'tool_result':
            return {
              type: 'tool_result',
              data: {
                toolUseId: data.toolUseId,
                content: data.content,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'result':
            return {
              type: 'result',
              data: {
                sessionId: data.sessionId,
                usage: data.usage,
                durationMs: data.durationMs,
                totalCostUsd: data.costUsd,
                isError: data.isError,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'error':
            return {
              type: 'error',
              data: {
                error: data.message,
                exitCode: data.exitCode,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'rate_limit':
            return {
              type: 'rate_limit',
              data: {
                retryAfterMs: data.retryAfterMs ?? 60000,
                message: data.message,
                isUsingOverage: data.isUsingOverage,
                overageStatus: data.overageStatus,
              },
              timestamp: cliEvent.timestamp,
            };

          default:
            // Unknown event types are skipped (stdout, etc.)
            return null;
        }
      };

      // Wait for execution to be registered (handles race between POST and SSE connect)
      let resolvedExecution;
      try {
        resolvedExecution = await waitForExecution(activeExecutionId!, 5000);
      } catch {
        sendEvent({
          type: 'error',
          data: { error: 'Execution not found' },
          timestamp: Date.now(),
        });
        controller.close();
        return;
      }

      // Execution confirmed — stream events.
      void resolvedExecution; // used only to confirm existence

      const closeStream = () => {
        if (isStreamClosed) return;
        isStreamClosed = true;
        if (unsubscribe) { unsubscribe(); unsubscribe = undefined; }
        if (safetyNetInterval) { clearInterval(safetyNetInterval); safetyNetInterval = undefined; }
        if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = undefined; }
        try { controller.close(); } catch { /* already closed */ }
      };

      // Forward a single CLI event to the client, closing on terminal events.
      const forwardEvent = (event: CLIExecutionEvent): void => {
        if (isStreamClosed) return;
        const converted = convertEvent(event);
        if (converted) sendEvent(converted);
        if (event.type === 'result' || event.type === 'error') {
          closeStream();
        }
      };

      // ── Event-driven: subscribe to the execution's bus channel ──
      // Register the subscription BEFORE flushing buffered events so no event
      // emitted in the gap between flush and subscribe is lost.
      unsubscribe = subscribeToExecution(activeExecutionId!, forwardEvent);

      // Flush events already buffered before we subscribed (covers the race
      // where the process emitted before the SSE client connected).
      const buffered = getExecution(activeExecutionId!)?.events ?? [];
      for (let i = lastEventIndex; i < buffered.length; i++) {
        forwardEvent(buffered[i]);
        if (isStreamClosed) return;
      }
      lastEventIndex = buffered.length;

      // ── Coarse safety net (2s) ──
      // A backstop for two cases the bus cannot cover: the execution being
      // cleaned up entirely, and a terminal status set without a final event
      // (e.g. synthetic completion). Far cheaper than the old 100ms loop.
      safetyNetInterval = setInterval(() => {
        if (isStreamClosed) { clearInterval(safetyNetInterval); return; }

        const execution = getExecution(activeExecutionId!);
        if (!execution) {
          sendEvent({
            type: 'error',
            data: { error: 'Execution was cleaned up' },
            timestamp: Date.now(),
          });
          closeStream();
          return;
        }

        if (execution.status !== 'running') {
          const finalEvent: CLIEvent = execution.status === 'completed'
            ? { type: 'result', data: { sessionId: execution.sessionId }, timestamp: Date.now() }
            : { type: 'error', data: { error: `Execution ${execution.status}` }, timestamp: Date.now() };
          sendEvent(finalEvent);
          closeStream();
        }
      }, 2000);

      // Send heartbeat to keep connection alive (raw write — not a protocol event)
      heartbeatInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(heartbeatInterval);
          return;
        }

        try {
          const hb = `data: ${JSON.stringify({ type: 'heartbeat', data: { executionId: activeExecutionId }, timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(hb));
        } catch {
          isStreamClosed = true;
          clearInterval(heartbeatInterval);
        }
      }, 15000); // Every 15 seconds
    },

    cancel() {
      isStreamClosed = true;
      if (unsubscribe) { unsubscribe(); unsubscribe = undefined; }
      if (safetyNetInterval) clearInterval(safetyNetInterval);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      safetyNetInterval = undefined;
      heartbeatInterval = undefined;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
