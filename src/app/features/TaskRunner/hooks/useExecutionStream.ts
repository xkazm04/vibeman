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
  percentage: number;
  events: LiveToolEvent[];
  isConnected: boolean;
}

/**
 * Applies pre-classified activity data from SSE events to local state.
 * Eliminates the need to re-fetch full task status on every progress change.
 */
function applyClassifiedActivity(
  data: {
    activity?: {
      phase?: string;
      percentage?: number;
      recentEvents?: Array<{
        tool: string;
        activityType: string;
        target?: string;
        timestamp: string;
      }>;
    };
  },
  taskId: string,
  maxEvents: number,
  setPhase: (p: TaskPhase) => void,
  setPercentage: (p: number) => void,
  setEvents: (e: LiveToolEvent[]) => void
): boolean {
  const activity = data.activity;
  if (!activity) return false;

  if (activity.phase) {
    setPhase(activity.phase as TaskPhase);
  }
  if (typeof activity.percentage === 'number') {
    setPercentage(activity.percentage);
  }
  if (activity.recentEvents && Array.isArray(activity.recentEvents)) {
    const newEvents: LiveToolEvent[] = activity.recentEvents
      .slice(-maxEvents)
      .map((evt, i) => ({
        id: `${taskId}-${i}-${evt.timestamp}`,
        tool: evt.tool || 'unknown',
        activityType: (evt.activityType || 'thinking') as ActivityType,
        target: evt.target,
        timestamp: evt.timestamp || new Date().toISOString(),
      }));
    setEvents(newEvents);
  }
  return true;
}

/**
 * Hook that subscribes to a task's SSE stream for real-time classified events.
 *
 * Activity classification runs server-side and is delivered via SSE,
 * eliminating redundant client-side re-parsing. Falls back to fetching
 * full task status only for initial load and terminal events.
 *
 * Returns the current phase, percentage, and last N tool invocations.
 */
export function useExecutionStream(
  taskId: string | undefined,
  enabled: boolean = true,
  maxEvents: number = 10
): ExecutionStreamState {
  const [phase, setPhase] = useState<TaskPhase>('idle');
  const [phaseMessage, setPhaseMessage] = useState('');
  const [percentage, setPercentage] = useState(0);
  const [events, setEvents] = useState<LiveToolEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fetchingRef = useRef(false);

  // Fetch full activity data — used only for initial load and final status
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

    // Initial fetch for first render
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

        // Handle change events — use pre-classified activity data from SSE
        if (data.type === 'change') {
          // Update phase from mcpProgress if available
          if (data.mcpProgress?.phase) {
            setPhase(data.mcpProgress.phase as TaskPhase);
          }
          if (data.mcpProgress?.message) {
            setPhaseMessage(data.mcpProgress.message);
          }

          // Apply server-side classified activity directly — no re-fetch needed
          applyClassifiedActivity(data, taskId, maxEvents, setPhase, setPercentage, setEvents);
        }

        // Handle initial status and final events (full task data)
        if (data.type === 'status' || data.type === 'final') {
          if (data.activity?.phase) {
            setPhase(data.activity.phase as TaskPhase);
          }
          // Final events may include full task data with progressState
          if (data.task?.progressState?.percentage !== undefined) {
            setPercentage(data.task.progressState.percentage);
          }
        }

        // Terminal — disconnect
        if (data.type === 'done') {
          setPercentage(100);
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
  }, [taskId, enabled, fetchActivity, maxEvents]);

  return { phase, phaseMessage, percentage, events, isConnected };
}
