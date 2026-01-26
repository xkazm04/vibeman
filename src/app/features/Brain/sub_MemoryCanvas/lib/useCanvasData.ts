/**
 * useCanvasData
 * Hook that fetches real behavioral signals from the API and transforms
 * them into BrainEvent[] for the D3 canvas visualization.
 *
 * Replaces mock data with real project signals.
 * Auto-refreshes every 30 seconds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import type { BrainEvent } from './types';
import type { DbBehavioralSignal } from '@/app/db/models/brain.types';
import { mapSignalsToEvents } from './signalMapper';
import { generateEvents } from './mockData';

const REFRESH_INTERVAL_MS = 30_000;
const MAX_SIGNALS = 200;
const WINDOW_DAYS = 14;

interface CanvasDataState {
  events: BrainEvent[];
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
  lastFetched: number | null;
}

export function useCanvasData(): CanvasDataState & { refresh: () => void } {
  const activeProject = useClientProjectStore(s => s.activeProject);
  const [state, setState] = useState<CanvasDataState>({
    events: [],
    isLoading: true,
    isEmpty: false,
    error: null,
    lastFetched: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchSignals = useCallback(async (projectId: string) => {
    try {
      const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        projectId,
        limit: String(MAX_SIGNALS),
        since,
      });

      const res = await fetch(`/api/brain/signals?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'API returned failure');
      }

      const signals = data.signals as DbBehavioralSignal[];
      const events = mapSignalsToEvents(signals, MAX_SIGNALS);

      if (!mountedRef.current) return;

      if (events.length === 0) {
        // No real signals yet — fall back to mock data for visual reference
        setState({
          events: generateEvents(),
          isLoading: false,
          isEmpty: true,
          error: null,
          lastFetched: Date.now(),
        });
      } else {
        setState({
          events,
          isLoading: false,
          isEmpty: false,
          error: null,
          lastFetched: Date.now(),
        });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      // On error, fall back to mock data so canvas isn't blank
      setState(prev => ({
        events: prev.events.length > 0 ? prev.events : generateEvents(),
        isLoading: false,
        isEmpty: prev.isEmpty,
        error: err instanceof Error ? err.message : 'Unknown error',
        lastFetched: prev.lastFetched,
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    if (activeProject?.id) {
      fetchSignals(activeProject.id);
    }
  }, [activeProject?.id, fetchSignals]);

  // Fetch on mount and when project changes
  useEffect(() => {
    mountedRef.current = true;

    if (!activeProject?.id) {
      // No project selected — show mock data
      setState({
        events: generateEvents(),
        isLoading: false,
        isEmpty: true,
        error: null,
        lastFetched: null,
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    fetchSignals(activeProject.id);

    // Auto-refresh every 30s
    intervalRef.current = setInterval(() => {
      fetchSignals(activeProject.id);
    }, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeProject?.id, fetchSignals]);

  return { ...state, refresh };
}
