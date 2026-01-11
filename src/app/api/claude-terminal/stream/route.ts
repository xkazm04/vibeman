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

// SSE Event type for the terminal
interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

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
      const sendEvent = (event: SSEEvent) => {
        if (isStreamClosed) return;

        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
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

      // Convert CLI events to SSE events
      const convertEvent = (cliEvent: CLIExecutionEvent): SSEEvent => {
        switch (cliEvent.type) {
          case 'init':
            return {
              type: 'connected',
              data: {
                executionId: activeExecutionId,
                sessionId: cliEvent.data.sessionId,
                model: cliEvent.data.model,
                tools: cliEvent.data.tools,
                version: cliEvent.data.version,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'text':
            return {
              type: 'message',
              data: {
                type: 'assistant',
                content: cliEvent.data.content,
                model: cliEvent.data.model,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'tool_use':
            return {
              type: 'tool_use',
              data: {
                toolUseId: cliEvent.data.id,
                toolName: cliEvent.data.name,
                toolInput: cliEvent.data.input,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'tool_result':
            return {
              type: 'tool_result',
              data: {
                toolUseId: cliEvent.data.toolUseId,
                content: cliEvent.data.content,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'result':
            return {
              type: 'result',
              data: {
                sessionId: cliEvent.data.sessionId,
                usage: cliEvent.data.usage,
                durationMs: cliEvent.data.durationMs,
                totalCostUsd: cliEvent.data.costUsd,
                isError: cliEvent.data.isError,
              },
              timestamp: cliEvent.timestamp,
            };

          case 'error':
            return {
              type: 'error',
              data: {
                error: cliEvent.data.message,
                exitCode: cliEvent.data.exitCode,
              },
              timestamp: cliEvent.timestamp,
            };

          default:
            return {
              type: 'stdout',
              data: cliEvent.data,
              timestamp: cliEvent.timestamp,
            };
        }
      };

      // Poll for new events
      const pollInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(pollInterval);
          return;
        }

        const execution = getExecution(activeExecutionId!);
        if (!execution) {
          clearInterval(pollInterval);
          sendEvent({
            type: 'error',
            data: { error: 'Execution not found' },
            timestamp: Date.now(),
          });
          controller.close();
          return;
        }

        // Send new events
        const newEvents = execution.events.slice(lastEventIndex);
        for (const event of newEvents) {
          // Skip raw stdout events
          if (event.type === 'stdout') continue;

          sendEvent(convertEvent(event));

          // Close stream on result or error
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
            sendEvent({
              type: execution.status === 'completed' ? 'result' : 'error',
              data: {
                status: execution.status,
                sessionId: execution.sessionId,
              },
              timestamp: Date.now(),
            });
          }
          isStreamClosed = true;
          clearInterval(pollInterval);
          controller.close();
        }
      }, 100); // Poll every 100ms

      // Send heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(heartbeatInterval);
          return;
        }

        try {
          sendEvent({
            type: 'heartbeat',
            data: { executionId: activeExecutionId, timestamp: Date.now() },
            timestamp: Date.now(),
          });
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
