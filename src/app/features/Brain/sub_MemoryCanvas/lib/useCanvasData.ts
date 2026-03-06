/**
 * useCanvasData
 * Hook that fetches behavioral signals from the API and pushes
 * them into the CanvasStore. React components subscribe to store
 * changes via useSyncExternalStore for declarative re-renders.
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
import { usePolling } from '@/hooks/usePolling';
import { useAbortableFetch } from '@/hooks/useAbortableFetch';

const REFRESH_INTERVAL_MS = 30_000;
const MAX_SIGNALS = 200;
const WINDOW_DAYS = 14;

interface UseCanvasDataOptions {
  store: CanvasStore;
  getFocusedGroupId: () => string | null;
  /** When false, polling and initial fetch are paused. Defaults to true. */
  enabled?: boolean;
}

interface CanvasDataStatus {
  isLoading: boolean;
  error: string | null;
}

export function useCanvasData({ store, getFocusedGroupId, enabled = true }: UseCanvasDataOptions): CanvasDataStatus & { refresh: () => void } {
  const activeProject = useClientProjectStore(s => s.activeProject);
  const [status, setStatus] = useState<CanvasDataStatus>({
    isLoading: true,
    error: null,
  });
  const abortableFetch = useAbortableFetch();

  const fetchSignals = useCallback(async (projectId: string) => {
    try {
      const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        projectId,
        limit: String(MAX_SIGNALS),
        since,
      });

      const res = await abortableFetch(`/api/brain/signals?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }

      const raw = await safeResponseJson(res, '/api/brain/signals');
      const data = parseApiResponse(raw, BrainSignalsResponseSchema, '/api/brain/signals');
      if (!data.success) {
        throw new Error('API returned failure');
      }

      const signals = (data.data?.signals || []) as unknown as DbBehavioralSignal[];
      const events = mapSignalsToEvents(signals, MAX_SIGNALS);

      // Push into store — diff check inside skips layout if unchanged
      store.setEvents(events, getFocusedGroupId());
      setStatus({ isLoading: false, error: null });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setStatus({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [store, getFocusedGroupId, abortableFetch]);

  const refresh = useCallback(() => {
    if (activeProject?.id) {
      fetchSignals(activeProject.id);
    }
  }, [activeProject?.id, fetchSignals]);

  // Initial fetch on mount and when project changes
  useEffect(() => {
    if (!enabled || !activeProject?.id) {
      if (!activeProject?.id) {
        store.setEvents([], null);
      }
      setStatus({ isLoading: false, error: null });
      return;
    }

    setStatus(prev => ({ ...prev, isLoading: true }));
    fetchSignals(activeProject.id);
  }, [activeProject?.id, enabled, fetchSignals, store]);

  // Unified polling with pause/resume support
  usePolling(refresh, {
    enabled: enabled && !!activeProject?.id,
    intervalMs: REFRESH_INTERVAL_MS,
    immediate: false, // Don't run immediately; initial fetch handled above
  });

  return { ...status, refresh };
}
