/**
 * useCanvasData
 * Hook that fetches behavioral signals from the API and pushes
 * them into the CanvasStore. React components subscribe to store
 * changes via useSyncExternalStore for declarative re-renders.
 *
 * Uses React Query for data fetching, caching, and polling.
 * Event data lives in the store — polling updates that don't change
 * the signal set skip layout recalculation entirely.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import type { DbBehavioralSignal } from '@/app/db/models/brain.types';
import { mapSignalsToEvents } from './signalMapper';
import { safeResponseJson, parseApiResponse, BrainSignalsResponseSchema } from '@/lib/apiResponseGuard';
import type { CanvasStore } from './canvasStore';
import { brainKeys } from '../../lib/queries/queryKeys';
import { CACHE_PRESETS } from '@/lib/cache/cache-config';
import {
  CANVAS_REFRESH_INTERVAL_MS,
  MAX_CANVAS_SIGNALS,
  CANVAS_WINDOW_DAYS,
} from '@/lib/brain/config';

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
  const projectId = activeProject?.id;

  const query = useQuery({
    queryKey: [...brainKeys.signals(), 'canvas', projectId ?? ''],
    queryFn: async () => {
      const since = new Date(Date.now() - CANVAS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        projectId: projectId!,
        limit: String(MAX_CANVAS_SIGNALS),
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

      return (data.data?.signals || []) as unknown as DbBehavioralSignal[];
    },
    enabled: enabled && !!projectId,
    refetchInterval: enabled && !!projectId ? CANVAS_REFRESH_INTERVAL_MS : false,
    ...CACHE_PRESETS.brainData,
  });

  // Push signals into store when data changes
  useEffect(() => {
    if (query.data) {
      const events = mapSignalsToEvents(query.data, MAX_CANVAS_SIGNALS);
      store.setEvents(events, getFocusedGroupId());
    } else if (!projectId) {
      store.setEvents([], null);
    }
  }, [query.data, store, getFocusedGroupId, projectId]);

  return {
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refresh: () => { query.refetch(); },
  };
}
