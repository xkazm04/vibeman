/**
 * X-Ray Stream API Route
 * Server-Sent Events endpoint for real-time data flow visualization
 * Now backed by SQLite persistence via obs_xray_events table
 */

import { NextRequest } from 'next/server';
import { xrayRepository } from '@/app/db/repositories/xray.repository';
import type { DbXRayEvent } from '@/app/db/models/types';

// X-Ray event structure for SSE streaming
export interface XRayEvent {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  duration: number;
  layer: string;
  sourceLayer?: string | null;
  targetLayer: string | null;
  contextId?: string | null;
  contextName?: string | null;
  contextGroupId?: string | null;
  contextGroupName?: string | null;
}

// In-memory buffer for real-time SSE notifications (recent events only)
// Primary storage is now in database
const recentEventBuffer: XRayEvent[] = [];
const MAX_BUFFER_SIZE = 100;
const subscribers = new Set<(event: XRayEvent) => void>();

/**
 * Convert database event to SSE event format
 */
export function dbEventToXRayEvent(dbEvent: DbXRayEvent & {
  context_name?: string | null;
  context_group_name?: string | null;
}): XRayEvent {
  return {
    id: dbEvent.id,
    timestamp: dbEvent.timestamp,
    method: dbEvent.method,
    path: dbEvent.path,
    status: dbEvent.status,
    duration: dbEvent.duration,
    layer: dbEvent.target_layer || 'server',
    sourceLayer: dbEvent.source_layer,
    targetLayer: dbEvent.target_layer,
    contextId: dbEvent.context_id,
    contextName: dbEvent.context_name || null,
    contextGroupId: dbEvent.context_group_id,
    contextGroupName: dbEvent.context_group_name || null,
  };
}

/**
 * Add event to real-time buffer and notify SSE subscribers
 * Called by observability middleware after persisting to DB
 */
export function addXRayEvent(event: XRayEvent) {
  recentEventBuffer.push(event);
  if (recentEventBuffer.length > MAX_BUFFER_SIZE) {
    recentEventBuffer.shift();
  }
  // Iterate a snapshot (a callback may self-remove from `subscribers` mid-broadcast),
  // and prune any subscriber whose enqueue throws — e.g. its ReadableStream controller
  // was torn down by the runtime before its own abort handler ran. Without this, dead
  // subscribers accumulate under reconnect churn and pay a throw/catch on every event.
  for (const callback of [...subscribers]) {
    try {
      callback(event);
    } catch {
      subscribers.delete(callback);
    }
  }
}

/**
 * Emit X-Ray event from database record
 * Used by observability middleware to notify SSE subscribers
 */
export function emitXRayEventFromDb(dbEvent: DbXRayEvent & {
  context_name?: string | null;
  context_group_name?: string | null;
}): void {
  const event = dbEventToXRayEvent(dbEvent);
  addXRayEvent(event);
}

/**
 * Get recent events from database with context details
 */
export function getRecentEventsFromDb(limit: number = 50): XRayEvent[] {
  const dbEvents = xrayRepository.getWithContextDetails(limit);
  return dbEvents.map(dbEventToXRayEvent);
}

export { subscribers };

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Shared cleanup state — accessible from both start() and cancel()
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let callback: ((event: XRayEvent) => void) | null = null;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (heartbeat !== null) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
    if (callback !== null) {
      subscribers.delete(callback);
      callback = null;
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      // Send initial batch of recent events from database
      const recentEvents = getRecentEventsFromDb(50);
      if (recentEvents.length > 0) {
        const data = JSON.stringify({ type: 'batch', payload: recentEvents });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      // Subscribe to new real-time events
      callback = (event: XRayEvent) => {
        if (cleaned) return;
        try {
          const enrichedEvent = { ...event };
          const data = JSON.stringify({ type: 'event', payload: enrichedEvent });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          cleanup();
        }
      };

      subscribers.add(callback);

      // Heartbeat to keep connection alive
      heartbeat = setInterval(() => {
        if (cleaned) {
          cleanup();
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      }, 30000);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
