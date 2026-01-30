'use client';

/**
 * CLI Recovery Hook
 *
 * Recovers CLI sessions after browser refresh or navigation.
 * Similar to useStoreRecovery in TaskRunner.
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { recoverCLISessions, cleanupAllCLISessions } from './cliExecutionManager';
import { useCLISessionStore, type CLISessionId } from './cliSessionStore';

const SESSION_IDS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

// Module-level state for recovery phase tracking
let isInRecoveryPhase = false;
let recoveryPhaseEndTime = 0;

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

    // Enter recovery phase
    isInRecoveryPhase = true;
    recoveryPhaseEndTime = Date.now() + 10000; // 10 second recovery window

    // Small delay to ensure store is hydrated
    const timer = setTimeout(() => {
      recoverCLISessions();

      // End recovery phase after recovery completes + buffer
      setTimeout(() => {
        isInRecoveryPhase = false;
      }, 5000);
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
 * Only shows "Recovering" during actual recovery phase, not normal operation
 */
export function useCLIRecoveryStatus(): {
  isRecovering: boolean;
  sessionsToRecover: number;
} {
  const sessions = useCLISessionStore((state) => state.sessions);
  const [, forceUpdate] = useState(0);

  // Re-check recovery phase periodically during recovery
  useEffect(() => {
    if (!isInRecoveryPhase && Date.now() < recoveryPhaseEndTime) {
      return;
    }

    // If in recovery phase, set up timer to check when it ends
    if (isInRecoveryPhase) {
      const interval = setInterval(() => {
        if (!isInRecoveryPhase) {
          forceUpdate(n => n + 1);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  return useMemo(() => {
    // Only count sessions needing recovery during recovery phase
    if (!isInRecoveryPhase && Date.now() > recoveryPhaseEndTime) {
      return { isRecovering: false, sessionsToRecover: 0 };
    }

    let count = 0;
    for (const id of SESSION_IDS) {
      const s = sessions[id];
      // During recovery, count sessions with running or pending+autoStart tasks
      const hasRunningTask = s.queue.some((t) => t.status === 'running');
      const hasPendingTasks = s.queue.some((t) => t.status === 'pending');
      if (hasRunningTask || (hasPendingTasks && s.autoStart)) {
        count++;
      }
    }
    return {
      isRecovering: isInRecoveryPhase && count > 0,
      sessionsToRecover: count,
    };
  }, [sessions]);
}
