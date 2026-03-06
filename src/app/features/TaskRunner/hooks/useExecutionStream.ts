'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ActivityType, TaskPhase } from '../lib/constants';

export interface LiveToolEvent {
  id: string;
  tool: string;
  activityType: ActivityType;
  target?: string;
  timestamp: string;
}

export interface ExecutionStreamState {
  phase: TaskPhase;
  phaseMessage: string;
  events: LiveToolEvent[];
  isConnected: boolean;
}

/**
 * Hook that subscribes to a task's SSE stream and periodically fetches
 * activity data to build a live tool invocation feed.
 *
 * Returns the current phase + last N tool invocations for display.
 */
export function useExecutionStream(
  taskId: string | undefined,
  enabled: boolean = true,
  maxEvents: number = 10
): ExecutionStreamState {
  const [phase, setPhase] = useState<TaskPhase>('idle');
  const [phaseMessage, setPhaseMessage] = useState('');
  const [events, setEvents] = useState<LiveToolEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastProgressCountRef = useRef(0);
  const fetchingRef = useRef(false);

  // Fetch full activity data from task status endpoint
  const fetchActivity = useCallback(async () => {
    if (!taskId || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(`/api/claude-code/tasks/${encodeURIComponent(taskId)}`);
      if (!res.ok) return;
      const data = await res.json();

      // Update phase from activity data
      if (data.activity?.phase) {
        setPhase(data.activity.phase);
      }

      // Build tool events from activity history
      if (data.activity?.history && Array.isArray(data.activity.history)) {
        const newEvents: LiveToolEvent[] = data.activity.history
          .slice(-maxEvents)
          .map((evt: { tool: string; type: ActivityType; target?: string; timestamp: string }, i: number) => ({
            id: `${taskId}-${i}-${evt.timestamp}`,
            tool: evt.tool || 'unknown',
            activityType: evt.type || 'thinking',
            target: evt.target,
            timestamp: evt.timestamp || new Date().toISOString(),
          }));
        setEvents(newEvents);
      }

      // Also check raw progress lines for a richer event list
      if (data.progress && Array.isArray(data.progress)) {
        lastProgressCountRef.current = data.progress.length;
      }
    } catch {
      // Silently fail — SSE will retry
    } finally {
      fetchingRef.current = false;
    }
  }, [taskId, maxEvents]);

  useEffect(() => {
    if (!taskId || !enabled) {
      setIsConnected(false);
      return;
    }

    // Initial fetch
    fetchActivity();

    // Connect to SSE stream
    const url = `/api/claude-code/tasks/${encodeURIComponent(taskId)}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === 'heartbeat') return;

        // On any change, check if progress count increased
        if (data.type === 'change' || data.type === 'status') {
          // Update phase from mcpProgress if available
          if (data.mcpProgress?.phase) {
            setPhase(data.mcpProgress.phase as TaskPhase);
          }
          if (data.mcpProgress?.message) {
            setPhaseMessage(data.mcpProgress.message);
          }

          // If progress count changed, re-fetch full activity
          const newCount = data.progressCount ?? 0;
          if (newCount > lastProgressCountRef.current) {
            lastProgressCountRef.current = newCount;
            fetchActivity();
          }
        }

        // Update phase from full status events
        if ((data.type === 'status' || data.type === 'final') && data.activity?.phase) {
          setPhase(data.activity.phase);
        }

        // Terminal — disconnect
        if (data.type === 'done') {
          setIsConnected(false);
          es.close();
        }
      } catch {
        // Ignore malformed messages
      }
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [taskId, enabled, fetchActivity]);

  return { phase, phaseMessage, events, isConnected };
}
