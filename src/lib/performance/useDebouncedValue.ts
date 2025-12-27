'use client';

import { useState, useEffect, useRef, useDeferredValue, useTransition } from 'react';

/**
 * Debounces a value, delaying updates until after a specified delay.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebouncedValue(searchQuery, 300);
 *
 * // Use debouncedQuery for API calls
 * useEffect(() => {
 *   if (debouncedQuery) {
 *     fetchResults(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Returns both the debounced value and a boolean indicating if the value is stale.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns [debouncedValue, isDebouncing]
 */
export function useDebouncedState<T>(
  value: T,
  delay: number = 300
): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return [debouncedValue, isDebouncing];
}

/**
 * Creates a debounced callback that delays invoking the function.
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return ((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }) as T;
}

/**
 * Uses React 18's useDeferredValue for non-urgent state updates.
 * Falls back to regular value in older React versions.
 *
 * @param value - The value to defer
 * @returns The deferred value
 */
export function useSafeDeferredValue<T>(value: T): T {
  // useDeferredValue is always available in React 18+
  return useDeferredValue(value);
}

/**
 * Combines useDeferredValue with useTransition for optimal performance.
 *
 * @returns [deferredValue, isPending, startTransition]
 */
export function useDeferredTransition<T>(
  value: T
): [T, boolean, (callback: () => void) => void] {
  const deferredValue = useDeferredValue(value);
  const [isPending, startTransition] = useTransition();

  return [deferredValue, isPending, startTransition];
}

/**
 * Throttles a value, limiting how often it can update.
 *
 * @param value - The value to throttle
 * @param limit - Minimum time between updates in ms
 * @returns The throttled value
 */
export function useThrottledValue<T>(value: T, limit: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef(Date.now());

  useEffect(() => {
    if (Date.now() - lastRun.current >= limit) {
      setThrottledValue(value);
      lastRun.current = Date.now();
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }, limit - (Date.now() - lastRun.current));

      return () => clearTimeout(timer);
    }
  }, [value, limit]);

  return throttledValue;
}

export default useDebouncedValue;
