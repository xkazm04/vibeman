'use client';
import { useState, useCallback } from 'react';

export interface AIOperationState<T = unknown> {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
}

export interface AIOperationOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Custom hook for handling AI operations with built-in error handling and retry logic.
 * Centralizes error handling patterns across all AI-powered features.
 *
 * @example
 * const { execute, isLoading, error, retry } = useAIOperation({
 *   onSuccess: (data) => console.log('Success:', data),
 *   onError: (error) => console.error('Failed:', error),
 * });
 *
 * await execute(async () => {
 *   return await generateContextDescription({ filePaths, projectPath });
 * });
 */
export function useAIOperation<T = unknown>(options: AIOperationOptions = {}) {
  const [state, setState] = useState<AIOperationState<T>>({
    isLoading: false,
    error: null,
    data: null,
  });

  const [lastOperation, setLastOperation] = useState<(() => Promise<T>) | null>(null);

  const execute = useCallback(
    async (operation: () => Promise<T>): Promise<T | null> => {
      // Store the operation for retry functionality
      setLastOperation(() => operation);

      setState({
        isLoading: true,
        error: null,
        data: null,
      });

      let lastError: Error | null = null;
      const maxAttempts = (options.retryAttempts ?? 0) + 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const result = await operation();

          setState({
            isLoading: false,
            error: null,
            data: result,
          });

          options.onSuccess?.(result);
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          // If this isn't the last attempt, wait before retrying
          if (attempt < maxAttempts - 1 && options.retryDelay) {
            await new Promise((resolve) => setTimeout(resolve, options.retryDelay));
          }
        }
      }

      // All attempts failed
      setState({
        isLoading: false,
        error: lastError,
        data: null,
      });

      if (lastError) {
        options.onError?.(lastError);
      }

      return null;
    },
    [options]
  );

  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastOperation) {
      console.warn('No operation to retry');
      return null;
    }
    return execute(lastOperation);
  }, [lastOperation, execute]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null,
    });
    setLastOperation(null);
  }, []);

  return {
    execute,
    retry,
    reset,
    isLoading: state.isLoading,
    error: state.error,
    data: state.data,
  };
}
