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
        const newInterval = Math.min(currentInterval * successMultiplier, maxInterval);
        setCurrentInterval(newInterval);
      } else if (consecutiveFailures >= failureThreshold) {
        const newInterval = Math.max(currentInterval * failureMultiplier, minInterval);
        setCurrentInterval(newInterval);
      }

      return {
        ...prev,
        consecutiveSuccesses,
        consecutiveFailures,
      };
    });
  }, [adaptive, currentInterval]);

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
      // Apply timeout if configured
      let result: T;
      if (timeout) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Poll timeout')), timeout)
        );
        result = await Promise.race([
          fetcher(),
          timeoutPromise,
        ]);
      } else {
        result = await fetcher();
      }

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
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
      if (onSuccess) {
        onSuccess(result);
      }

      // Adjust interval for adaptive polling
      adjustInterval(true);

      // Check if polling should continue
      if (shouldContinue && !shouldContinue(result)) {
        stop();
        return;
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
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
      if (!isRetry && retryCount < maxRetries) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);

        if (onError) {
          onError(error, nextRetryCount);
        }

        // Schedule retry with backoff
        const delay = calculateRetryDelay(nextRetryCount);
        retryTimerRef.current = setTimeout(() => {
          executePoll(true);
        }, delay);
      } else {
        // Max retries reached
        if (onError) {
          onError(error, retryCount);
        }
      }
    } finally {
      setIsLoading(false);
      isExecutingRef.current = false;
    }
  }, [
    fetcher,
    timeout,
    retryCount,
    maxRetries,
    calculateRetryDelay,
    onError,
    onSuccess,
    shouldContinue,
    adjustInterval,
  ]);

  /**
   * Start polling
   */
  const start = useCallback(() => {
    setIsPolling(true);
  }, []);

  /**
   * Stop polling
   */
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
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
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
