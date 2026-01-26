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

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');

  if (!projectId) {
    return new Response('projectId query parameter is required', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ projectId, timestamp: new Date().toISOString() })}\n\n`)
      );

      // Poll for notifications
      const interval = setInterval(() => {
        try {
          const notifications = checkForNotifications(projectId);

          for (const notification of notifications) {
            const data = JSON.stringify(notification);
            // Use distinct event name for task notifications
            const eventName = notification.type === 'task_execution'
              ? 'task_notification'
              : 'notification';
            controller.enqueue(
              encoder.encode(`event: ${eventName}\ndata: ${data}\n\n`)
            );
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`)
          );
        } catch (error) {
          // Don't crash the stream on errors
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Check failed' })}\n\n`)
          );
        }
      }, POLL_INTERVAL_MS);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
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
}
