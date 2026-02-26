/**
 * GET /api/annette/stream
 * SSE endpoint for proactive Annette notifications
 *
 * Clients connect and receive real-time notifications about:
 * - Brain reflection completions
 * - Implementation outcomes (success/failure/revert)
 * - Decision threshold approaching
 * - Pattern-based suggestions
 * - Task execution lifecycle (start/complete/fail/session-limit)
 */

import { NextRequest } from 'next/server';
import { checkForNotifications } from '@/lib/annette/notificationEngine';

const POLL_INTERVAL_MS = 15_000; // Check every 15 seconds
const MAX_STREAM_TTL_MS = 60 * 60 * 1000; // 1 hour max lifetime

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');

  if (!projectId) {
    return new Response('projectId query parameter is required', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const startedAt = Date.now();
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      };

      /** Safe enqueue — returns false if the stream is dead */
      const safeEnqueue = (chunk: Uint8Array): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(chunk);
          return true;
        } catch {
          cleanup();
          return false;
        }
      };

      // Send initial connection event
      safeEnqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ projectId, timestamp: new Date().toISOString() })}\n\n`)
      );

      // Poll for notifications
      const interval = setInterval(() => {
        // Self-clear if TTL exceeded
        if (Date.now() - startedAt > MAX_STREAM_TTL_MS) {
          safeEnqueue(encoder.encode(`event: expired\ndata: ${JSON.stringify({ reason: 'TTL exceeded' })}\n\n`));
          cleanup();
          return;
        }

        try {
          const notifications = checkForNotifications(projectId);

          for (const notification of notifications) {
            const data = JSON.stringify(notification);
            // Use distinct event name for task notifications
            const eventName = notification.type === 'task_execution'
              ? 'task_notification'
              : 'notification';
            if (!safeEnqueue(encoder.encode(`event: ${eventName}\ndata: ${data}\n\n`))) return;
          }

          // Send heartbeat to keep connection alive
          safeEnqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`)
          );
        } catch {
          // Enqueue failure in error handler means stream is dead
          if (!safeEnqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Check failed' })}\n\n`))) return;
        }
      }, POLL_INTERVAL_MS);

      // Cleanup on disconnect
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
