/**
 * X-Ray Stream API Route
 * Server-Sent Events endpoint for real-time data flow visualization
 */

import { NextRequest } from 'next/server';

// In-memory event buffer for demo purposes
// In production, this would be backed by Redis or similar
interface XRayEvent {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  duration: number;
  layer: string;
  sourceLayer?: string;
  targetLayer: string;
}

// Global event buffer (shared across connections)
const eventBuffer: XRayEvent[] = [];
const MAX_BUFFER_SIZE = 1000;
const subscribers = new Set<(event: XRayEvent) => void>();

// Add event to buffer and notify subscribers
export function addXRayEvent(event: XRayEvent) {
  eventBuffer.push(event);
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift();
  }
  subscribers.forEach((callback) => callback(event));
}

// Export for middleware use
export { eventBuffer, subscribers };

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial batch of recent events
      const recentEvents = eventBuffer.slice(-50);
      if (recentEvents.length > 0) {
        const data = JSON.stringify({ type: 'batch', payload: recentEvents });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      // Subscribe to new events
      const callback = (event: XRayEvent) => {
        try {
          const data = JSON.stringify({ type: 'event', payload: event });
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
