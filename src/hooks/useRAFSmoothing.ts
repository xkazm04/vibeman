'use client';

/**
 * RAF-Debounced State Smoothing Primitives
 *
 * Uses requestAnimationFrame to coalesce rapid state updates into frame-aligned renders.
 * Prevents animation jitter during heavy execution by ensuring updates never exceed
 * screen refresh rate (~60fps).
 *
 * Use cases:
 * - Progress bars during active execution
 * - Real-time data visualization
 * - Any high-frequency state that drives animations
 *
 * Pattern extracted from DualBatchPanel's useRAFDebouncedProgress.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook to debounce a numeric value using requestAnimationFrame.
 * Coalesces multiple state updates per frame to reduce animation churn.
 *
 * @example
 * // Progress bar that updates smoothly even with rapid store changes
 * const smoothProgress = useRAFSmoothedValue(rawProgress);
 * return <ProgressBar value={smoothProgress} />;
 */
export function useRAFSmoothedValue(rawValue: number): number {
  const [smoothedValue, setSmoothedValue] = useState(rawValue);
  const rafIdRef = useRef<number | null>(null);
  const latestValueRef = useRef(rawValue);

  // Update the latest value ref on every render
  latestValueRef.current = rawValue;

  const scheduleUpdate = useCallback(() => {
    if (rafIdRef.current !== null) return; // Already scheduled

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      setSmoothedValue(latestValueRef.current);
    });
  }, []);

  useEffect(() => {
    scheduleUpdate();
  }, [rawValue, scheduleUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return smoothedValue;
}

/**
 * Hook to debounce any value using requestAnimationFrame.
 * Generic version that works with any type.
 *
 * @example
 * // Smoothed object state
 * const smoothedData = useRAFSmoothed(rawData);
 */
export function useRAFSmoothed<T>(rawValue: T): T {
  const [smoothedValue, setSmoothedValue] = useState(rawValue);
  const rafIdRef = useRef<number | null>(null);
  const latestValueRef = useRef(rawValue);

  latestValueRef.current = rawValue;

  const scheduleUpdate = useCallback(() => {
    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      setSmoothedValue(latestValueRef.current);
    });
  }, []);

  useEffect(() => {
    scheduleUpdate();
  }, [rawValue, scheduleUpdate]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return smoothedValue;
}

/**
 * Non-hook RAF debouncer for use in callbacks or event handlers.
 * Returns a function that will schedule updates to be called once per frame.
 *
 * @example
 * // In a component
 * const updatePosition = useRAFCallback((x, y) => {
 *   setPosition({ x, y });
 * });
 *
 * // Later, in rapid event handler
 * onMouseMove={(e) => updatePosition(e.clientX, e.clientY)}
 */
export function useRAFCallback<T extends (...args: Parameters<T>) => void>(
  callback: T
): T {
  const rafIdRef = useRef<number | null>(null);
  const latestArgsRef = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    latestArgsRef.current = args;

    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (latestArgsRef.current) {
        callbackRef.current(...latestArgsRef.current);
      }
    });
  }, []) as T;

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Creates a RAF-throttled updater for use outside React components.
 * Useful in Zustand store actions or event listeners.
 *
 * @example
 * // In a store or service
 * const throttledUpdate = createRAFThrottle((value) => {
 *   store.setState({ progress: value });
 * });
 *
 * // Called many times per frame, but only executes once
 * throttledUpdate(newProgress);
 */
export function createRAFThrottle<T extends (...args: Parameters<T>) => void>(
  callback: T
): T & { cancel: () => void } {
  let rafId: number | null = null;
  let latestArgs: Parameters<T> | null = null;

  const throttled = ((...args: Parameters<T>) => {
    latestArgs = args;

    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (latestArgs) {
        callback(...latestArgs);
      }
    });
  }) as T & { cancel: () => void };

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}

// Re-export with legacy name for backwards compatibility
export { useRAFSmoothedValue as useRAFDebouncedProgress };
