'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncOperationState {
  isLoading: boolean;
  status: 'success' | 'error' | null;
  message: string;
}

/**
 * Bundles isLoading, status, message, and auto-clear timeout into a single
 * reusable unit for async operations with user-facing feedback.
 *
 * @param autoClearMs Time in ms before status/message auto-clear (default 8000). Pass 0 to disable.
 *
 * @example
 * const op = useAsyncOperation();
 * await op.execute(
 *   () => generateQuestions(count),
 *   { onSuccess: (r) => `Created ${r.name}` }
 * );
 * // op.isLoading, op.status, op.message available for UI binding
 */
export function useAsyncOperation(autoClearMs = 8000) {
  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    status: null,
    message: '',
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clearStatus = useCallback(() => {
    setState(s => ({ ...s, status: null, message: '' }));
  }, []);

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      /** Return a string to set as success message. Falsy = no success status shown. */
      onSuccess?: (result: T) => string | void;
      /** Fallback error message when error is not an Error instance */
      fallbackError?: string;
    }
  ): Promise<T | undefined> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ isLoading: true, status: null, message: '' });

    try {
      const result = await operation();
      const successMsg = options?.onSuccess?.(result);
      if (successMsg) {
        setState({ isLoading: false, status: 'success', message: successMsg });
      } else {
        setState({ isLoading: false, status: null, message: '' });
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (options?.fallbackError || 'Operation failed');
      setState({ isLoading: false, status: 'error', message: msg });
      return undefined;
    } finally {
      if (autoClearMs > 0) {
        timerRef.current = setTimeout(clearStatus, autoClearMs);
      }
    }
  }, [autoClearMs, clearStatus]);

  return {
    isLoading: state.isLoading,
    status: state.status,
    message: state.message,
    execute,
    clearStatus,
  };
}
