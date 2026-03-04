/**
 * useConductorStatus — Shared polling hook for conductor pipeline status
 *
 * Fetches once on mount to discover active runs. Then polls every 3s ONLY
 * while a run is active (running/paused). Stops polling when idle to avoid
 * unnecessary network traffic.
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
  const isRunning = useConductorStore((s) => s.isRunning);
  const isPaused = useConductorStore((s) => s.isPaused);
  const currentRun = useConductorStore((s) => s.currentRun);
  const processLog = useConductorStore((s) => s.processLog);

  // Pipeline is active if running, paused, or has a non-terminal run status
  const isActive = isRunning || isPaused || (
    currentRun?.status === 'running' || currentRun?.status === 'paused' || currentRun?.status === 'stopping'
  );

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

  // Fetch once on mount to discover active runs
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || !projectId) return;
    fetchStatus();
    return () => { mountedRef.current = false; };
  }, [enabled, projectId, fetchStatus]);

  // Poll every 3s only while pipeline is active
  useEffect(() => {
    if (!enabled || !projectId || !isActive) {
      // Clear any existing interval when pipeline goes idle
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // Start polling
    pollRef.current = setInterval(fetchStatus, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [enabled, projectId, isActive, fetchStatus]);

  return { currentRun, isRunning, isPaused, processLog, projectId };
}
