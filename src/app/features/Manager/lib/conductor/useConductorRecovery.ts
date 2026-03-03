/**
 * useConductorRecovery — Crash recovery hook for conductor pipeline
 *
 * Follows the useCLIRecovery pattern. Runs once on mount, calls the
 * recovery API to detect orphaned runs (marked 'running' in DB but
 * no active orchestrator loop). Marks them as 'interrupted'.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface ConductorRecoveryState {
  isRecovering: boolean;
  recoveredRunIds: string[];
  dismissed: boolean;
}

export function useConductorRecovery() {
  const hasRecovered = useRef(false);
  const [state, setState] = useState<ConductorRecoveryState>({
    isRecovering: false,
    recoveredRunIds: [],
    dismissed: false,
  });

  useEffect(() => {
    if (hasRecovered.current) return;
    hasRecovered.current = true;

    setState((s) => ({ ...s, isRecovering: true }));

    // Delay 200ms for store hydration (same pattern as CLI recovery)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/conductor/recovery', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.runIds?.length > 0) {
            setState({
              isRecovering: false,
              recoveredRunIds: data.runIds,
              dismissed: false,
            });
          } else {
            setState({ isRecovering: false, recoveredRunIds: [], dismissed: true });
          }
        } else {
          setState({ isRecovering: false, recoveredRunIds: [], dismissed: true });
        }
      } catch {
        setState({ isRecovering: false, recoveredRunIds: [], dismissed: true });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => setState((s) => ({ ...s, dismissed: true }));

  return { ...state, dismiss };
}
