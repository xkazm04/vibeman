'use client';

/**
 * CLI Recovery Hook
 *
 * Recovers CLI sessions after browser refresh or navigation.
 * Similar to useStoreRecovery in TaskRunner.
 */

import { useEffect, useRef, useMemo } from 'react';
import { recoverCLISessions, cleanupAllCLISessions } from './cliExecutionManager';
import { useCLISessionStore, type CLISessionId } from './cliSessionStore';

// Unified session lifecycle manager for CLI sessions.
// Provides shared staleness detection and recovery infrastructure.
// Actual recovery logic remains in this hook due to Zustand/SSE coupling.
import { createCLILifecycle } from '@/lib/session-lifecycle';

export const cliLifecycle = createCLILifecycle({
  onRecoveryStart: async (session) => {
    console.log(`[CLI] Recovery starting for session ${session.id}`);
  },
  onRecoveryComplete: async (session, success) => {
    console.log(`[CLI] Recovery ${success ? 'completed' : 'failed'} for session ${session.id}`);
  },
});

const SESSION_IDS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

/**
 * Hook to recover CLI sessions on mount
 * Should be called once at the top-level CLI component
 */
export function useCLIRecovery(): void {
  const hasRecovered = useRef(false);
  const startRecovery = useCLISessionStore((state) => state.startRecovery);
  const endRecovery = useCLISessionStore((state) => state.endRecovery);

  useEffect(() => {
    // Only recover once per mount
    if (hasRecovered.current) return;
    hasRecovered.current = true;

    // Enter recovery phase (10 second window)
    startRecovery(10000);

    // Small delay to ensure store is hydrated
    const timer = setTimeout(() => {
      recoverCLISessions();

      // End recovery phase after recovery completes + buffer
      setTimeout(() => {
        endRecovery();
      }, 5000);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [startRecovery, endRecovery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllCLISessions();
    };
  }, []);
}

/**
 * Hook to get recovery status
 * Uses reactive store subscriptions instead of polling
 */
export function useCLIRecoveryStatus(): {
  isRecovering: boolean;
  sessionsToRecover: number;
} {
  const sessions = useCLISessionStore((state) => state.sessions);
  const recoveryState = useCLISessionStore((state) => state.recoveryState);

  return useMemo(() => {
    // Only count sessions needing recovery during recovery phase
    if (!recoveryState.inProgress && Date.now() > recoveryState.endTime) {
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
      isRecovering: recoveryState.inProgress && count > 0,
      sessionsToRecover: count,
    };
  }, [sessions, recoveryState]);
}
