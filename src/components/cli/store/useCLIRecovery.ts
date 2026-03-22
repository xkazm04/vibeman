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
 *
 * Uses a longer initial delay (500ms) because during self-editing scenarios
 * the Next.js server may be restarting. recoverCLISessions() internally
 * waits for the server with exponential backoff.
 */
export function useCLIRecovery(): void {
  const hasRecovered = useRef(false);

  useEffect(() => {
    // Only recover once per mount
    if (hasRecovered.current) return;
    hasRecovered.current = true;

    // Longer delay to ensure store hydration AND give the server time
    // to stabilize after HMR restarts (self-editing scenario)
    const timer = setTimeout(() => {
      recoverCLISessions();
    }, 500);

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
