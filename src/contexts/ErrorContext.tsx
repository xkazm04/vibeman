'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ErrorClassifier, ClassifiedError, RecoveryAction } from '@/lib/errorClassifier';

/**
 * Error handling context for centralized error management
 */

interface ErrorState {
  error: ClassifiedError | null;
  retryCount: number;
  timestamp: number;
}

interface ErrorContextValue {
  // Current error state
  currentError: ClassifiedError | null;

  // Error handling methods
  handleError: (error: unknown, context?: string) => ClassifiedError;
  clearError: () => void;

  // Retry mechanism
  executeWithRetry: <T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    context?: string
  ) => Promise<T>;

  // Error notification (can be extended to toast notifications)
  notifyError: (error: ClassifiedError) => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
  onError?: (error: ClassifiedError, context?: string) => void;
  maxRetries?: number;
}

export function ErrorProvider({
  children,
  onError,
  maxRetries = 3
}: ErrorProviderProps) {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    retryCount: 0,
    timestamp: 0,
  });

  const handleError = useCallback(
    (error: unknown, context?: string): ClassifiedError => {
      const classified = ErrorClassifier.classify(error);

      // Update error state
      setErrorState({
        error: classified,
        retryCount: 0,
        timestamp: Date.now(),
      });

      // Call custom error handler if provided
      if (onError) {
        onError(classified, context);
      }

      return classified;
    },
    [onError]
  );

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      retryCount: 0,
      timestamp: 0,
    });
  }, []);

  const notifyError = useCallback((error: ClassifiedError) => {
    // This can be extended to show toast notifications
    // For now, just update the error state
    setErrorState(prev => ({
      ...prev,
      error,
      timestamp: Date.now(),
    }));
  }, []);

  const calculateBackoffDelay = (baseDelay: number, attempt: number): number => {
    return baseDelay * Math.pow(1.5, attempt - 1);
  };

  const shouldAttemptRetry = (classified: ClassifiedError, attempt: number, maxAttempts: number): boolean => {
    return classified.shouldRetry && attempt < maxAttempts;
  };

  const executeOperationWithRetry = async <T,>(
    operation: () => Promise<T>,
    attempt: number,
    maxAttempts: number,
    context?: string
  ): Promise<T> => {
    try {
      const result = await operation();

      // Clear error on success after retry
      if (attempt > 0) {
        clearError();
      }

      return result;
    } catch (error) {
      const classified = ErrorClassifier.classify(error);

      if (!shouldAttemptRetry(classified, attempt + 1, maxAttempts)) {
        handleError(error, context);
        throw error;
      }

      // Update retry count
      setErrorState(prev => ({
        ...prev,
        retryCount: attempt + 1,
      }));

      // Wait before retrying (with exponential backoff)
      const delay = classified.retryDelay || 1000;
      const backoffDelay = calculateBackoffDelay(delay, attempt + 1);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));

      throw error; // Re-throw to continue retry loop
    }
  };

  const executeWithRetry = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      customMaxRetries?: number,
      context?: string
    ): Promise<T> => {
      const maxAttempts = customMaxRetries ?? maxRetries;
      let lastError: unknown;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          return await executeOperationWithRetry(operation, attempt, maxAttempts, context);
        } catch (error) {
          lastError = error;
          // Continue to next iteration if not last attempt
          if (attempt < maxAttempts - 1) {
            continue;
          }
        }
      }

      // If we've exhausted all retries, throw the last error
      handleError(lastError, context);
      throw lastError;
    },
    [maxRetries, handleError, clearError]
  );

  const value: ErrorContextValue = {
    currentError: errorState.error,
    handleError,
    clearError,
    executeWithRetry,
    notifyError,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * Hook to access error handling context
 */
export function useErrorContext(): ErrorContextValue {
  const context = useContext(ErrorContext);

  if (context === undefined) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }

  return context;
}

/**
 * Optional: Hook for components that may not have ErrorProvider
 */
export function useOptionalErrorContext(): ErrorContextValue | undefined {
  return useContext(ErrorContext);
}
