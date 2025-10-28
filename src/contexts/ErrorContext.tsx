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

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[ErrorClassifier]${context ? ` [${context}]` : ''} ${ErrorClassifier.formatForLogging(error)}`
        );
        console.error('Original error:', error);
      }

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

  const executeWithRetry = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      customMaxRetries?: number,
      context?: string
    ): Promise<T> => {
      const maxAttempts = customMaxRetries ?? maxRetries;
      let lastError: unknown;
      let attempt = 0;

      while (attempt < maxAttempts) {
        try {
          const result = await operation();

          // Clear error on success
          if (attempt > 0) {
            clearError();
          }

          return result;
        } catch (error) {
          lastError = error;
          attempt++;

          const classified = ErrorClassifier.classify(error);

          // Log retry attempt
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              `[ErrorClassifier]${context ? ` [${context}]` : ''} Retry ${attempt}/${maxAttempts} after error:`,
              classified.userMessage
            );
          }

          // Check if we should retry
          if (!classified.shouldRetry || attempt >= maxAttempts) {
            handleError(error, context);
            throw error;
          }

          // Update retry count
          setErrorState(prev => ({
            ...prev,
            retryCount: attempt,
          }));

          // Wait before retrying (with backoff)
          const delay = classified.retryDelay || 1000;
          const backoffDelay = delay * Math.pow(1.5, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
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
