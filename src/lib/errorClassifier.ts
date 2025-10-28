/**
 * Error Classification and Recovery Strategy System
 *
 * This module provides centralized error classification, categorization,
 * and recovery suggestions for consistent error handling across the application.
 */

// Error type enumeration
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  TIMEOUT = 'TIMEOUT',
  AUTH = 'AUTH',
  SERVER = 'SERVER',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

// Recovery action enumeration
export enum RecoveryAction {
  RETRY = 'RETRY',
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF',
  REFRESH = 'REFRESH',
  LOGIN = 'LOGIN',
  CONTACT_SUPPORT = 'CONTACT_SUPPORT',
  CHECK_INPUT = 'CHECK_INPUT',
  WAIT_AND_RETRY = 'WAIT_AND_RETRY',
  NONE = 'NONE',
}

// Classified error interface
export interface ClassifiedError {
  type: ErrorType;
  message: string;
  userMessage: string;
  recoveryActions: RecoveryAction[];
  isTransient: boolean;
  shouldRetry: boolean;
  retryDelay?: number; // in milliseconds
  originalError: Error | unknown;
  statusCode?: number;
  details?: Record<string, any>;
}

// Error classification patterns
interface ErrorPattern {
  test: (error: any) => boolean;
  type: ErrorType;
  userMessage: (error: any) => string;
  recoveryActions: RecoveryAction[];
  isTransient: boolean;
  retryDelay?: number;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Network errors
  {
    test: (err) =>
      err?.message?.toLowerCase().includes('fetch') ||
      err?.message?.toLowerCase().includes('network') ||
      err?.message?.toLowerCase().includes('connection') ||
      err?.name === 'NetworkError' ||
      err?.code === 'ECONNREFUSED',
    type: ErrorType.NETWORK,
    userMessage: () => 'Network connection failed. Please check your internet connection.',
    recoveryActions: [RecoveryAction.RETRY_WITH_BACKOFF, RecoveryAction.REFRESH],
    isTransient: true,
    retryDelay: 2000,
  },

  // Timeout errors
  {
    test: (err) =>
      err?.message?.toLowerCase().includes('timeout') ||
      err?.message?.toLowerCase().includes('timed out') ||
      err?.name === 'TimeoutError' ||
      err?.code === 'ETIMEDOUT',
    type: ErrorType.TIMEOUT,
    userMessage: () => 'Request timed out. The server took too long to respond.',
    recoveryActions: [RecoveryAction.RETRY_WITH_BACKOFF, RecoveryAction.CONTACT_SUPPORT],
    isTransient: true,
    retryDelay: 3000,
  },

  // Authentication errors (401)
  {
    test: (err) =>
      err?.status === 401 ||
      err?.statusCode === 401 ||
      err?.message?.toLowerCase().includes('unauthorized') ||
      err?.message?.toLowerCase().includes('authentication'),
    type: ErrorType.AUTH,
    userMessage: () => 'Authentication failed. Please log in again.',
    recoveryActions: [RecoveryAction.LOGIN, RecoveryAction.REFRESH],
    isTransient: false,
  },

  // Forbidden errors (403)
  {
    test: (err) =>
      err?.status === 403 ||
      err?.statusCode === 403 ||
      err?.message?.toLowerCase().includes('forbidden'),
    type: ErrorType.AUTH,
    userMessage: () => 'Access denied. You don\'t have permission to perform this action.',
    recoveryActions: [RecoveryAction.CONTACT_SUPPORT],
    isTransient: false,
  },

  // Not Found errors (404)
  {
    test: (err) =>
      err?.status === 404 ||
      err?.statusCode === 404 ||
      err?.message?.toLowerCase().includes('not found'),
    type: ErrorType.NOT_FOUND,
    userMessage: () => 'The requested resource was not found.',
    recoveryActions: [RecoveryAction.REFRESH, RecoveryAction.CONTACT_SUPPORT],
    isTransient: false,
  },

  // Rate limit errors (429)
  {
    test: (err) =>
      err?.status === 429 ||
      err?.statusCode === 429 ||
      err?.message?.toLowerCase().includes('rate limit') ||
      err?.message?.toLowerCase().includes('too many requests'),
    type: ErrorType.RATE_LIMIT,
    userMessage: () => 'Too many requests. Please wait a moment and try again.',
    recoveryActions: [RecoveryAction.WAIT_AND_RETRY],
    isTransient: true,
    retryDelay: 5000,
  },

  // Server errors (500-599)
  {
    test: (err) => {
      const status = err?.status || err?.statusCode;
      return (status >= 500 && status < 600) ||
        err?.message?.toLowerCase().includes('server error') ||
        err?.message?.toLowerCase().includes('internal error');
    },
    type: ErrorType.SERVER,
    userMessage: () => 'Server error occurred. This is a temporary issue.',
    recoveryActions: [RecoveryAction.RETRY_WITH_BACKOFF, RecoveryAction.CONTACT_SUPPORT],
    isTransient: true,
    retryDelay: 3000,
  },

  // Validation errors (400)
  {
    test: (err) =>
      err?.status === 400 ||
      err?.statusCode === 400 ||
      err?.message?.toLowerCase().includes('validation') ||
      err?.message?.toLowerCase().includes('invalid'),
    type: ErrorType.VALIDATION,
    userMessage: (err) => err?.message || 'Input validation failed. Please check your input.',
    recoveryActions: [RecoveryAction.CHECK_INPUT],
    isTransient: false,
  },
];

/**
 * ErrorClassifier class
 * Provides methods to classify errors and determine recovery strategies
 */
export class ErrorClassifier {
  /**
   * Classify an error and return detailed classification information
   */
  static classify(error: unknown): ClassifiedError {
    // Handle null/undefined errors
    if (!error) {
      return {
        type: ErrorType.UNKNOWN,
        message: 'Unknown error occurred',
        userMessage: 'An unexpected error occurred. Please try again.',
        recoveryActions: [RecoveryAction.RETRY, RecoveryAction.CONTACT_SUPPORT],
        isTransient: false,
        shouldRetry: false,
        originalError: error,
      };
    }

    // Convert to Error object if needed
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Extract status code if available
    const statusCode = (error as any)?.status || (error as any)?.statusCode;

    // Try to match against known patterns
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.test(error)) {
        return {
          type: pattern.type,
          message: errorObj.message,
          userMessage: pattern.userMessage(error),
          recoveryActions: pattern.recoveryActions,
          isTransient: pattern.isTransient,
          shouldRetry: pattern.isTransient,
          retryDelay: pattern.retryDelay,
          originalError: error,
          statusCode,
        };
      }
    }

    // Default unknown error classification
    return {
      type: ErrorType.UNKNOWN,
      message: errorObj.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      recoveryActions: [RecoveryAction.RETRY, RecoveryAction.CONTACT_SUPPORT],
      isTransient: false,
      shouldRetry: false,
      originalError: error,
      statusCode,
    };
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    return this.classify(error).userMessage;
  }

  /**
   * Check if error is transient (temporary)
   */
  static isTransient(error: unknown): boolean {
    return this.classify(error).isTransient;
  }

  /**
   * Check if error should be retried
   */
  static shouldRetry(error: unknown): boolean {
    return this.classify(error).shouldRetry;
  }

  /**
   * Get recommended retry delay in milliseconds
   */
  static getRetryDelay(error: unknown): number {
    return this.classify(error).retryDelay || 1000;
  }

  /**
   * Get recovery actions for an error
   */
  static getRecoveryActions(error: unknown): RecoveryAction[] {
    return this.classify(error).recoveryActions;
  }

  /**
   * Format error for logging
   */
  static formatForLogging(error: unknown): string {
    const classified = this.classify(error);
    return `[${classified.type}] ${classified.message}${
      classified.statusCode ? ` (Status: ${classified.statusCode})` : ''
    }`;
  }

  /**
   * Create a fetch error from response
   */
  static async fromFetchResponse(response: Response): Promise<ClassifiedError> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const data = await response.json();
      if (data.error) {
        errorMessage = data.error;
      } else if (data.message) {
        errorMessage = data.message;
      }
    } catch {
      // If JSON parsing fails, use default message
    }

    const error = new Error(errorMessage);
    (error as any).status = response.status;

    return this.classify(error);
  }

  /**
   * Wrap a fetch call with automatic error classification
   */
  static async classifyFetchError(
    fetchPromise: Promise<Response>
  ): Promise<{ data?: any; error?: ClassifiedError }> {
    try {
      const response = await fetchPromise;

      if (!response.ok) {
        const error = await this.fromFetchResponse(response);
        return { error };
      }

      const data = await response.json();
      return { data };
    } catch (err) {
      const error = this.classify(err);
      return { error };
    }
  }
}

/**
 * Utility function to create an error with status code
 */
export function createHttpError(message: string, statusCode: number): Error {
  const error = new Error(message);
  (error as any).status = statusCode;
  return error;
}

/**
 * Utility function to extract error message safely
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
