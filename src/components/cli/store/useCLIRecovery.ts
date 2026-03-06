'use client';

/**
 * CLI Recovery Hook
 *
 * Recovers CLI sessions after browser refresh or navigation.
 * Per-session recovery state is tracked via `isRecovering` flag
 * on each CLISessionState (set by recoverCLISessions in cliExecutionManager).
 */

import { useEffect, useRef } from 'react';
import { recoverCLISessions, cleanupAllCLISessions } from './cliExecutionManager';

// Unified session lifecycle manager for CLI sessions.
import { createCLILifecycle } from '@/lib/session-lifecycle';

export const cliLifecycle = createCLILifecycle({
  onRecoveryStart: async (session) => {
    console.log(`[CLI] Recovery starting for session ${session.id}`);
  },
  onRecoveryComplete: async (session, success) => {
    console.log(`[CLI] Recovery ${success ? 'completed' : 'failed'} for session ${session.id}`);
  },
});

/**
 * Hook to recover CLI sessions on mount.
 * Should be called once at the top-level CLI component.
 * Recovery state is tracked per-session via CLISessionState.isRecovering.
 */
export function useCLIRecovery(): void {
  const hasRecovered = useRef(false);

  useEffect(() => {
    // Only recover once per mount
    if (hasRecovered.current) return;
    hasRecovered.current = true;

    // Small delay to ensure store is hydrated from localStorage
    const timer = setTimeout(() => {
      recoverCLISessions();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllCLISessions();
    };
  }, []);
}
