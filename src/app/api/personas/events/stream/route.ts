import { NextRequest } from 'next/server';
import { personaDb } from '@/app/db';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');

  let lastTimestamp = since || new Date(Date.now() - 60_000).toISOString();
  let lastProcessedTimestamp = lastTimestamp;
  let aborted = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: Record<string, unknown>) => {
        if (aborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* closed */ }
      };

      // Send initial batch
      try {
        const initial = personaDb.events.getSince(lastTimestamp, 100);
        if (initial.length > 0) {
          send({ type: 'initial', events: initial });
          lastTimestamp = initial[initial.length - 1].created_at;
        }
      } catch (err) {
        console.error('[events-stream] initial fetch error:', err);
      }

      // Poll every 1s for new events
      const pollInterval = setInterval(() => {
        if (aborted) return;
        try {
          // New events
          const newEvents = personaDb.events.getSince(lastTimestamp, 50);
          for (const evt of newEvents) {
            send({ type: 'event', event: evt });
          }
          if (newEvents.length > 0) {
            lastTimestamp = newEvents[newEvents.length - 1].created_at;
          }

          // Status updates (events that were processed since last check)
          const updated = personaDb.events.getRecentlyProcessed(lastProcessedTimestamp, 50);
          for (const evt of updated) {
            send({ type: 'status_update', event: evt });
          }
          if (updated.length > 0) {
            lastProcessedTimestamp = updated[updated.length - 1].processed_at || lastProcessedTimestamp;
          }
        } catch (err) {
          console.error('[events-stream] poll error:', err);
        }
      }, 1000);

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        if (!aborted) send({ type: 'heartbeat', ts: new Date().toISOString() });
      }, 15000);

      // Auto-close after 30 minutes
      const timeout = setTimeout(() => {
        cleanup();
        try { controller.close(); } catch { /* already closed */ }
      }, 30 * 60 * 1000);

      const cleanup = () => {
        aborted = true;
        clearInterval(pollInterval);
        clearInterval(heartbeat);
        clearTimeout(timeout);
      };

      request.signal.addEventListener('abort', () => {
        cleanup();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
