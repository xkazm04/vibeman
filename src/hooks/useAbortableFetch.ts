import { useEffect, useRef, useCallback } from 'react';

/**
 * useAbortableFetch
 *
 * A custom hook that wraps fetch calls with automatic AbortController management.
 * Automatically cancels in-flight requests when the component unmounts or when
 * a new request is initiated, preventing memory leaks and React warnings.
 *
 * @example
 * const abortableFetch = useAbortableFetch();
 *
 * useEffect(() => {
 *   abortableFetch('/api/data')
 *     .then(res => res.json())
 *     .then(data => setState(data))
 *     .catch(err => {
 *       if (err.name === 'AbortError') return; // Ignore abort errors
 *       console.error(err);
 *     });
 * }, [abortableFetch]);
 */
export function useAbortableFetch() {
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const abortableFetch = useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    // Abort previous request if still in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    // Merge the abort signal with user-provided init options
    return fetch(input, {
      ...init,
      signal: abortControllerRef.current.signal,
    });
  }, []);

  return abortableFetch;
}
