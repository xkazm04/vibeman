import { NextRequest, NextResponse } from 'next/server';
import {
  consumeDiscoveryOutput,
  getDiscoveryBufferLength,
  getDiscoveryStatus,
} from '@/lib/personas/connectorDiscovery';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ discoveryId: string }> }
) {
  try {
    const { discoveryId } = await params;

    const bufferLength = getDiscoveryBufferLength(discoveryId);
    const status = getDiscoveryStatus(discoveryId);

    if (bufferLength === 0 && !status) {
      return NextResponse.json(
        { error: 'Discovery not found' },
        { status: 404 }
      );
    }

    let offset = 0;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const startTime = Date.now();
        const timeout = 10 * 60 * 1000;

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

            const currentLength = getDiscoveryBufferLength(discoveryId);
            if (currentLength > offset) {
              const lines = consumeDiscoveryOutput(discoveryId, offset);
              for (const line of lines) {
                sendEvent({ line });
              }
              offset += lines.length;
            }

            const currentStatus = getDiscoveryStatus(discoveryId);
            if (currentStatus?.done) {
              const remaining = consumeDiscoveryOutput(discoveryId, offset);
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
            console.error('Error in discovery SSE poll:', error);
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
    console.error('Error streaming discovery output:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stream discovery output' },
      { status: 500 }
    );
  }
}
