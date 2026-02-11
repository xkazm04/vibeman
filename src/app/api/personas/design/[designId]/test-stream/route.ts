import { NextRequest, NextResponse } from 'next/server';
import {
  consumeTestOutput,
  getTestBufferLength,
  getTestStatus,
} from '@/lib/personas/designEngine';

/** Wait up to `ms` for the test buffer to appear (set by the POST handler). */
async function waitForBuffer(designId: string, ms: number = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (getTestBufferLength(designId) > 0 || getTestStatus(designId)) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return getTestBufferLength(designId) > 0 || !!getTestStatus(designId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ designId: string }> }
) {
  try {
    const { designId } = await params;

    // Wait briefly for the buffer to be initialized (race-condition guard)
    const found = await waitForBuffer(designId);
    if (!found) {
      return NextResponse.json(
        { error: 'Test analysis not found' },
        { status: 404 }
      );
    }

    let offset = 0;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const startTime = Date.now();
        const timeout = 5 * 60 * 1000;

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

            const currentLength = getTestBufferLength(designId);
            if (currentLength > offset) {
              const lines = consumeTestOutput(designId, offset);
              for (const line of lines) {
                sendEvent({ line });
              }
              offset += lines.length;
            }

            const currentStatus = getTestStatus(designId);
            if (currentStatus?.done) {
              const remaining = consumeTestOutput(designId, offset);
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
            console.error('Error in test SSE poll:', error);
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
    console.error('Error streaming test output:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stream test output' },
      { status: 500 }
    );
  }
}
