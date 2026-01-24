/**
 * X-Ray Stream API Route
 * Server-Sent Events endpoint for real-time data flow visualization
 * Now backed by SQLite persistence via obs_xray_events table
 */

import { NextRequest } from 'next/server';
import { xrayDb } from '@/app/db';
import type { DbXRayEvent } from '@/app/db';

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
function dbEventToXRayEvent(dbEvent: DbXRayEvent & {
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
  subscribers.forEach((callback) => callback(event));
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
  const dbEvents = xrayDb.getWithContextDetails(limit);
  return dbEvents.map(dbEventToXRayEvent);
}

/**
 * Legacy eventBuffer export for backward compatibility
 * Now returns a proxy that fetches from database
 */
export const eventBuffer: XRayEvent[] = new Proxy(recentEventBuffer, {
  get(target, prop) {
    if (prop === 'length') {
      return target.length;
    }
    if (prop === 'filter') {
      return (fn: (e: XRayEvent) => boolean) => target.filter(fn);
    }
    if (prop === 'slice') {
      return (start?: number, end?: number) => target.slice(start, end);
    }
    return Reflect.get(target, prop);
  },
});

export { subscribers };

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial batch of recent events from database
      // This ensures events survive server restart
      const recentEvents = getRecentEventsFromDb(50);
      if (recentEvents.length > 0) {
        const data = JSON.stringify({ type: 'batch', payload: recentEvents });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      // Subscribe to new real-time events
      const callback = (event: XRayEvent) => {
        try {
          // Enrich event with additional data for visualization
          const enrichedEvent = {
            ...event,
            // Include context info for X-Ray visualization
          };
          const data = JSON.stringify({ type: 'event', payload: enrichedEvent });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Connection closed
          subscribers.delete(callback);
        }
      };

      subscribers.add(callback);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          subscribers.delete(callback);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        subscribers.delete(callback);
      });
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
