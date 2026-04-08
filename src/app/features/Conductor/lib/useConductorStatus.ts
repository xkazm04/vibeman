/**
 * useConductorStatus — Shared polling hook for conductor pipeline status
 *
 * Fetches once on mount to discover active runs. Then polls every 3s ONLY
 * while any run is active (running/paused). Stops polling when idle to avoid
 * unnecessary network traffic.
 *
 * Now supports multiple concurrent runs via the store's runs map.
 *
 * Connection-health awareness: tracks lastSuccessfulPollAt and
 * consecutiveFailures to surface staleness/disconnection in the UI.
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useConductorStore } from './conductorStore';

export interface ConnectionHealth {
  lastSuccessfulPollAt: number | null;
  consecutiveFailures: number;
  /** Data older than 15s */
  isStale: boolean;
  /** Data older than 30s or 3+ consecutive failures */
  isDisconnected: boolean;
}

export function useConductorStatus(enabled = true) {
  const activeProject = useClientProjectStore((s) => s.activeProject);
  const projectId = activeProject?.id || null;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Connection health tracking
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    lastSuccessfulPollAt: null,
    consecutiveFailures: 0,
    isStale: false,
    isDisconnected: false,
  });
  const healthRef = useRef(connectionHealth);
  healthRef.current = connectionHealth;

  // Single shallow selector instead of 5 separate subscriptions
  const { runs, currentRun, isRunning, isPaused, processLog } = useConductorStore(
    useShallow((s) => ({
      runs: s.runs,
      currentRun: s.currentRun,
      isRunning: s.isRunning,
      isPaused: s.isPaused,
      processLog: s.processLog,
    })),
  );

  // Pipeline is active if any run has a non-terminal status
  const hasActiveRuns = Object.values(runs).some(
    (r) => r.status === 'running' || r.status === 'paused' || r.status === 'stopping'
  );

  // Staleness timer: re-evaluate health every second while active
  useEffect(() => {
    if (!hasActiveRuns) return;
    const interval = setInterval(() => {
      const h = healthRef.current;
      if (!h.lastSuccessfulPollAt) return;
      const age = Date.now() - h.lastSuccessfulPollAt;
      const isStale = age > 15_000;
      const isDisconnected = age > 30_000 || h.consecutiveFailures >= 3;
      if (isStale !== h.isStale || isDisconnected !== h.isDisconnected) {
        setConnectionHealth((prev) => ({ ...prev, isStale, isDisconnected }));
      }
    }, 1_000);
    return () => clearInterval(interval);
  }, [hasActiveRuns]);

  const fetchStatus = useCallback(async () => {
    if (!projectId || !mountedRef.current) return;

    // Abort any previous in-flight request to prevent stale data overwrites
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/conductor/status?projectId=${projectId}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.runs) {
            useConductorStore.getState().setRunsFromServer(data.runs);
          } else if (data.run) {
            useConductorStore.getState().setRunFromServer(data.run);
          }
        }
        // Mark success
        setConnectionHealth({
          lastSuccessfulPollAt: Date.now(),
          consecutiveFailures: 0,
          isStale: false,
          isDisconnected: false,
        });
      } else {
        // Non-ok response counts as failure
        setConnectionHealth((prev) => {
          const failures = prev.consecutiveFailures + 1;
          return {
            ...prev,
            consecutiveFailures: failures,
            isDisconnected: failures >= 3,
          };
        });
      }
    } catch (err) {
      // Ignore AbortError (expected when we cancel in-flight requests)
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setConnectionHealth((prev) => {
        const failures = prev.consecutiveFailures + 1;
        return {
          ...prev,
          consecutiveFailures: failures,
          isDisconnected: failures >= 3,
        };
      });
    }
  }, [projectId]);

  // On reconnection (consecutiveFailures drops back to 0 from > 0),
  // trigger immediate full-state sync
  const prevFailuresRef = useRef(0);
  useEffect(() => {
    const wasDisconnected = prevFailuresRef.current >= 3;
    prevFailuresRef.current = connectionHealth.consecutiveFailures;
    if (wasDisconnected && connectionHealth.consecutiveFailures === 0) {
      // Immediate full sync on reconnection
      fetchStatus();
    }
  }, [connectionHealth.consecutiveFailures, fetchStatus]);

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

  return { currentRun, isRunning, isPaused, processLog, projectId, connectionHealth };
}
