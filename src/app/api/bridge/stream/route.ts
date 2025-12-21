/**
 * Bridge API - SSE Stream
 * GET: Server-Sent Events stream for real-time updates
 */

import { NextRequest } from 'next/server';
import { validateBridgeAuth } from '@/lib/bridge';
import { bridgeEvents } from '@/lib/bridge/eventEmitter';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Auth check
  if (!validateBridgeAuth(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || '*';
  const clientId = uuidv4();

  console.log(`[Bridge/Stream] Client ${clientId} connecting for project ${projectId}`);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Register this client with the event emitter
      bridgeEvents.subscribe(clientId, projectId, controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      const initialMessage = `event: connected\ndata: ${JSON.stringify({
        clientId,
        projectId,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));
    },
    cancel() {
      // Client disconnected
      console.log(`[Bridge/Stream] Client ${clientId} disconnected`);
      bridgeEvents.unsubscribe(clientId);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
