/**
 * useConductorRecovery — Crash recovery hook for conductor pipeline
 *
 * Follows the useCLIRecovery pattern. Runs once on mount, calls the
 * recovery API to detect orphaned runs (marked 'running' in DB but
 * no active orchestrator loop). Marks them as 'interrupted', then
 * fetches fresh status to sync the client store.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useConductorStore } from './conductorStore';

interface ConductorRecoveryState {
  isRecovering: boolean;
  recoveredRunIds: string[];
  dismissed: boolean;
}

export function useConductorRecovery(projectId: string | null) {
  const hasRecovered = useRef(false);
  const runs = useConductorStore((s) => s.runs);
  const [state, setState] = useState<ConductorRecoveryState>({
    isRecovering: false,
    recoveredRunIds: [],
    dismissed: false,
  });

  // Only recover if there are persisted runs that look like they need recovery
  const hasPersistedActiveRuns = Object.values(runs).some(
    (r) => r.status === 'running' || r.status === 'paused'
  );

  useEffect(() => {
    if (hasRecovered.current || !hasPersistedActiveRuns || !projectId) return;
    hasRecovered.current = true;

    setState((s) => ({ ...s, isRecovering: true }));

    // Delay 200ms for store hydration (same pattern as CLI recovery)
    const timer = setTimeout(async () => {
      try {
        // Mark orphaned runs as interrupted in DB
        const recoveryRes = await fetch('/api/conductor/recovery', { method: 'POST' });
        let recoveredRunIds: string[] = [];
        if (recoveryRes.ok) {
          const data = await recoveryRes.json();
          recoveredRunIds = data.runIds || [];
        }

        // Fetch fresh status to sync store with server state
        const statusRes = await fetch(`/api/conductor/status?projectId=${encodeURIComponent(projectId)}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.success && statusData.runs) {
            useConductorStore.getState().setRunsFromServer(statusData.runs);
          }
        }

        setState({
          isRecovering: false,
          recoveredRunIds,
          dismissed: recoveredRunIds.length === 0,
        });
      } catch {
        setState({ isRecovering: false, recoveredRunIds: [], dismissed: true });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [hasPersistedActiveRuns, projectId]);

  const dismiss = () => setState((s) => ({ ...s, dismissed: true }));

  return { ...state, dismiss };
}
