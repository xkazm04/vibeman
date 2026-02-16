'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as personaApi from '@/app/features/Personas/lib/personaApi';

// ── Color Map ──────────────────────────────────────────────────────
export const EVENT_TYPE_HEX_COLORS: Record<string, string> = {
  webhook_received: '#60a5fa',
  execution_completed: '#34d399',
  persona_action: '#a78bfa',
  credential_event: '#fbbf24',
  task_created: '#22d3ee',
  custom: '#818cf8',
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  webhook: 'Webhook',
  execution: 'Execution',
  persona: 'Persona',
  trigger: 'Trigger',
  system: 'System',
};

// ── Types ──────────────────────────────────────────────────────────
export type AnimationPhase = 'entering' | 'on-bus' | 'delivering' | 'done';

export interface RealtimeEvent {
  id: string;
  project_id: string;
  event_type: string;
  source_type: string;
  source_id: string | null;
  target_persona_id: string | null;
  payload: string | null;
  status: string;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  _animationId: string;
  _phase: AnimationPhase;
  _phaseStartedAt: number;
}

export interface RealtimeStats {
  eventsPerMinute: number;
  successRate: number;
  pendingCount: number;
  totalInWindow: number;
  activeSourceIds: string[];
  activeTargetIds: string[];
}

export interface UseRealtimeEventsReturn {
  events: RealtimeEvent[];
  stats: RealtimeStats;
  isPaused: boolean;
  isConnected: boolean;
  selectedEvent: RealtimeEvent | null;
  togglePause: () => void;
  selectEvent: (event: RealtimeEvent | null) => void;
  triggerTestFlow: () => Promise<void>;
  testFlowLoading: boolean;
}

const MAX_EVENTS = 100;
const PHASE_DURATION_MS = 1200; // Time per animation phase

function toRealtimeEvent(evt: any): RealtimeEvent {
  return {
    ...evt,
    _animationId: `rt_${evt.id}_${Date.now()}`,
    _phase: 'entering' as AnimationPhase,
    _phaseStartedAt: Date.now(),
  };
}

// ── Hook ───────────────────────────────────────────────────────────
export function useRealtimeEvents(): UseRealtimeEventsReturn {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<RealtimeEvent | null>(null);
  const [testFlowLoading, setTestFlowLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phase progression timer - advances animation phases
  useEffect(() => {
    phaseTimerRef.current = setInterval(() => {
      setEvents(prev => {
        let changed = false;
        const now = Date.now();
        const next = prev.map(evt => {
          if (evt._phase === 'done') return evt;
          const elapsed = now - evt._phaseStartedAt;
          if (elapsed < PHASE_DURATION_MS) return evt;

          changed = true;
          const nextPhase: AnimationPhase =
            evt._phase === 'entering' ? 'on-bus' :
            evt._phase === 'on-bus' ? 'delivering' :
            'done';
          return { ...evt, _phase: nextPhase, _phaseStartedAt: now };
        });
        return changed ? next : prev;
      });
    }, 200);

    return () => {
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, []);

  // SSE connection
  useEffect(() => {
    if (isPaused) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const es = new EventSource('/api/personas/events/stream');
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === 'initial' && Array.isArray(data.events)) {
          const rtEvents = data.events.map(toRealtimeEvent);
          setEvents(rtEvents.slice(-MAX_EVENTS));
        }

        if (data.type === 'event' && data.event) {
          const rtEvent = toRealtimeEvent(data.event);
          setEvents(prev => {
            const next = [...prev, rtEvent];
            return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
          });
        }

        if (data.type === 'status_update' && data.event) {
          setEvents(prev =>
            prev.map(e =>
              e.id === data.event.id
                ? { ...e, status: data.event.status, processed_at: data.event.processed_at, error_message: data.event.error_message }
                : e
            )
          );
        }
      } catch {
        // skip parse errors
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [isPaused]);

  // Compute stats
  const stats = useMemo<RealtimeStats>(() => {
    const now = Date.now();
    const oneMinAgo = now - 60_000;
    const recentEvents = events.filter(e => new Date(e.created_at).getTime() > oneMinAgo);
    const completed = events.filter(e => e.status === 'completed').length;
    const failed = events.filter(e => e.status === 'failed').length;
    const total = completed + failed;

    const activeSourceIds = [...new Set(
      events.filter(e => e._phase !== 'done' && e.source_id).map(e => e.source_id!)
    )];
    const activeTargetIds = [...new Set(
      events.filter(e => e._phase !== 'done' && e.target_persona_id).map(e => e.target_persona_id!)
    )];

    return {
      eventsPerMinute: recentEvents.length,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
      pendingCount: events.filter(e => e.status === 'pending' || e.status === 'processing').length,
      totalInWindow: events.length,
      activeSourceIds,
      activeTargetIds,
    };
  }, [events]);

  const togglePause = useCallback(() => setIsPaused(p => !p), []);
  const selectEvent = useCallback((evt: RealtimeEvent | null) => setSelectedEvent(evt), []);

  const triggerTestFlow = useCallback(async () => {
    setTestFlowLoading(true);
    try {
      await personaApi.triggerTestFlow();
    } catch (err) {
      console.error('Failed to trigger test flow:', err);
    } finally {
      setTestFlowLoading(false);
    }
  }, []);

  return {
    events,
    stats,
    isPaused,
    isConnected,
    selectedEvent,
    togglePause,
    selectEvent,
    triggerTestFlow,
    testFlowLoading,
  };
}
