import { NextRequest, NextResponse } from 'next/server';
import {
  consumeTestRunOutput,
  getTestRunStatus,
} from '@/lib/personas/testing/testRunner';

/** Wait up to `ms` for the test run buffer to appear. */
async function waitForBuffer(testRunId: string, ms: number = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const output = consumeTestRunOutput(testRunId);
    const status = getTestRunStatus(testRunId);
    if (output.length > 0 || status) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  const output = consumeTestRunOutput(testRunId);
  const status = getTestRunStatus(testRunId);
  return output.length > 0 || !!status;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testRunId: string }> }
) {
  try {
    const { testRunId } = await params;

    const found = await waitForBuffer(testRunId);
    if (!found) {
      return NextResponse.json(
        { error: 'Test run not found' },
        { status: 404 }
      );
    }

    let offset = 0;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const startTime = Date.now();
        const timeout = 15 * 60 * 1000; // 15 minutes

        const sendEvent = (data: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Controller may be closed
          }
        };

        const pollInterval = setInterval(() => {
          try {
            if (Date.now() - startTime > timeout) {
              clearInterval(pollInterval);
              sendEvent({ done: true, status: 'timeout', result: null });
              controller.close();
              return;
            }

            const lines = consumeTestRunOutput(testRunId, offset);
            if (lines.length > 0) {
              for (const line of lines) {
                sendEvent({ line });
              }
              offset += lines.length;
            }

            const currentStatus = getTestRunStatus(testRunId);
            if (currentStatus?.done) {
              const remaining = consumeTestRunOutput(testRunId, offset);
              for (const line of remaining) {
                sendEvent({ line });
              }

              clearInterval(pollInterval);
              sendEvent({
                done: true,
                status: currentStatus.error ? 'error' : 'completed',
                result: currentStatus.result,
                error: currentStatus.error,
              });
              controller.close();
            }
          } catch (error) {
            console.error('Error in test run SSE poll:', error);
            clearInterval(pollInterval);
            sendEvent({ done: true, status: 'error', result: null, error: 'Stream error' });
            controller.close();
          }
        }, 500);

        request.signal.addEventListener('abort', () => {
          clearInterval(pollInterval);
          try { controller.close(); } catch { /* already closed */ }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error streaming test run output:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stream test run output' },
      { status: 500 }
    );
  }
}
