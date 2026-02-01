'use client';

/**
 * Shared Polling Hook
 *
 * Provides reusable polling infrastructure for session management systems.
 * Used by useSessionCleanup and automationSessionStore for consistent polling behavior.
 */

import { useEffect, useRef, useCallback } from 'react';

export interface UsePollingOptions {
  /** Whether polling is enabled */
  enabled: boolean;
  /** Interval in milliseconds between polls */
  intervalMs: number;
  /** Whether to run immediately on mount/enable */
  immediate?: boolean;
}

export interface UsePollingReturn {
  /** Manually trigger a poll */
  poll: () => void;
  /** Force restart polling with current options */
  restart: () => void;
}

/**
 * Hook for managing polling intervals with automatic cleanup
 *
 * @param callback - Function to call on each poll
 * @param options - Polling configuration
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions
): UsePollingReturn {
  const { enabled, intervalMs, immediate = true } = options;

  // Refs to avoid stale closures
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIntervalMsRef = useRef<number | null>(null);

  const clearPolling = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      currentIntervalMsRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (runImmediate: boolean) => {
      clearPolling();

      if (runImmediate) {
        callbackRef.current();
      }

      intervalIdRef.current = setInterval(() => {
        callbackRef.current();
      }, intervalMs);
      currentIntervalMsRef.current = intervalMs;
    },
    [intervalMs, clearPolling]
  );

  // Manage polling lifecycle
  useEffect(() => {
    if (!enabled) {
      clearPolling();
      return;
    }

    // Only recreate interval if duration changed or not running
    if (currentIntervalMsRef.current === intervalMs && intervalIdRef.current !== null) {
      return;
    }

    // Start with immediate call only if this is the first start
    const isFirstStart = currentIntervalMsRef.current === null;
    startPolling(immediate && isFirstStart);

    return clearPolling;
  }, [enabled, intervalMs, immediate, startPolling, clearPolling]);

  const poll = useCallback(() => {
    callbackRef.current();
  }, []);

  const restart = useCallback(() => {
    startPolling(immediate);
  }, [startPolling, immediate]);

  return { poll, restart };
}

/**
 * Non-hook version for use in Zustand stores
 * Returns cleanup function
 */
export function createPollingManager(
  callback: () => void | Promise<void>,
  intervalMs: number
): {
  start: () => void;
  stop: () => void;
  setInterval: (ms: number) => void;
} {
  let intervalId: ReturnType<typeof setTimeout> | null = null;
  let currentIntervalMs = intervalMs;

  const stop = () => {
    if (intervalId !== null) {
      clearTimeout(intervalId);
      intervalId = null;
    }
  };

  const scheduleNext = () => {
    intervalId = setTimeout(async () => {
      await callback();
      scheduleNext();
    }, currentIntervalMs);
  };

  const start = () => {
    stop();
    callback();
    scheduleNext();
  };

  const setIntervalMs = (ms: number) => {
    currentIntervalMs = ms;
    // If already running, restart with new interval
    if (intervalId !== null) {
      start();
    }
  };

  return { start, stop, setInterval: setIntervalMs };
}

/**
 * Activity-Aware Polling Configuration
 *
 * Defines polling behavior that adapts based on activity level.
 * Two main patterns supported:
 * 1. Binary active/idle (e.g., sessions running vs idle)
 * 2. Exponential backoff (e.g., queue empty for consecutive polls)
 */
export interface ActivityAwareConfig {
  /** Interval when activity is detected (fast polling) */
  activeIntervalMs: number;
  /** Interval when idle (slow polling) */
  idleIntervalMs: number;
  /** Optional: Enable exponential backoff when idle */
  backoff?: {
    /** Backoff levels in ms (e.g., [10000, 30000, 60000]) */
    levels: number[];
    /** Max consecutive idle polls before capping at max level */
    maxLevel?: number;
  };
}

export interface ActivityAwarePollerState {
  /** Current interval in ms */
  currentIntervalMs: number;
  /** Whether currently considered active */
  isActive: boolean;
  /** Consecutive idle polls (for backoff) */
  consecutiveIdlePolls: number;
}

export interface ActivityAwarePoller {
  /** Start polling */
  start: () => void;
  /** Stop polling */
  stop: () => void;
  /** Signal that activity was detected (resets to active interval) */
  signalActivity: () => void;
  /** Signal idle state (may trigger backoff) */
  signalIdle: () => void;
  /** Get current state */
  getState: () => ActivityAwarePollerState;
  /** Manually set interval (overrides activity-based calculation) */
  setInterval: (ms: number) => void;
}

/**
 * Creates an activity-aware polling manager
 *
 * This unifies the polling patterns used across the system:
 * - automationSessionStore: 3s active vs 30s idle based on running sessions
 * - scanQueueWorker: exponential backoff 5s -> 10s -> 30s -> 60s when queue empty
 *
 * The pollCallback should return true if activity was detected (work found),
 * or false if idle (no work). This determines the next polling interval.
 *
 * @example
 * // Binary active/idle polling (like automationSessionStore)
 * const poller = createActivityAwarePoller(
 *   async () => {
 *     const sessions = await fetchSessions();
 *     return sessions.some(s => s.status === 'running');
 *   },
 *   { activeIntervalMs: 3000, idleIntervalMs: 30000 }
 * );
 *
 * @example
 * // With exponential backoff (like scanQueueWorker)
 * const poller = createActivityAwarePoller(
 *   async () => {
 *     const item = await processQueue();
 *     return item !== null; // true = found work, false = queue empty
 *   },
 *   {
 *     activeIntervalMs: 5000,
 *     idleIntervalMs: 10000,
 *     backoff: { levels: [10000, 30000, 60000] }
 *   }
 * );
 */
export function createActivityAwarePoller(
  pollCallback: () => Promise<boolean> | boolean,
  config: ActivityAwareConfig
): ActivityAwarePoller {
  let intervalId: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;
  let consecutiveIdlePolls = 0;
  let isActive = false;
  let manualIntervalOverride: number | null = null;

  const getInterval = (): number => {
    // Manual override takes precedence
    if (manualIntervalOverride !== null) {
      return manualIntervalOverride;
    }

    if (isActive) {
      return config.activeIntervalMs;
    }

    // Apply backoff if configured
    if (config.backoff && consecutiveIdlePolls > 0) {
      const maxLevel = config.backoff.maxLevel ?? config.backoff.levels.length;
      const levelIndex = Math.min(consecutiveIdlePolls - 1, maxLevel - 1);
      if (levelIndex >= 0 && levelIndex < config.backoff.levels.length) {
        return config.backoff.levels[levelIndex];
      }
    }

    return config.idleIntervalMs;
  };

  const stop = () => {
    if (intervalId !== null) {
      clearTimeout(intervalId);
      intervalId = null;
    }
    isRunning = false;
  };

  const scheduleNext = () => {
    if (!isRunning) return;

    const interval = getInterval();
    intervalId = setTimeout(async () => {
      if (!isRunning) return;

      try {
        const wasActive = await pollCallback();

        if (wasActive) {
          isActive = true;
          consecutiveIdlePolls = 0;
        } else {
          isActive = false;
          consecutiveIdlePolls++;
        }
      } catch {
        // On error, don't change activity state
      }

      scheduleNext();
    }, interval);
  };

  const start = () => {
    if (isRunning) return;
    isRunning = true;
    consecutiveIdlePolls = 0;
    isActive = false;
    manualIntervalOverride = null;

    // Run immediately, then schedule
    (async () => {
      try {
        const wasActive = await pollCallback();
        isActive = wasActive;
        if (!wasActive) {
          consecutiveIdlePolls = 1;
        }
      } catch {
        // Ignore initial error
      }
      scheduleNext();
    })();
  };

  const signalActivity = () => {
    isActive = true;
    consecutiveIdlePolls = 0;
    manualIntervalOverride = null;
    // Restart with new interval if running
    if (isRunning && intervalId !== null) {
      clearTimeout(intervalId);
      scheduleNext();
    }
  };

  const signalIdle = () => {
    isActive = false;
    consecutiveIdlePolls++;
    manualIntervalOverride = null;
    // Restart with new interval if running
    if (isRunning && intervalId !== null) {
      clearTimeout(intervalId);
      scheduleNext();
    }
  };

  const setIntervalOverride = (ms: number) => {
    manualIntervalOverride = ms;
    // Restart with new interval if running
    if (isRunning && intervalId !== null) {
      clearTimeout(intervalId);
      scheduleNext();
    }
  };

  const getState = (): ActivityAwarePollerState => ({
    currentIntervalMs: getInterval(),
    isActive,
    consecutiveIdlePolls,
  });

  return {
    start,
    stop,
    signalActivity,
    signalIdle,
    getState,
    setInterval: setIntervalOverride,
  };
}

export default usePolling;
