/**
 * Centralized Adapter Error Handling Module
 *
 * Re-exports all error types, handlers, and utilities for scan adapters.
 */

export {
  // Error types
  AdapterError,
  AdapterErrorCategory,
  NetworkError,
  TimeoutError,
  ValidationError,
  ExternalServiceError,
  RateLimitError,
  NotFoundError,
  PermissionError,
  // Type guards and converters
  isAdapterError,
  toAdapterError,
  // Types
  type ErrorSeverity,
  type RecoveryAction,
} from './AdapterErrorTypes';

export {
  // Handler class
  AdapterErrorHandler,
  // Config types
  type RetryConfig,
  type FallbackConfig,
  type ErrorHandlerConfig,
  // Decorators and wrappers
  withErrorHandling,
  createWrappedExecute,
  createAdapterErrorHandler,
  // Utilities
  parseApiError,
  fetchWithErrorHandling,
} from './AdapterErrorHandler';
