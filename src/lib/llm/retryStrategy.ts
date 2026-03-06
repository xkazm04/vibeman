/**
 * LLM Provider Retry Strategy
 *
 * Exponential backoff with jitter for retrying failed LLM requests.
 * Complements circuit breaker by handling transient failures gracefully.
 */

import { logger } from '@/lib/logger';

export interface RetryConfig {
  maxAttempts: number; // Maximum number of retry attempts (default: 3)
  initialDelayMs: number; // Initial delay in milliseconds (default: 100ms)
  maxDelayMs: number; // Maximum delay in milliseconds (default: 5000ms)
  backoffMultiplier: number; // Exponential backoff multiplier (default: 2)
  jitterFactor: number; // Jitter factor 0-1 (default: 0.1)
}

export interface RetryableError {
  code: string;
  retryable: boolean;
  delayMs?: number; // For rate limit errors with Retry-After
  message: string;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  jitterFactor: 0.1
};

// ---------------------------------------------------------------------------
// Retryable Error Classification
// ---------------------------------------------------------------------------

/**
 * Classify error as retryable or terminal
 * Retryable: network errors, timeouts, rate limits (429), server errors (5xx)
 * Terminal: auth errors (401), invalid input (400), not found (404)
 */
export function classifyError(error: Error): RetryableError {
  const message = error.message.toLowerCase();
  const code = (error as any)?.code || 'unknown';

  // Network/connection errors
  if (
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('ehostunreach') ||
    message.includes('enotfound') ||
    message.includes('socket hang up')
  ) {
    return { code: 'network_error', retryable: true, message };
  }

  // Request timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return { code: 'timeout', retryable: true, message };
  }

  // Rate limiting (429)
  if (message.includes('rate') || message.includes('429')) {
    return { code: 'rate_limited', retryable: true, message };
  }

  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return { code: 'server_error', retryable: true, message };
  }

  // Auth errors (terminal)
  if (
    message.includes('401') ||
    message.includes('unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('forbidden')
  ) {
    return { code: 'auth_error', retryable: false, message };
  }

  // Bad request (terminal)
  if (message.includes('400') || message.includes('bad request')) {
    return { code: 'bad_request', retryable: false, message };
  }

  // Not found (terminal)
  if (message.includes('404') || message.includes('not found')) {
    return { code: 'not_found', retryable: false, message };
  }

  // Default: assume retryable for transient-like errors
  return { code, retryable: message.length < 200, message };
}

// ---------------------------------------------------------------------------
// Retry Sleep with Jitter
// ---------------------------------------------------------------------------

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
  const exponentialDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelayMs
  );

  // Add jitter (RandomElement ∈ [1 - jitter, 1])
  const jitter = 1 + (Math.random() - 0.5) * 2 * config.jitterFactor;
  return Math.round(exponentialDelay * jitter);
}

/**
 * Sleep for specified milliseconds
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Retry Executor
// ---------------------------------------------------------------------------

/**
 * Execute a function with automatic retry on transient failures
 * 
 * Example:
 * ```typescript
 * const result = await retryAsync(
 *   async () => await generateWithLLM(prompt),
 *   { maxAttempts: 3 }
 * );
 * ```
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalDelayMs
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Classify error and check if we should retry
      const classified = classifyError(lastError);

      if (!classified.retryable || attempt === finalConfig.maxAttempts) {
        // Terminal error or last attempt
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalDelayMs
        };
      }

      // Calculate backoff delay
      const delayMs = classified.delayMs || calculateBackoffDelay(attempt, finalConfig);
      totalDelayMs += delayMs;

      logger.warn('Retryable error, backing off', {
        attempt,
        maxAttempts: finalConfig.maxAttempts,
        delayMs,
        errorCode: classified.code,
        errorMessage: classified.message
      });

      // Sleep before retrying
      await sleep(delayMs);
    }
  }

  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: finalConfig.maxAttempts,
    totalDelayMs
  };
}

/**
 * Execute synchronous function with retry
 */
export function retrySync<T>(
  fn: () => T,
  config: Partial<RetryConfig> = {}
): RetryResult<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const data = fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalDelayMs
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const classified = classifyError(lastError);

      if (!classified.retryable || attempt === finalConfig.maxAttempts) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalDelayMs
        };
      }

      const delayMs = classified.delayMs || calculateBackoffDelay(attempt, finalConfig);
      totalDelayMs += delayMs;

      logger.warn('Retryable error, backing off (sync)', {
        attempt,
        maxAttempts: finalConfig.maxAttempts,
        delayMs,
        errorCode: classified.code
      });

      // Synchronous sleep (blocking) - use sparingly
      const start = Date.now();
      while (Date.now() - start < delayMs) {
        // Spin wait - not ideal but works for sync contexts
      }
    }
  }

  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: finalConfig.maxAttempts,
    totalDelayMs
  };
}

// ---------------------------------------------------------------------------
// Retry Statistics
// ---------------------------------------------------------------------------

export interface RetryStats {
  totalAttempts: number;
  successfulAfterRetry: number;
  immediateSuccess: number;
  failedAfterRetries: number;
  averageAttemptsToSuccess: number;
  averageRetryTime: number;
}

export class RetryMetrics {
  private stats = {
    totalAttempts: 0,
    successfulAfterRetry: 0,
    immediateSuccess: 0,
    failedAfterRetries: 0,
    totalRetryTime: 0
  };

  record(result: RetryResult<unknown>): void {
    this.stats.totalAttempts += result.attempts;

    if (result.success) {
      if (result.attempts === 1) {
        this.stats.immediateSuccess++;
      } else {
        this.stats.successfulAfterRetry++;
      }
    } else {
      this.stats.failedAfterRetries++;
    }

    this.stats.totalRetryTime += result.totalDelayMs;
  }

  getStats(): RetryStats {
    const successfulTotal = this.stats.successfulAfterRetry + this.stats.immediateSuccess;
    return {
      totalAttempts: this.stats.totalAttempts,
      successfulAfterRetry: this.stats.successfulAfterRetry,
      immediateSuccess: this.stats.immediateSuccess,
      failedAfterRetries: this.stats.failedAfterRetries,
      averageAttemptsToSuccess: successfulTotal > 0 ? this.stats.totalAttempts / successfulTotal : 0,
      averageRetryTime: successfulTotal > 0 ? this.stats.totalRetryTime / successfulTotal : 0
    };
  }

  reset(): void {
    this.stats = {
      totalAttempts: 0,
      successfulAfterRetry: 0,
      immediateSuccess: 0,
      failedAfterRetries: 0,
      totalRetryTime: 0
    };
  }
}
