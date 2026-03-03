/**
 * Copilot SDK Stream API Route
 *
 * GET: Server-Sent Events stream for real-time Copilot SDK execution updates.
 * Mirrors the pattern from claude-terminal/stream/route.ts.
 */

import { NextRequest } from 'next/server';
import {
  getCopilotExecution,
  waitForCopilotExecution,
  type CopilotExecutionEvent,
} from '@/lib/copilot-sdk/client';
import { type CLIEvent, encodeEvent } from '@/components/cli/protocol';

/**
 * GET: Stream execution events via SSE
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('executionId');

  if (!executionId) {
    return new Response('executionId query parameter is required', { status: 400 });
  }

  const encoder = new TextEncoder();
  let isStreamClosed = false;
  let lastEventIndex = 0;

  let pollInterval: ReturnType<typeof setInterval> | undefined;
  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
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
        data: { executionId },
        timestamp: Date.now(),
      });

      // Convert Copilot execution events to CLIEvent protocol events
      const convertEvent = (cliEvent: CopilotExecutionEvent): CLIEvent | null => {
        const data = cliEvent.data as Record<string, never>;
        switch (cliEvent.type) {
          case 'init':
            return {
              type: 'connected',
              data: {
                executionId,
                sessionId: data.sessionId,
                model: data.model,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'text':
            return {
              type: 'message',
              data: {
                type: 'assistant',
                content: data.content,
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
                durationMs: data.durationMs,
                isError: data.isError,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'error':
            return {
              type: 'error',
              data: {
                error: data.message,
              },
              timestamp: cliEvent.timestamp,
            };

          default:
            return null;
        }
      };

      // Wait for execution to be registered
      try {
        await waitForCopilotExecution(executionId, 5000);
      } catch {
        sendEvent({
          type: 'error',
          data: { error: 'Execution not found' },
          timestamp: Date.now(),
        });
        controller.close();
        return;
      }

      // Poll for new events
      pollInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(pollInterval);
          return;
        }

        const execution = getCopilotExecution(executionId);
        if (!execution) {
          clearInterval(pollInterval);
          sendEvent({
            type: 'error',
            data: { error: 'Execution was cleaned up' },
            timestamp: Date.now(),
          });
          controller.close();
          return;
        }

        // Send new events
        const newEvents = execution.events.slice(lastEventIndex);
        for (const event of newEvents) {
          const converted = convertEvent(event);
          if (!converted) continue;

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
      }, 100);

      // Heartbeat every 15 seconds
      heartbeatInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        try {
          const hb = `data: ${JSON.stringify({ type: 'heartbeat', data: { executionId }, timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(hb));
        } catch {
          isStreamClosed = true;
          clearInterval(heartbeatInterval);
        }
      }, 15000);
    },

    cancel() {
      isStreamClosed = true;
      if (pollInterval) clearInterval(pollInterval);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      pollInterval = undefined;
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
