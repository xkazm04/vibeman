import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { consumeOutput, getBufferLength } from '@/lib/personas/executionEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify execution exists
    const execution = await personaDb.executions.getById(id);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const startTime = Date.now();
        const timeout = 10 * 60 * 1000; // 10 minutes
        let sentOffset = 0; // Track how many lines we've already sent

        const sendEvent = (data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Controller may be closed
          }
        };

        const pollInterval = setInterval(async () => {
          try {
            // Check timeout
            if (Date.now() - startTime > timeout) {
              clearInterval(pollInterval);
              sendEvent({ done: true, status: 'timeout' });
              controller.close();
              return;
            }

            // Get only NEW output lines (since last poll)
            const bufferLength = getBufferLength(id);
            if (bufferLength > sentOffset) {
              const newLines = consumeOutput(id, sentOffset);
              for (const line of newLines) {
                sendEvent({ line });
              }
              sentOffset = bufferLength;
            }

            // Check if execution is complete
            const currentExecution = await personaDb.executions.getById(id);
            if (!currentExecution) {
              clearInterval(pollInterval);
              sendEvent({ done: true, status: 'error' });
              controller.close();
              return;
            }

            const terminalStatuses = ['completed', 'failed', 'cancelled'];
            if (terminalStatuses.includes(currentExecution.status)) {
              clearInterval(pollInterval);
              // Send any remaining output
              const finalLength = getBufferLength(id);
              if (finalLength > sentOffset) {
                const remainingLines = consumeOutput(id, sentOffset);
                for (const line of remainingLines) {
                  sendEvent({ line });
                }
              }
              sendEvent({ done: true, status: currentExecution.status });
              controller.close();
            }
          } catch (error) {
            console.error('Error in SSE poll:', error);
            clearInterval(pollInterval);
            sendEvent({ done: true, status: 'error' });
            controller.close();
          }
        }, 500);

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(pollInterval);
          controller.close();
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
    console.error('Error streaming execution output:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stream execution output' },
      { status: 500 }
    );
  }
}
