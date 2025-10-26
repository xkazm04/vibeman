import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Options for configuring the polling behavior
 */
export interface UsePollingTaskOptions {
  /** Interval duration in milliseconds between polls */
  interval: number;
  /** Maximum number of retry attempts on failure (default: 3) */
  maxRetries?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Whether to start polling immediately (default: true) */
  startImmediately?: boolean;
  /** Optional dependencies that trigger polling restart when changed */
  dependencies?: React.DependencyList;
}

/**
 * Result returned by the usePollingTask hook
 */
export interface UsePollingTaskResult<T> {
  /** Current data from the polling function */
  data: T | null;
  /** Loading state - true when actively polling */
  isLoading: boolean;
  /** Error from the last failed poll attempt */
  error: Error | null;
  /** Function to manually cancel polling */
  cancel: () => void;
  /** Function to manually restart polling */
  restart: () => void;
  /** Current retry count */
  retryCount: number;
}

/**
 * Polling function type - receives AbortSignal for cancellation support
 */
export type PollingFunction<T> = (signal: AbortSignal) => Promise<T>;

/**
 * Custom hook for polling with automatic cleanup, retry logic, and abort support
 *
 * Features:
 * - AbortController-based cancellation for clean resource cleanup
 * - Exponential backoff retry logic for handling transient failures
 * - Stale-while-revalidate pattern to prevent UI flicker
 * - Automatic cleanup on unmount and dependency changes
 * - Type-safe with full TypeScript support
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, cancel } = usePollingTask(
 *   async (signal) => {
 *     const response = await fetch('/api/status', { signal });
 *     return response.json();
 *   },
 *   { interval: 2000, maxRetries: 3 }
 * );
 * ```
 */
export function usePollingTask<T>(
  pollingFn: PollingFunction<T>,
  options: UsePollingTaskOptions
): UsePollingTaskResult<T> {
  const {
    interval,
    maxRetries = 3,
    backoffMultiplier = 2,
    startImmediately = true,
    dependencies = [],
  } = options;

  // State management
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(startImmediately);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs for stable references across renders
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(startImmediately);
  const currentIntervalRef = useRef(interval);

  /**
   * Calculate the current interval with exponential backoff
   */
  const calculateInterval = useCallback(() => {
    if (retryCount === 0) return interval;
    return interval * Math.pow(backoffMultiplier, retryCount);
  }, [interval, backoffMultiplier, retryCount]);

  /**
   * Execute a single poll attempt
   */
  const executePoll = useCallback(async () => {
    if (!isActiveRef.current) return;

    // Create new AbortController for this poll
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsLoading(true);
      const result = await pollingFn(abortController.signal);

      // Only update state if not aborted
      if (!abortController.signal.aborted && isActiveRef.current) {
        setData(result);
        setError(null);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (err) {
      // Ignore abort errors - these are intentional cancellations
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // Only update error state if not aborted and still active
      if (!abortController.signal.aborted && isActiveRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Increment retry count if under max retries
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
        }

        // Keep previous data (stale-while-revalidate pattern)
        // Don't clear data on error - continue showing previous data
      }
    } finally {
      if (!abortController.signal.aborted && isActiveRef.current) {
        setIsLoading(false);
      }
    }
  }, [pollingFn, retryCount, maxRetries]);

  /**
   * Schedule the next poll
   */
  const scheduleNextPoll = useCallback(() => {
    if (!isActiveRef.current) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Calculate interval with backoff
    currentIntervalRef.current = calculateInterval();

    // Schedule next poll
    timeoutRef.current = setTimeout(() => {
      executePoll().then(() => {
        scheduleNextPoll();
      });
    }, currentIntervalRef.current);
  }, [calculateInterval, executePoll]);

  /**
   * Cancel polling and cleanup resources
   */
  const cancel = useCallback(() => {
    isActiveRef.current = false;

    // Abort current request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsLoading(false);
  }, []);

  /**
   * Restart polling from scratch
   */
  const restart = useCallback(() => {
    cancel();
    setRetryCount(0);
    setError(null);
    isActiveRef.current = true;
    setIsLoading(true);

    // Execute first poll immediately
    executePoll().then(() => {
      scheduleNextPoll();
    });
  }, [cancel, executePoll, scheduleNextPoll]);

  /**
   * Main effect - manages polling lifecycle
   */
  useEffect(() => {
    if (!startImmediately) {
      isActiveRef.current = false;
      return;
    }

    isActiveRef.current = true;

    // Execute first poll immediately
    executePoll().then(() => {
      scheduleNextPoll();
    });

    // Cleanup on unmount or dependency change
    return () => {
      cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startImmediately, ...dependencies]);

  return {
    data,
    isLoading,
    error,
    cancel,
    restart,
    retryCount,
  };
}

/**
 * Animation pulse rate calculator for visual feedback
 * Returns a CSS animation duration that accelerates with retry count
 *
 * @param retryCount - Current retry count
 * @returns CSS duration string (e.g., "2s", "1s", "0.5s")
 */
export function getPollingPulseAnimation(retryCount: number): string {
  const baseDuration = 2; // 2 seconds for normal polling
  const minDuration = 0.5; // 0.5 seconds at max retry
  const duration = Math.max(minDuration, baseDuration / (retryCount + 1));
  return `${duration}s`;
}
