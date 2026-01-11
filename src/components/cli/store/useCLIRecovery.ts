/**
 * CLI Recovery Hook
 *
 * Recovers CLI sessions after browser refresh or navigation.
 * Similar to useStoreRecovery in TaskRunner.
 */

import { useEffect, useRef, useMemo } from 'react';
import { recoverCLISessions, cleanupAllCLISessions } from './cliExecutionManager';
import { useCLISessionStore, type CLISessionId } from './cliSessionStore';

const SESSION_IDS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

/**
 * Hook to recover CLI sessions on mount
 * Should be called once at the top-level CLI component
 */
export function useCLIRecovery(): void {
  const hasRecovered = useRef(false);

  useEffect(() => {
    // Only recover once per mount
    if (hasRecovered.current) return;
    hasRecovered.current = true;

    // Small delay to ensure store is hydrated
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

/**
 * Hook to get recovery status
 * Uses stable selector to avoid infinite loops
 */
export function useCLIRecoveryStatus(): {
  isRecovering: boolean;
  sessionsToRecover: number;
} {
  // Use stable selector - just get the sessions object
  const sessions = useCLISessionStore((state) => state.sessions);

  // Compute recovery status with useMemo to avoid creating new objects
  return useMemo(() => {
    let count = 0;
    for (const id of SESSION_IDS) {
      const s = sessions[id];
      const hasRunningTask = s.queue.some((t) => t.status === 'running');
      const hasPendingTasks = s.queue.some((t) => t.status === 'pending');
      if (hasRunningTask || (hasPendingTasks && s.autoStart)) {
        count++;
      }
    }
    return {
      isRecovering: count > 0,
      sessionsToRecover: count,
    };
  }, [sessions]);
}
