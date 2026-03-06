'use client';

/**
 * Unified Polling Infrastructure
 *
 * Single adaptive polling primitive that covers all polling use cases:
 * 1. Fixed-interval polling (useSessionCleanup)
 * 2. Activity-aware adaptive polling
 * 3. Task-keyed polling with maxAttempts (TaskRunner pollingManager)
 *
 * Core primitive: createUnifiedPoller()
 * React hook: usePolling()
 * Legacy aliases: createPollingManager(), createActivityAwarePoller()
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Unified Poller Configuration
// ============================================================================

export interface UnifiedPollerConfig {
  /** Interval when activity is detected or default interval (ms) */
  activeIntervalMs: number;
  /** Interval when idle - defaults to activeIntervalMs if not set */
  idleIntervalMs?: number;
  /** Whether to run callback immediately on start (default: true) */
  immediate?: boolean;
  /** Maximum polling attempts before auto-stop (default: Infinity) */
  maxAttempts?: number;
  /** Optional exponential backoff when idle */
  backoff?: {
    levels: number[];
    maxLevel?: number;
  };
  /** Called on each attempt with the attempt number */
  onAttempt?: (attempt: number) => void;
  /** Called when maxAttempts is reached */
  onTimeout?: () => void;
}

export interface UnifiedPollerState {
  currentIntervalMs: number;
  isActive: boolean;
  consecutiveIdlePolls: number;
  attempts: number;
  isRunning: boolean;
}

export interface UnifiedPoller {
  start: () => void;
  stop: () => void;
  /** Signal activity detected (resets to active interval) */
  signalActivity: () => void;
  /** Signal idle state (may trigger backoff) */
  signalIdle: () => void;
  getState: () => UnifiedPollerState;
  setInterval: (ms: number) => void;
}

/**
 * Creates a unified polling manager - the single polling primitive.
 *
 * The pollCallback can return:
 * - void/undefined: treated as fixed-interval (no activity detection)
 * - boolean: true = activity detected (fast poll), false = idle (slow poll)
 * - PollingResult: { done: true/false, success?, error? } for task completion
 *
 * @example Fixed interval (like useSessionCleanup)
 * const poller = createUnifiedPoller(
 *   async () => { await scanForOrphans(); },
 *   { activeIntervalMs: 60000 }
 * );
 *
 * @example Activity-aware adaptive polling
 * const poller = createUnifiedPoller(
 *   async () => {
 *     const sessions = await fetchSessions();
 *     return sessions.some(s => s.status === 'running');
 *   },
 *   { activeIntervalMs: 3000, idleIntervalMs: 30000 }
 * );
 *
 * @example Task polling with maxAttempts
 * const poller = createUnifiedPoller(
 *   async () => {
 *     const status = await getTaskStatus(taskId);
 *     if (status === 'completed') return { done: true, success: true };
 *     if (status === 'failed') return { done: true, success: false, error: 'failed' };
 *     return { done: false };
 *   },
 *   { activeIntervalMs: 10000, maxAttempts: 120 }
 * );
 */
export function createUnifiedPoller(
  pollCallback: () => Promise<boolean | void | PollingResult> | boolean | void | PollingResult,
  config: UnifiedPollerConfig
): UnifiedPoller {
  const idleIntervalMs = config.idleIntervalMs ?? config.activeIntervalMs;
  const immediate = config.immediate ?? true;
  const maxAttempts = config.maxAttempts ?? Infinity;

  let intervalId: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let consecutiveIdlePolls = 0;
  let isActive = false;
  let manualIntervalOverride: number | null = null;
  let attempts = 0;
  let isExecuting = false;

  const getInterval = (): number => {
    if (manualIntervalOverride !== null) return manualIntervalOverride;
    if (isActive) return config.activeIntervalMs;

    if (config.backoff && consecutiveIdlePolls > 0) {
      const maxLevel = config.backoff.maxLevel ?? config.backoff.levels.length;
      const levelIndex = Math.min(consecutiveIdlePolls - 1, maxLevel - 1);
      if (levelIndex >= 0 && levelIndex < config.backoff.levels.length) {
        return config.backoff.levels[levelIndex];
      }
    }

    return idleIntervalMs;
  };

  const stop = () => {
    if (intervalId !== null) {
      clearTimeout(intervalId);
      intervalId = null;
    }
    running = false;
  };

  const processResult = (result: boolean | void | PollingResult): boolean => {
    // void/undefined: no activity tracking, just continue
    if (result === undefined || result === null) return false;

    // boolean: activity detection
    if (typeof result === 'boolean') {
      if (result) {
        isActive = true;
        consecutiveIdlePolls = 0;
      } else {
        isActive = false;
        consecutiveIdlePolls++;
      }
      return false; // not done
    }

    // PollingResult object
    if (typeof result === 'object' && 'done' in result) {
      if (result.done) {
        stop();
        return true; // done, stop polling
      }
      return false;
    }

    return false;
  };

  const executePoll = async (): Promise<boolean> => {
    if (isExecuting) return false;
    isExecuting = true;

    try {
      attempts++;
      config.onAttempt?.(attempts);

      // Check max attempts
      if (Number.isFinite(maxAttempts) && attempts >= maxAttempts) {
        config.onTimeout?.();
        stop();
        return true;
      }

      const result = await pollCallback();
      return processResult(result);
    } catch {
      // On error, continue polling
      return false;
    } finally {
      isExecuting = false;
    }
  };

  const scheduleNext = () => {
    if (!running) return;
    const interval = getInterval();
    intervalId = setTimeout(async () => {
      if (!running) return;
      const done = await executePoll();
      if (!done) scheduleNext();
    }, interval);
  };

  const start = () => {
    if (running) return;
    running = true;
    consecutiveIdlePolls = 0;
    isActive = false;
    manualIntervalOverride = null;
    attempts = 0;
    isExecuting = false;

    if (immediate) {
      (async () => {
        const done = await executePoll();
        if (!done) scheduleNext();
      })();
    } else {
      scheduleNext();
    }
  };

  const signalActivity = () => {
    isActive = true;
    consecutiveIdlePolls = 0;
    manualIntervalOverride = null;
    if (running && intervalId !== null) {
      clearTimeout(intervalId);
      scheduleNext();
    }
  };

  const signalIdle = () => {
    isActive = false;
    consecutiveIdlePolls++;
    manualIntervalOverride = null;
    if (running && intervalId !== null) {
      clearTimeout(intervalId);
      scheduleNext();
    }
  };

  const setIntervalOverride = (ms: number) => {
    manualIntervalOverride = ms;
    if (running && intervalId !== null) {
      clearTimeout(intervalId);
      scheduleNext();
    }
  };

  const getState = (): UnifiedPollerState => ({
    currentIntervalMs: getInterval(),
    isActive,
    consecutiveIdlePolls,
    attempts,
    isRunning: isExecuting,
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

// ============================================================================
// React Hook (delegates to createUnifiedPoller)
// ============================================================================

export interface UsePollingOptions {
  enabled: boolean;
  intervalMs: number;
  immediate?: boolean;
  /** Exponential backoff config — when set, interval grows after each poll */
  backoff?: {
    /** Strategy: 'exponential' doubles each tick, 'linear' adds intervalMs each tick */
    strategy: 'exponential' | 'linear';
    /** Maximum interval in ms (caps growth) */
    maxIntervalMs: number;
  };
  /** Maximum polling attempts before auto-stop (default: Infinity) */
  maxAttempts?: number;
  /** Called when maxAttempts is reached */
  onTimeout?: () => void;
}

export interface UsePollingReturn {
  poll: () => void;
  restart: () => void;
}

/**
 * React hook for polling with automatic cleanup.
 * Internally uses createUnifiedPoller.
 *
 * Supports optional exponential/linear backoff and maxAttempts.
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions
): UsePollingReturn {
  const { enabled, intervalMs, immediate = true, backoff, maxAttempts, onTimeout } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const pollerRef = useRef<UnifiedPoller | null>(null);
  const configKeyRef = useRef<string | null>(null);

  // Stable config key to detect meaningful changes
  const configKey = `${intervalMs}:${backoff?.strategy}:${backoff?.maxIntervalMs}:${maxAttempts}`;

  const clearPoller = useCallback(() => {
    pollerRef.current?.stop();
    pollerRef.current = null;
    configKeyRef.current = null;
  }, []);

  const startPoller = useCallback(
    (runImmediate: boolean) => {
      clearPoller();

      // Build backoff levels if configured
      let backoffConfig: UnifiedPollerConfig['backoff'] | undefined;
      if (backoff) {
        const levels: number[] = [];
        let current = intervalMs;
        const maxMs = backoff.maxIntervalMs;
        // Generate up to 20 levels to cover the range
        for (let i = 0; i < 20; i++) {
          current = backoff.strategy === 'exponential'
            ? intervalMs * Math.pow(2, i)
            : intervalMs * (i + 1);
          if (current >= maxMs) {
            levels.push(maxMs);
            break;
          }
          levels.push(current);
        }
        if (levels.length === 0) levels.push(intervalMs);
        backoffConfig = { levels };
      }

      const poller = createUnifiedPoller(
        () => { callbackRef.current(); },
        {
          activeIntervalMs: intervalMs,
          // When backoff is configured, start idle so backoff kicks in
          idleIntervalMs: backoff ? intervalMs : undefined,
          immediate: runImmediate,
          backoff: backoffConfig,
          maxAttempts,
          onTimeout,
        }
      );
      pollerRef.current = poller;
      configKeyRef.current = configKey;
      poller.start();

      // When using backoff, signal idle immediately to engage backoff curve
      if (backoff) {
        poller.signalIdle();
      }
    },
    [intervalMs, backoff, maxAttempts, onTimeout, clearPoller, configKey]
  );

  useEffect(() => {
    if (!enabled) {
      clearPoller();
      return;
    }

    if (configKeyRef.current === configKey && pollerRef.current !== null) {
      return;
    }

    const isFirstStart = configKeyRef.current === null;
    startPoller(immediate && isFirstStart);

    return clearPoller;
  }, [enabled, configKey, immediate, startPoller, clearPoller]);

  const poll = useCallback(() => {
    callbackRef.current();
  }, []);

  const restart = useCallback(() => {
    startPoller(immediate);
  }, [startPoller, immediate]);

  return { poll, restart };
}

// ============================================================================
// Legacy Aliases (backwards-compatible)
// ============================================================================

/**
 * Non-hook polling manager for Zustand stores.
 * Delegates to createUnifiedPoller.
 */
export function createPollingManager(
  callback: () => void | Promise<void>,
  intervalMs: number
): {
  start: () => void;
  stop: () => void;
  setInterval: (ms: number) => void;
} {
  const poller = createUnifiedPoller(
    () => { callback(); },
    { activeIntervalMs: intervalMs, immediate: true }
  );

  return {
    start: poller.start,
    stop: poller.stop,
    setInterval: poller.setInterval,
  };
}

// Activity-aware poller config and types (kept for backwards compatibility)
export type ActivityAwareConfig = {
  activeIntervalMs: number;
  idleIntervalMs: number;
  backoff?: {
    levels: number[];
    maxLevel?: number;
  };
};

export type ActivityAwarePollerState = {
  currentIntervalMs: number;
  isActive: boolean;
  consecutiveIdlePolls: number;
};

export type ActivityAwarePoller = {
  start: () => void;
  stop: () => void;
  signalActivity: () => void;
  signalIdle: () => void;
  getState: () => ActivityAwarePollerState;
  setInterval: (ms: number) => void;
};

/**
 * Activity-aware poller. Delegates to createUnifiedPoller.
 */
export function createActivityAwarePoller(
  pollCallback: () => Promise<boolean> | boolean,
  config: ActivityAwareConfig
): ActivityAwarePoller {
  const poller = createUnifiedPoller(pollCallback, {
    activeIntervalMs: config.activeIntervalMs,
    idleIntervalMs: config.idleIntervalMs,
    backoff: config.backoff,
    immediate: true,
  });

  return {
    start: poller.start,
    stop: poller.stop,
    signalActivity: poller.signalActivity,
    signalIdle: poller.signalIdle,
    getState: () => {
      const s = poller.getState();
      return {
        currentIntervalMs: s.currentIntervalMs,
        isActive: s.isActive,
        consecutiveIdlePolls: s.consecutiveIdlePolls,
      };
    },
    setInterval: poller.setInterval,
  };
}

// ============================================================================
// Polling Result types (used by pollingManager)
// ============================================================================

export type PollingResult =
  | PollingResultContinue
  | PollingResultSuccess
  | PollingResultFailure;

export interface PollingResultContinue {
  done: false;
}

export interface PollingResultSuccess {
  done: true;
  success: true;
}

export interface PollingResultFailure {
  done: true;
  success: false;
  error: string;
}

export const PollingResults = {
  continue: (): PollingResultContinue => ({ done: false }),
  success: (): PollingResultSuccess => ({ done: true, success: true }),
  failure: (error: string): PollingResultFailure => ({ done: true, success: false, error }),
} as const;

export type PollingCallback = () => Promise<PollingResult>;

export default usePolling;
