/**
 * GET /api/events/stream
 *
 * Unified SSE endpoint for all system events.
 * Replaces separate SSE endpoints (annette/stream, task streams, xray/stream)
 * with a single connection that receives all event types.
 *
 * Query parameters:
 * - projectId: Filter events by project (optional, omit for all projects)
 * - replay: Send recent events on connect (default: true)
 * - namespaces: Comma-separated list of namespaces to subscribe to (optional, omit for all)
 *
 * Events are sent with `event: <kind>` so clients can use addEventListener for specific types.
 */

import { NextRequest } from 'next/server';
import { eventBus } from '@/lib/events/eventBus';

const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_STREAM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const replay = request.nextUrl.searchParams.get('replay') !== 'false';
  const subscriberId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const startedAt = Date.now();
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        eventBus.removeSSESubscriber(subscriberId);
        try { controller.close(); } catch { /* already closed */ }
      };

      // Send initial connected event
      try {
        controller.enqueue(
          encoder.encode(`event: system:heartbeat\ndata: ${JSON.stringify({
            id: subscriberId,
            kind: 'system:heartbeat',
            timestamp: new Date().toISOString(),
            projectId: null,
            message: 'connected',
          })}\n\n`)
        );
      } catch {
        cleanup();
        return;
      }

      // Register with EventBus — this handles filtering and replay internally
      eventBus.addSSESubscriber(subscriberId, projectId, controller, encoder, replay);

      // Heartbeat to keep connection alive + check TTL
      const heartbeat = setInterval(() => {
        if (Date.now() - startedAt > MAX_STREAM_TTL_MS) {
          try {
            controller.enqueue(
              encoder.encode(`event: system:heartbeat\ndata: ${JSON.stringify({
                id: `hb-${Date.now()}`,
                kind: 'system:heartbeat',
                timestamp: new Date().toISOString(),
                projectId: null,
                message: 'TTL exceeded, reconnect',
              })}\n\n`)
            );
          } catch { /* stream already dead */ }
          cleanup();
          return;
        }

        try {
          controller.enqueue(
            encoder.encode(`event: system:heartbeat\ndata: ${JSON.stringify({
              id: `hb-${Date.now()}`,
              kind: 'system:heartbeat',
              timestamp: new Date().toISOString(),
              projectId: null,
            })}\n\n`)
          );
        } catch {
          cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        cleanup();
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
}
