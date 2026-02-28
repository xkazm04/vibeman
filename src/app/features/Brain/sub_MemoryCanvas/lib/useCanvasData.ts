/**
 * useCanvasData
 * Hook that fetches real behavioral signals from the API and pushes
 * them into the CanvasStore for imperative rendering.
 *
 * Only `isLoading` and `error` are React state (for UI indicators).
 * Event data lives in the store — polling updates that don't change
 * the signal set skip layout recalculation entirely.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import type { BrainEvent } from './types';
import type { DbBehavioralSignal } from '@/app/db/models/brain.types';
import { mapSignalsToEvents } from './signalMapper';
import { safeResponseJson, parseApiResponse, BrainSignalsResponseSchema } from '@/lib/apiResponseGuard';
import type { CanvasStore } from './canvasStore';

const REFRESH_INTERVAL_MS = 30_000;
const MAX_SIGNALS = 200;
const WINDOW_DAYS = 14;

interface UseCanvasDataOptions {
  store: CanvasStore;
  getFocusedGroupId: () => string | null;
}

interface CanvasDataStatus {
  isLoading: boolean;
  error: string | null;
}

export function useCanvasData({ store, getFocusedGroupId }: UseCanvasDataOptions): CanvasDataStatus & { refresh: () => void } {
  const activeProject = useClientProjectStore(s => s.activeProject);
  const [status, setStatus] = useState<CanvasDataStatus>({
    isLoading: true,
    error: null,
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

      const raw = await safeResponseJson(res, '/api/brain/signals');
      const data = parseApiResponse(raw, BrainSignalsResponseSchema, '/api/brain/signals');
      if (!data.success) {
        throw new Error('API returned failure');
      }

      const signals = data.signals as unknown as DbBehavioralSignal[];
      const events = mapSignalsToEvents(signals, MAX_SIGNALS);

      if (!mountedRef.current) return;

      // Push into store — diff check inside skips layout if unchanged
      store.setEvents(events, getFocusedGroupId());
      setStatus({ isLoading: false, error: null });
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [store, getFocusedGroupId]);

  const refresh = useCallback(() => {
    if (activeProject?.id) {
      fetchSignals(activeProject.id);
    }
  }, [activeProject?.id, fetchSignals]);

  // Fetch on mount and when project changes
  useEffect(() => {
    mountedRef.current = true;

    if (!activeProject?.id) {
      store.setEvents([], null);
      setStatus({ isLoading: false, error: null });
      return;
    }

    setStatus(prev => ({ ...prev, isLoading: true }));
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
  }, [activeProject?.id, fetchSignals, store]);

  return { ...status, refresh };
}
