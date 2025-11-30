/**
 * Centralized Adapter Error Handler
 *
 * Provides a unified error handling layer for scan adapters with:
 * - Automatic retry logic with exponential backoff
 * - Graceful degradation and fallback behaviors
 * - Consistent error messages and recovery suggestions
 * - Decorator pattern for wrapping adapter methods
 */

import {
  AdapterError,
  AdapterErrorCategory,
  ErrorSeverity,
  NetworkError,
  TimeoutError,
  ExternalServiceError,
  RateLimitError,
  toAdapterError,
  isAdapterError,
} from './AdapterErrorTypes';
import { ScanResult } from '../types';

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay between retries in ms */
  initialDelayMs: number;
  /** Maximum delay between retries in ms */
  maxDelayMs: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Whether to add jitter to delay */
  jitter: boolean;
  /** Error categories that should be retried */
  retryableCategories: AdapterErrorCategory[];
}

/**
 * Fallback configuration for graceful degradation
 */
export interface FallbackConfig<T> {
  /** Whether to use fallback on error */
  enabled: boolean;
  /** Fallback value to return on error */
  fallbackValue?: T;
  /** Function to generate fallback value */
  fallbackFn?: (error: AdapterError) => T | Promise<T>;
  /** Error categories that should trigger fallback */
  fallbackCategories: AdapterErrorCategory[];
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig<T = any> {
  /** Adapter ID for logging context */
  adapterId: string;
  /** Operation name for logging */
  operation?: string;
  /** Retry configuration */
  retry?: Partial<RetryConfig>;
  /** Fallback configuration */
  fallback?: Partial<FallbackConfig<T>>;
  /** Custom error handler callback */
  onError?: (error: AdapterError) => void;
  /** Progress callback for retry attempts */
  onRetry?: (attempt: number, maxRetries: number, error: AdapterError) => void;
  /** Timeout in ms (0 = no timeout) */
  timeoutMs?: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableCategories: [
    AdapterErrorCategory.NETWORK,
    AdapterErrorCategory.TIMEOUT,
    AdapterErrorCategory.EXTERNAL_SERVICE,
    AdapterErrorCategory.RATE_LIMIT,
  ],
};

/**
 * Default fallback configuration
 */
const DEFAULT_FALLBACK_CONFIG: FallbackConfig<any> = {
  enabled: false,
  fallbackCategories: [
    AdapterErrorCategory.NETWORK,
    AdapterErrorCategory.TIMEOUT,
    AdapterErrorCategory.EXTERNAL_SERVICE,
  ],
};

/**
 * Calculate delay for retry with exponential backoff and optional jitter
 */
function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  let delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  delay = Math.min(delay, config.maxDelayMs);

  if (config.jitter) {
    // Add random jitter of ±25%
    const jitterFactor = 0.75 + Math.random() * 0.5;
    delay = Math.floor(delay * jitterFactor);
  }

  return delay;
}

/**
 * Sleep for specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Centralized error handler for adapter operations
 */
export class AdapterErrorHandler {
  private readonly adapterId: string;

  constructor(adapterId: string) {
    this.adapterId = adapterId;
  }

  /**
   * Wrap an async function with error handling, retry logic, and fallback
   */
  async handle<T>(
    fn: () => Promise<T>,
    config: Partial<ErrorHandlerConfig<T>> = {}
  ): Promise<T> {
    const fullConfig = this.mergeConfig(config);
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...fullConfig.retry };
    const fallbackConfig = { ...DEFAULT_FALLBACK_CONFIG, ...fullConfig.fallback };

    let lastError: AdapterError | null = null;
    let attempt = 0;

    while (attempt <= retryConfig.maxRetries) {
      try {
        // Apply timeout if configured
        if (fullConfig.timeoutMs && fullConfig.timeoutMs > 0) {
          return await this.withTimeout(fn(), fullConfig.timeoutMs, fullConfig.operation);
        }
        return await fn();
      } catch (error) {
        lastError = toAdapterError(error, this.adapterId);

        // Log the error
        this.logError(lastError, attempt, retryConfig.maxRetries, fullConfig.operation);

        // Call custom error handler if provided
        if (fullConfig.onError) {
          fullConfig.onError(lastError);
        }

        // Check if we should retry
        const shouldRetry =
          lastError.retryable &&
          retryConfig.retryableCategories.includes(lastError.category) &&
          attempt < retryConfig.maxRetries;

        if (shouldRetry) {
          attempt++;

          // Handle rate limit delay
          const delay =
            lastError instanceof RateLimitError && lastError.retryAfterMs
              ? lastError.retryAfterMs
              : calculateRetryDelay(attempt, retryConfig);

          // Notify about retry
          if (fullConfig.onRetry) {
            fullConfig.onRetry(attempt, retryConfig.maxRetries, lastError);
          }

          this.log(`Retrying in ${delay}ms (attempt ${attempt}/${retryConfig.maxRetries})...`);
          await sleep(delay);
          continue;
        }

        // Check if we should use fallback
        if (
          fallbackConfig.enabled &&
          fallbackConfig.fallbackCategories.includes(lastError.category)
        ) {
          this.log('Using fallback due to error');

          if (fallbackConfig.fallbackFn) {
            return await fallbackConfig.fallbackFn(lastError);
          }

          if (fallbackConfig.fallbackValue !== undefined) {
            return fallbackConfig.fallbackValue;
          }
        }

        // No more retries and no fallback, throw the error
        throw lastError;
      }
    }

    // Should not reach here, but throw last error if we do
    throw lastError ?? new AdapterError({
      message: 'Unexpected error handler state',
      code: 'ADAPTER_INTERNAL_ERROR',
      category: AdapterErrorCategory.INTERNAL,
      adapterId: this.adapterId,
    });
  }

  /**
   * Wrap a function with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation?: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new TimeoutError({
                message: `Operation timed out after ${timeoutMs}ms`,
                timeoutMs,
                operation,
                adapterId: this.adapterId,
              })
            ),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Create a ScanResult from an error
   */
  createErrorResult<T>(error: unknown): ScanResult<T> {
    const adapterError = toAdapterError(error, this.adapterId);

    return {
      success: false,
      error: adapterError.userMessage,
      metadata: {
        errorCode: adapterError.code,
        errorCategory: adapterError.category,
        retryable: adapterError.retryable,
        recoveryActions: adapterError.recoveryActions,
        timestamp: adapterError.timestamp.toISOString(),
      },
    };
  }

  /**
   * Log an error with context
   */
  private logError(
    error: AdapterError,
    attempt: number,
    maxRetries: number,
    operation?: string
  ): void {
    const prefix = operation ? `[${this.adapterId}:${operation}]` : `[${this.adapterId}]`;
    const attemptInfo = attempt > 0 ? ` (attempt ${attempt}/${maxRetries})` : '';
    console.error(`${prefix} ${error.toLogString()}${attemptInfo}`);
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    console.log(`[${this.adapterId}] ${message}`);
  }

  /**
   * Merge provided config with defaults
   */
  private mergeConfig<T>(
    config: Partial<ErrorHandlerConfig<T>>
  ): ErrorHandlerConfig<T> {
    return {
      adapterId: this.adapterId,
      ...config,
    };
  }
}

/**
 * Decorator for adapter methods with automatic error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  adapterId: string,
  config?: Partial<ErrorHandlerConfig<ReturnType<T>>>
) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const handler = new AdapterErrorHandler(adapterId);

    descriptor.value = async function (this: any, ...args: any[]) {
      const self = this;
      return handler.handle(
        () => originalMethod.apply(self, args),
        { operation: propertyKey, ...config }
      );
    } as T;

    return descriptor;
  };
}

/**
 * Higher-order function for wrapping adapter execute methods
 */
export function createWrappedExecute<TContext, TResult>(
  adapterId: string,
  executeFn: (context: TContext) => Promise<ScanResult<TResult>>,
  config?: Partial<ErrorHandlerConfig<ScanResult<TResult>>>
): (context: TContext) => Promise<ScanResult<TResult>> {
  const handler = new AdapterErrorHandler(adapterId);

  return async (context: TContext): Promise<ScanResult<TResult>> => {
    try {
      return await handler.handle(() => executeFn(context), {
        operation: 'execute',
        ...config,
        fallback: {
          enabled: true,
          fallbackFn: (error) => handler.createErrorResult<TResult>(error),
          ...config?.fallback,
        },
      });
    } catch (error) {
      // Should not reach here due to fallback, but handle just in case
      return handler.createErrorResult<TResult>(error);
    }
  };
}

/**
 * Create a standardized error handler for an adapter
 */
export function createAdapterErrorHandler(adapterId: string): AdapterErrorHandler {
  return new AdapterErrorHandler(adapterId);
}

/**
 * Parse API response and convert to appropriate error
 */
export function parseApiError(
  response: Response,
  adapterId?: string,
  serviceName?: string
): AdapterError {
  const status = response.status;

  if (status === 404) {
    return new AdapterError({
      message: `Resource not found (HTTP ${status})`,
      code: 'ADAPTER_NOT_FOUND',
      category: AdapterErrorCategory.NOT_FOUND,
      severity: 'warning',
      retryable: false,
      adapterId,
    });
  }

  if (status === 401 || status === 403) {
    return new AdapterError({
      message: `Permission denied (HTTP ${status})`,
      code: 'ADAPTER_PERMISSION_ERROR',
      category: AdapterErrorCategory.PERMISSION,
      severity: 'error',
      retryable: false,
      adapterId,
    });
  }

  if (status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;

    return new RateLimitError({
      message: 'Rate limit exceeded',
      retryAfterMs,
      serviceName,
      adapterId,
    });
  }

  if (status >= 500) {
    return new ExternalServiceError({
      message: `Server error (HTTP ${status})`,
      serviceName: serviceName ?? 'API',
      statusCode: status,
      adapterId,
    });
  }

  return new ExternalServiceError({
    message: `HTTP ${status}: ${response.statusText}`,
    serviceName: serviceName ?? 'API',
    statusCode: status,
    adapterId,
  });
}

/**
 * Create a fetch wrapper with error handling
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options: RequestInit | undefined,
  adapterId: string,
  serviceName?: string
): Promise<{ success: true; data: T } | { success: false; error: AdapterError }> {
  const handler = new AdapterErrorHandler(adapterId);

  try {
    const response = await handler.handle(
      () => fetch(url, options),
      {
        operation: 'fetch',
        timeoutMs: 60000, // 1 minute timeout
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: parseApiError(response, adapterId, serviceName),
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toAdapterError(error, adapterId),
    };
  }
}
