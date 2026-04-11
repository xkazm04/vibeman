/**
 * Core polling hook and library exports
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { PollingConfig, PollingResult, PollingStats } from './types';

/**
 * Core polling hook that handles automatic data fetching with retry logic,
 * adaptive intervals, and comprehensive state management.
 *
 * @template T - Type of data returned by the fetcher function
 * @param fetcher - Async function that fetches data
 * @param config - Polling configuration options
 * @returns Polling state and control functions
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, stats } = usePollingTask(
 *   async () => fetch('/api/status').then(r => r.json()),
 *   { interval: 5000, maxRetries: 3 }
 * );
 * ```
 */
export function usePollingTask<T>(
  fetcher: () => Promise<T>,
  config: PollingConfig
): PollingResult<T> {
  const {
    interval,
    executeImmediately = true,
    maxRetries = 3,
    retryBackoff = 'exponential',
    retryDelay = 1000,
    enabled = true,
    timeout,
    shouldContinue,
    onError,
    onSuccess,
    adaptive,
  } = config;

  // State management
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentInterval, setCurrentInterval] = useState(interval);
  const [isPolling, setIsPolling] = useState(enabled);
  const [stats, setStats] = useState<PollingStats>({
    totalPolls: 0,
    successfulPolls: 0,
    failedPolls: 0,
    averageLatency: 0,
    lastPollTime: null,
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
  });

  // Refs for managing timers and abort controllers
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latencyAccumulatorRef = useRef<number[]>([]);
  const isExecutingRef = useRef(false);

  // Use refs for values that change frequently to avoid re-creating executePoll
  const retryCountRef = useRef(retryCount);
  retryCountRef.current = retryCount;

  const currentIntervalRef = useRef(currentInterval);
  currentIntervalRef.current = currentInterval;

  // Use refs for callback props to avoid dependency loop
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const shouldContinueRef = useRef(shouldContinue);
  shouldContinueRef.current = shouldContinue;

  const adaptiveRef = useRef(adaptive);
  adaptiveRef.current = adaptive;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  /**
   * Calculate retry delay based on backoff strategy
   */
  const calculateRetryDelay = useCallback((attempt: number): number => {
    if (retryBackoff === 'exponential') {
      return retryDelay * Math.pow(2, attempt);
    }
    return retryDelay * (attempt + 1);
  }, [retryBackoff, retryDelay]);

  /**
   * Adjust interval based on adaptive configuration
   */
  const adjustInterval = useCallback((success: boolean) => {
    const adaptive = adaptiveRef.current;
    if (!adaptive?.enabled) return;

    const {
      minInterval,
      maxInterval,
      successMultiplier = 1.5,
      failureMultiplier = 0.7,
      successThreshold = 3,
      failureThreshold = 2,
    } = adaptive;

    setStats(prev => {
      const consecutiveSuccesses = success ? prev.consecutiveSuccesses + 1 : 0;
      const consecutiveFailures = success ? 0 : prev.consecutiveFailures + 1;

      // Adjust interval based on consecutive results
      if (consecutiveSuccesses >= successThreshold) {
        setCurrentInterval(prev => Math.min(prev * successMultiplier, maxInterval));
      } else if (consecutiveFailures >= failureThreshold) {
        setCurrentInterval(prev => Math.max(prev * failureMultiplier, minInterval));
      }

      return {
        ...prev,
        consecutiveSuccesses,
        consecutiveFailures,
      };
    });
  }, []);

  /**
   * Stop polling (declared before executePoll so it can be referenced)
   */
  const stopRef = useRef<() => void>(undefined);

  const stop = useCallback(() => {
    setIsPolling(false);
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isExecutingRef.current = false;
  }, []);

  stopRef.current = stop;

  /**
   * Execute a single poll operation with timeout and retry logic
   */
  const executePoll = useCallback(async (isRetry = false): Promise<void> => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;

    // Create new abort controller for this poll
    abortControllerRef.current = new AbortController();
    const startTime = Date.now();

    setIsLoading(true);

    try {
      // Apply timeout if configured — race fetcher against a timeout rejection
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let result: T;
      const fetchPromise = fetcherRef.current();

      if (timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            abortControllerRef.current?.abort('timeout');
            reject(new Error('Poll timeout exceeded'));
          }, timeout);
        });
        try {
          result = await Promise.race([fetchPromise, timeoutPromise]);
        } finally {
          if (timeoutId !== undefined) clearTimeout(timeoutId);
        }
      } else {
        result = await fetchPromise;
      }

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        if (abortControllerRef.current.signal.reason === 'timeout') {
          setError(new Error('Poll timeout exceeded'));
          setStats(prev => ({
            ...prev,
            totalPolls: prev.totalPolls + 1,
            failedPolls: prev.failedPolls + 1,
            lastPollTime: Date.now(),
          }));
        }
        return;
      }

      const latency = Date.now() - startTime;
      latencyAccumulatorRef.current.push(latency);
      if (latencyAccumulatorRef.current.length > 100) {
        latencyAccumulatorRef.current.shift();
      }

      // Update state on success
      setData(result);
      setError(null);
      setRetryCount(0);

      // Update statistics
      setStats(prev => {
        const newTotalPolls = prev.totalPolls + 1;
        const newSuccessfulPolls = prev.successfulPolls + 1;
        const newAverageLatency =
          latencyAccumulatorRef.current.reduce((a, b) => a + b, 0) /
          latencyAccumulatorRef.current.length;

        return {
          ...prev,
          totalPolls: newTotalPolls,
          successfulPolls: newSuccessfulPolls,
          averageLatency: newAverageLatency,
          lastPollTime: Date.now(),
        };
      });

      // Call success handler
      if (onSuccessRef.current) {
        onSuccessRef.current(result);
      }

      // Adjust interval for adaptive polling
      adjustInterval(true);

      // Check if polling should continue
      if (shouldContinueRef.current && !shouldContinueRef.current(result)) {
        stopRef.current?.();
        return;
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        if (abortControllerRef.current.signal.reason === 'timeout') {
          setError(new Error('Poll timeout exceeded'));
        }
        return;
      }

      setError(error);

      // Update statistics
      setStats(prev => ({
        ...prev,
        totalPolls: prev.totalPolls + 1,
        failedPolls: prev.failedPolls + 1,
        lastPollTime: Date.now(),
      }));

      // Adjust interval for adaptive polling
      adjustInterval(false);

      // Handle retries
      const currentRetryCount = retryCountRef.current;
      if (!isRetry && currentRetryCount < maxRetries) {
        const nextRetryCount = currentRetryCount + 1;
        setRetryCount(nextRetryCount);

        if (onErrorRef.current) {
          onErrorRef.current(error, nextRetryCount);
        }

        // Schedule retry with backoff
        const delay = calculateRetryDelay(nextRetryCount);
        retryTimerRef.current = setTimeout(() => {
          isExecutingRef.current = false; // Reset so retry can execute
          executePoll(true);
        }, delay);
      } else if (isRetry && currentRetryCount < maxRetries) {
        // Subsequent retry attempts
        const nextRetryCount = currentRetryCount + 1;
        setRetryCount(nextRetryCount);

        if (onErrorRef.current) {
          onErrorRef.current(error, nextRetryCount);
        }

        const delay = calculateRetryDelay(nextRetryCount);
        retryTimerRef.current = setTimeout(() => {
          isExecutingRef.current = false;
          executePoll(true);
        }, delay);
      } else {
        // Max retries reached
        if (onErrorRef.current) {
          onErrorRef.current(error, currentRetryCount);
        }
      }
    } finally {
      setIsLoading(false);
      isExecutingRef.current = false;
    }
  }, [
    timeout,
    maxRetries,
    calculateRetryDelay,
    adjustInterval,
  ]);

  /**
   * Start polling
   */
  const start = useCallback(() => {
    setIsPolling(true);
  }, []);

  /**
   * Manual trigger
   */
  const trigger = useCallback(async () => {
    await executePoll(false);
  }, [executePoll]);

  /**
   * Reset state and restart
   */
  const reset = useCallback(() => {
    stop();
    setData(null);
    setError(null);
    setRetryCount(0);
    setCurrentInterval(interval);
    setStats({
      totalPolls: 0,
      successfulPolls: 0,
      failedPolls: 0,
      averageLatency: 0,
      lastPollTime: null,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
    });
    latencyAccumulatorRef.current = [];
    start();
  }, [stop, start, interval]);

  /**
   * Effect to manage polling lifecycle
   */
  useEffect(() => {
    if (!isPolling) return;

    // Execute immediately if configured
    if (executeImmediately && stats.totalPolls === 0) {
      executePoll(false);
    }

    // Set up polling interval
    const schedulePoll = () => {
      pollTimerRef.current = setTimeout(() => {
        executePoll(false).then(() => {
          if (isPolling) {
            schedulePoll();
          }
        });
      }, currentInterval);
    };

    if (!executeImmediately || stats.totalPolls > 0) {
      schedulePoll();
    }

    // Cleanup on unmount or when polling stops
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      // Note: retryTimerRef is NOT cleared here -- retries are managed
      // inside executePoll and should survive effect re-runs triggered
      // by stats changes. Only the stop() function clears retry timers.
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isPolling, currentInterval, executePoll, executeImmediately, stats.totalPolls]);

  /**
   * Effect to handle enabled prop changes
   */
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
  }, [enabled, start, stop]);

  return {
    data,
    isLoading,
    error,
    retryCount,
    currentInterval,
    isPolling,
    trigger,
    start,
    stop,
    reset,
    stats,
  };
}

// Re-export types
export * from './types';
export * from './factories';
export * from './presets';
