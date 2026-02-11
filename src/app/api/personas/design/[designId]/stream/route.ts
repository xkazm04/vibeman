import { NextRequest, NextResponse } from 'next/server';
import {
  consumeDesignOutput,
  getDesignBufferLength,
  getDesignStatus,
} from '@/lib/personas/designEngine';

/** Wait up to `ms` for the design buffer to appear (set by the POST handler). */
async function waitForBuffer(designId: string, ms: number = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (getDesignBufferLength(designId) > 0 || getDesignStatus(designId)) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  // Final check
  return getDesignBufferLength(designId) > 0 || !!getDesignStatus(designId);
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
        { error: 'Design analysis not found' },
        { status: 404 }
      );
    }

    // Create SSE stream
    let offset = 0;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const startTime = Date.now();
        const timeout = 10 * 60 * 1000; // 10 minutes

        const sendEvent = (data: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Controller may be closed
          }
        };

        const pollInterval = setInterval(() => {
          try {
            // Check timeout
            if (Date.now() - startTime > timeout) {
              clearInterval(pollInterval);
              sendEvent({ done: true, status: 'timeout', result: null });
              controller.close();
              return;
            }

            // Get new output lines
            const currentLength = getDesignBufferLength(designId);
            if (currentLength > offset) {
              const lines = consumeDesignOutput(designId, offset);
              for (const line of lines) {
                sendEvent({ line });
              }
              offset += lines.length;
            }

            // Check if design analysis is complete
            const currentStatus = getDesignStatus(designId);
            if (currentStatus?.done) {
              // Send any remaining output
              const remaining = consumeDesignOutput(designId, offset);
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
            console.error('Error in design SSE poll:', error);
            clearInterval(pollInterval);
            sendEvent({ done: true, status: 'error', result: null, error: 'Stream error' });
            controller.close();
          }
        }, 500);

        // Cleanup on client disconnect
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
    console.error('Error streaming design output:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stream design output' },
      { status: 500 }
    );
  }
}
