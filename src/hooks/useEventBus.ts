/**
 * useEventBus – Client-side hook for the unified EventBus SSE stream
 *
 * Connects to /api/events/stream and dispatches typed events to subscribers.
 * Uses useSSEStreamWithBackoff for automatic reconnection with exponential backoff.
 *
 * Usage:
 * ```ts
 * const { status } = useEventBus({
 *   projectId: activeProject?.id,
 *   handlers: {
 *     'task:change': (event) => console.log('Task changed', event.taskId),
 *     'notification:push': (event) => addNotification(event),
 *   },
 * });
 * ```
 */

'use client';

import { useRef, useMemo } from 'react';
import { useSSEStreamWithBackoff, type SSEConnectionStatus } from './useSSEStreamWithBackoff';
import type { BusEvent, EventKind, EventByKind } from '@/lib/events/types';

/** Map of event kind → handler for that event type */
export type EventHandlerMap = {
  [K in EventKind]?: (event: EventByKind<K>) => void;
};

interface UseEventBusOptions {
  /** Project ID to filter events (omit for all projects) */
  projectId?: string | null;
  /** Whether to replay recent events on connect (default: true) */
  replay?: boolean;
  /** Event handlers by kind */
  handlers: EventHandlerMap;
  /** Disable the connection (e.g., when no project selected) */
  enabled?: boolean;
}

interface UseEventBusResult {
  /** SSE connection status */
  status: SSEConnectionStatus;
}

export function useEventBus({
  projectId,
  replay = true,
  handlers,
  enabled = true,
}: UseEventBusOptions): UseEventBusResult {
  // Keep handlers in a ref so SSE listeners always use the latest callbacks
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Build the SSE URL
  const url = useMemo(() => {
    if (!enabled) return null;

    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (!replay) params.set('replay', 'false');
    const qs = params.toString();
    return `/api/events/stream${qs ? `?${qs}` : ''}`;
  }, [projectId, replay, enabled]);

  // Build event listeners that route to the correct typed handler
  const eventListeners = useMemo(() => {
    // We listen to all possible event kinds via named SSE event listeners.
    // The SSE server sends `event: <kind>`, so we register one listener per kind.
    const listeners: Record<string, (event: MessageEvent) => void> = {};

    // Create a generic dispatcher that parses the event data and routes to the handler
    const createListener = (kind: EventKind) => (sseEvent: MessageEvent) => {
      try {
        const data = JSON.parse(sseEvent.data) as BusEvent;
        const handler = handlersRef.current[kind];
        if (handler) {
          // TypeScript can't narrow here, but we know the kind matches
          (handler as (event: BusEvent) => void)(data);
        }
      } catch {
        // Silently ignore malformed SSE data
      }
    };

    // Register listeners for all event kinds that have handlers
    const allKinds: EventKind[] = [
      'task:change',
      'task:notification',
      'agent:lifecycle',
      'conductor:status',
      'reflection:started',
      'reflection:progress',
      'reflection:completed',
      'reflection:failed',
      'notification:push',
      'project:update',
      'system:heartbeat',
      'system:error',
    ];

    for (const kind of allKinds) {
      listeners[kind] = createListener(kind);
    }

    return listeners;
  }, []); // Stable reference — handlers are accessed via ref

  const { status } = useSSEStreamWithBackoff({
    url,
    eventListeners,
  });

  return { status };
}
