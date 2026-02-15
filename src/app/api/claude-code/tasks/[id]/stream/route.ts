/**
 * SSE Stream for Task Status Updates
 *
 * GET /api/claude-code/tasks/:id/stream
 *
 * Provides real-time task status updates via Server-Sent Events.
 * Subscribes to the task change emitter and pushes events immediately
 * when task state changes (status, progress). Includes 30s heartbeat
 * to keep the connection alive and detect stale connections.
 *
 * Replaces 10s polling with instant push notifications.
 * Client falls back to 30s polling if SSE connection drops.
 */

import { NextRequest, NextResponse } from 'next/server';
import { onTaskChange, type TaskChangeEvent } from '@/app/Claude/lib/taskChangeEmitter';
import { getTaskStatus } from '../../../taskStatusHandler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const startTime = Date.now();
      const timeout = 30 * 60 * 1000; // 30 minutes max connection
      const heartbeatInterval = 30_000; // 30s heartbeat
      let closed = false;

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Send initial status immediately so client doesn't wait
      (async () => {
        try {
          const initial = await getTaskStatus(taskId);
          const body = await initial.json();
          send({ type: 'status', ...body, timestamp: new Date().toISOString() });
        } catch {
          // Task may not exist yet, that's fine
          send({ type: 'waiting', taskId, timestamp: new Date().toISOString() });
        }
      })();

      // Subscribe to task changes
      const unsubscribe = onTaskChange(taskId, (event: TaskChangeEvent) => {
        send({
          type: 'change',
          taskId: event.taskId,
          status: event.status,
          progressCount: event.progressCount,
          timestamp: event.timestamp,
        });

        // On terminal status, fetch full status one more time then close
        const terminalStatuses = ['completed', 'failed', 'session-limit'];
        if (terminalStatuses.includes(event.status)) {
          // Give client a moment, then send final full status and close
          setTimeout(async () => {
            try {
              const final = await getTaskStatus(taskId);
              const body = await final.json();
              send({ type: 'final', ...body, timestamp: new Date().toISOString() });
            } catch {
              // Ignore - change event already sent
            }
            send({ type: 'done', status: event.status });
            cleanup();
          }, 200);
        }
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed || Date.now() - startTime > timeout) {
          cleanup();
          return;
        }
        send({ type: 'heartbeat', timestamp: new Date().toISOString() });
      }, heartbeatInterval);

      function cleanup() {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      }

      // Client disconnect
      request.signal.addEventListener('abort', cleanup);
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
