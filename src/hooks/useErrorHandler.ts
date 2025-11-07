import { useState, useCallback } from 'react';
import { ErrorClassifier, ClassifiedError } from '@/lib/errorClassifier';
import { useOptionalErrorContext } from '@/contexts/ErrorContext';

/**
 * Hook for handling errors in components with automatic classification
 * and optional integration with ErrorContext
 */
export interface UseErrorHandlerOptions {
  context?: string; // Context name for logging
  onError?: (error: ClassifiedError) => void; // Custom error handler
  autoRetry?: boolean; // Automatically retry transient errors
  maxRetries?: number; // Maximum retry attempts
}

export interface ErrorHandlerState {
  error: ClassifiedError | null;
  isError: boolean;
  retryCount: number;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { context, onError, autoRetry = false, maxRetries = 3 } = options;

  const errorContext = useOptionalErrorContext();

  const [errorState, setErrorState] = useState<ErrorHandlerState>({
    error: null,
    isError: false,
    retryCount: 0,
  });

  /**
   * Handle an error with automatic classification
   */
  const handleError = useCallback(
    (error: unknown): ClassifiedError => {
      const classified = ErrorClassifier.classify(error);

      // Update local state
      setErrorState(prev => ({
        error: classified,
        isError: true,
        retryCount: prev.retryCount,
      }));

      // Use ErrorContext if available
      if (errorContext) {
        errorContext.handleError(error, context);
      }

      // Call custom error handler
      if (onError) {
        onError(classified);
      }

      return classified;
    },
    [context, errorContext, onError]
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      retryCount: 0,
    });

    if (errorContext) {
      errorContext.clearError();
    }
  }, [errorContext]);

  /**
   * Execute an async operation with error handling
   */
  const execute = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      try {
        clearError();
        const result = await operation();
        return result;
      } catch (error) {
        handleError(error);
        return null;
      }
    },
    [handleError, clearError]
  );

  /**
   * Execute an async operation with automatic retry for transient errors
   */
  const executeWithRetry = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      // Use ErrorContext retry if available
      if (errorContext) {
        try {
          return await errorContext.executeWithRetry(operation, maxRetries, context);
        } catch (error) {
          handleError(error);
          return null;
        }
      }

      // Fallback: manual retry logic
      let lastError: unknown;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          clearError();
          const result = await operation();
          return result;
        } catch (error) {
          lastError = error;
          attempt++;

          const classified = ErrorClassifier.classify(error);

          setErrorState(prev => ({
            ...prev,
            retryCount: attempt,
          }));

          if (!classified.shouldRetry || attempt >= maxRetries) {
            handleError(error);
            return null;
          }

          // Wait before retrying
          const delay = classified.retryDelay || 1000;
          const backoffDelay = delay * Math.pow(1.5, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }

      handleError(lastError);
      return null;
    },
    [context, errorContext, maxRetries, handleError, clearError]
  );

  /**
   * Wrap a fetch call with automatic error classification
   */
  const executeFetch = useCallback(
    async (url: string, options?: RequestInit): Promise<any | null> => {
      try {
        clearError();

        const response = await fetch(url, options);

        if (!response.ok) {
          const classified = await ErrorClassifier.fromFetchResponse(response);
          setErrorState({
            error: classified,
            isError: true,
            retryCount: 0,
          });

          if (onError) {
            onError(classified);
          }

          return null;
        }

        return await response.json();
      } catch (error) {
        handleError(error);
        return null;
      }
    },
    [handleError, clearError, onError]
  );

  /**
   * Wrap a fetch call with automatic retry
   */
  const executeFetchWithRetry = useCallback(
    async (url: string, options?: RequestInit): Promise<any | null> => {
      return executeWithRetry(async () => {
        const response = await fetch(url, options);

        if (!response.ok) {
          const classified = await ErrorClassifier.fromFetchResponse(response);
          throw classified.originalError || new Error(classified.message);
        }

        return await response.json();
      });
    },
    [executeWithRetry]
  );

  return {
    // State
    error: errorState.error,
    isError: errorState.isError,
    retryCount: errorState.retryCount,

    // Methods
    handleError,
    clearError,
    execute,
    executeWithRetry,
    executeFetch,
    executeFetchWithRetry,

    // Helpers
    getUserMessage: () => errorState.error?.userMessage || '',
    isTransient: () => errorState.error?.isTransient || false,
    shouldRetry: () => errorState.error?.shouldRetry || false,
    getRecoveryActions: () => errorState.error?.recoveryActions || [],
  };
}

/**
 * Simplified hook for basic error handling without retry logic
 */
export function useSimpleErrorHandler(context?: string) {
  return useErrorHandler({
    context,
    autoRetry: false,
  });
}

/**
 * Hook for error handling with automatic retry
 */
export function useRetryErrorHandler(context?: string, maxRetries = 3) {
  return useErrorHandler({
    context,
    autoRetry: true,
    maxRetries,
  });
}
