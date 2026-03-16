/**
 * useConductorStatus — Shared polling hook for conductor pipeline status
 *
 * Fetches once on mount to discover active runs. Then polls every 3s ONLY
 * while any run is active (running/paused). Stops polling when idle to avoid
 * unnecessary network traffic.
 *
 * Now supports multiple concurrent runs via the store's runs map.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useConductorStore } from './conductorStore';

export function useConductorStatus(enabled = true) {
  const activeProject = useClientProjectStore((s) => s.activeProject);
  const projectId = activeProject?.id || null;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const runs = useConductorStore((s) => s.runs);
  const currentRun = useConductorStore((s) => s.currentRun);
  const isRunning = useConductorStore((s) => s.isRunning);
  const isPaused = useConductorStore((s) => s.isPaused);
  const processLog = useConductorStore((s) => s.processLog);

  // Pipeline is active if any run has a non-terminal status
  const hasActiveRuns = Object.values(runs).some(
    (r) => r.status === 'running' || r.status === 'paused' || r.status === 'stopping'
  );

  const fetchStatus = useCallback(async () => {
    if (!projectId || !mountedRef.current) return;
    try {
      const res = await fetch(`/api/conductor/status?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.runs) {
            useConductorStore.getState().setRunsFromServer(data.runs);
          } else if (data.run) {
            useConductorStore.getState().setRunFromServer(data.run);
          }
        }
      }
    } catch {
      // Silent fail on poll errors
    }
  }, [projectId]);

  // Fetch once on mount to discover active runs
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || !projectId) return;
    fetchStatus();
    return () => { mountedRef.current = false; };
  }, [enabled, projectId, fetchStatus]);

  // Poll every 3s only while any pipeline is active
  useEffect(() => {
    if (!enabled || !projectId || !hasActiveRuns) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(fetchStatus, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [enabled, projectId, hasActiveRuns, fetchStatus]);

  return { currentRun, isRunning, isPaused, processLog, projectId };
}
