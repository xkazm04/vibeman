/**
 * Claude Terminal Stream API Route (CLI-based)
 *
 * GET: Server-Sent Events stream for real-time CLI execution updates
 */

import { NextRequest } from 'next/server';
import {
  getExecution,
  startExecution,
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

  // If no execution ID, start a new one
  if (!activeExecutionId && projectPath && prompt) {
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

          default:
            // Unknown event types are skipped (stdout, etc.)
            return null;
        }
      };

      // Track retry attempts for execution not found
      let executionNotFoundCount = 0;
      const maxNotFoundRetries = 30; // Wait up to 3 seconds for execution to appear

      // Poll for new events
      const pollInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(pollInterval);
          return;
        }

        const execution = getExecution(activeExecutionId!);
        if (!execution) {
          executionNotFoundCount++;

          // Retry for a bit before giving up (handles race conditions and module reloads)
          if (executionNotFoundCount < maxNotFoundRetries) {
            // Just wait and try again
            return;
          }

          clearInterval(pollInterval);
          sendEvent({
            type: 'error',
            data: { error: 'Execution not found' },
            timestamp: Date.now(),
          });
          controller.close();
          return;
        }

        // Reset counter once execution is found
        executionNotFoundCount = 0;

        // Send new events
        const newEvents = execution.events.slice(lastEventIndex);
        for (const event of newEvents) {
          const converted = convertEvent(event);
          if (!converted) continue; // Skip unknown event types (stdout, etc.)

          sendEvent(converted);

          // Close stream on terminal events
          if (event.type === 'result' || event.type === 'error') {
            isStreamClosed = true;
            clearInterval(pollInterval);
            controller.close();
            return;
          }
        }
        lastEventIndex = execution.events.length;

        // Check if execution is complete
        if (execution.status !== 'running') {
          // Send final event if not already sent
          if (!isStreamClosed) {
            const finalEvent: CLIEvent = execution.status === 'completed'
              ? { type: 'result', data: { sessionId: execution.sessionId }, timestamp: Date.now() }
              : { type: 'error', data: { error: `Execution ${execution.status}` }, timestamp: Date.now() };
            sendEvent(finalEvent);
          }
          isStreamClosed = true;
          clearInterval(pollInterval);
          controller.close();
        }
      }, 100); // Poll every 100ms

      // Send heartbeat to keep connection alive (raw write — not a protocol event)
      const heartbeatInterval = setInterval(() => {
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
