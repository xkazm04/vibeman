/**
 * useConductorStatus — Shared polling hook for conductor pipeline status
 *
 * Always fetches on mount (regardless of isRunning) to discover active runs
 * that may have been running while the component was unmounted. Then polls
 * every 3s while a run is active. Used by both GlobalTaskBar's ConductorProgress
 * and ConductorView.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useConductorStore } from './conductorStore';

export function useConductorStatus(enabled = true) {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const projectId = activeProject?.id || null;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    if (!projectId || !mountedRef.current) return;
    try {
      const res = await fetch(`/api/conductor/status?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.run) {
          useConductorStore.getState().setRunFromServer(data.run);
        }
      }
    } catch {
      // Silent fail on poll errors
    }
  }, [projectId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || !projectId) return;

    // Always fetch once immediately on mount — discovers active runs
    // even when isRunning is false (stale after navigation)
    fetchStatus();

    // Continue polling every 3 seconds
    pollRef.current = setInterval(fetchStatus, 3000);

    return () => {
      mountedRef.current = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [enabled, projectId, fetchStatus]);

  const currentRun = useConductorStore((s) => s.currentRun);
  const isRunning = useConductorStore((s) => s.isRunning);
  const isPaused = useConductorStore((s) => s.isPaused);
  const processLog = useConductorStore((s) => s.processLog);

  return { currentRun, isRunning, isPaused, processLog, projectId };
}
