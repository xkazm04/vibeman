/**
 * Resilient LLM Provider Wrapper
 *
 * Integrates circuit breaker and retry logic with existing LLM providers.
 * Provides graceful degradation and automatic fallback to healthy providers.
 */

import { getCircuitBreakerManager } from '@/lib/llm/circuitBreaker';
import { retryAsync, classifyError, RetryConfig } from '@/lib/llm/retryStrategy';
import { logger } from '@/lib/logger';
import type { SupportedProvider, LLMRequest, LLMResponse } from '@/lib/llm/types';

export interface ResilientLLMOptions {
  maxRetries?: number;
  timeout?: number;
  fallbackEnabled?: boolean;
  preferredProvider?: SupportedProvider;
}

export interface ResilientLLMResult {
  success: boolean;
  response?: string;
  provider: SupportedProvider;
  attempts: number;
  retryTime: number;
  cached?: boolean;
  error?: {
    code: string;
    message: string;
    fallback?: boolean;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Resilient LLM Provider
// ---------------------------------------------------------------------------

/**
 * Execute LLM request with circuit breaker and automatic retry
 * 
 * Features:
 * - Automatic retry on transient failures (network, timeout, rate limit)
 * - Circuit breaker prevents cascading failures
 * - Fallback to healthy providers if preferred fails
 * - Comprehensive logging and metrics
 * 
 * Example:
 * ```typescript
 * const result = await executeResilientLLM({
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   model: 'gpt-4',
 *   temperature: 0.7
 * }, {
 *   preferredProvider: 'openai',
 *   maxRetries: 3
 * });
 * ```
 */
export async function executeResilientLLM(
  request: LLMRequest,
  options: ResilientLLMOptions = {}
): Promise<ResilientLLMResult> {
  const {
    maxRetries = 3,
    timeout = 30000,
    fallbackEnabled = true,
    preferredProvider = 'anthropic'
  } = options;

  const manager = getCircuitBreakerManager();
  let selectedProvider = preferredProvider;

  const startTime = Date.now();

  try {
    // Check if preferred provider is available
    if (!manager.canHandle(selectedProvider)) {
      if (fallbackEnabled) {
        const available = manager.selectProvider(selectedProvider);
        if (!available) {
          // No providers available
          return {
            success: false,
            provider: selectedProvider,
            attempts: 0,
            retryTime: 0,
            error: {
              code: 'all_providers_unavailable',
              message: 'All LLM providers are unavailable (circuit breakers open)',
              fallback: false
            }
          };
        }
        selectedProvider = available;
        logger.warn('Preferred provider unavailable, using fallback', {
          preferred: preferredProvider,
          selected: selectedProvider
        });
      } else {
        return {
          success: false,
          provider: selectedProvider,
          attempts: 0,
          retryTime: 0,
          error: {
            code: 'provider_unavailable',
            message: `Provider ${selectedProvider} is unavailable (circuit breaker open)`,
            fallback: false
          }
        };
      }
    }

    // Execute with retry
    const retryResult = await retryAsync(
      async () => {
        return await executeLLMWithProvider(request, selectedProvider, timeout);
      },
      {
        maxAttempts: maxRetries,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2
      }
    );

    if (retryResult.success && retryResult.data) {
      // Record success
      manager.recordSuccess(selectedProvider);

      return {
        success: true,
        response: retryResult.data.response,
        provider: selectedProvider,
        attempts: retryResult.attempts,
        retryTime: retryResult.totalDelayMs,
        usage: retryResult.data.usage
      };
    }

    // Failed after retries - check if we should try fallback
    const error = retryResult.error!;
    const classified = classifyError(error);

    manager.recordFailure(selectedProvider, error);

    // Check for rate limiting
    if (classified.code === 'rate_limited' && classified.delayMs) {
      manager.recordRateLimit(selectedProvider, classified.delayMs);
    }

    if (fallbackEnabled && selectedProvider !== preferredProvider) {
      // Already tried fallback, return error
      return {
        success: false,
        provider: selectedProvider,
        attempts: retryResult.attempts,
        retryTime: retryResult.totalDelayMs,
        error: {
          code: classified.code,
          message: error.message,
          fallback: true
        }
      };
    }

    if (fallbackEnabled && selectedProvider === preferredProvider) {
      // Try fallback provider
      const fallback = manager.selectProvider(selectedProvider);
      if (fallback && fallback !== selectedProvider) {
        logger.info('Trying fallback provider after failures', {
          original: selectedProvider,
          fallback
        });

        // Recursively try with fallback (prevents infinite loop with fallbackEnabled=false)
        return executeResilientLLM(request, {
          ...options,
          preferredProvider: fallback,
          fallbackEnabled: false // Don't try fallback again
        });
      }
    }

    return {
      success: false,
      provider: selectedProvider,
      attempts: retryResult.attempts,
      retryTime: retryResult.totalDelayMs,
      error: {
        code: classified.code,
        message: error.message,
        fallback: false
      }
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logger.error('Unexpected error in resilient LLM execution', {
      provider: selectedProvider,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      provider: selectedProvider,
      attempts: 0,
      retryTime: elapsed,
      error: {
        code: 'unexpected_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        fallback: false
      }
    };
  }
}

/**
 * Low-level LLM execution with timeout enforcement
 */
async function executeLLMWithProvider(
  request: LLMRequest,
  provider: SupportedProvider,
  timeoutMs: number
): Promise<{ response: string; usage?: { prompt_tokens: number; completion_tokens: number } } | never> {
  // Import the actual provider implementation
  const { generateWithLLM } = require('@/lib/llm');

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`LLM request timeout after ${timeoutMs}ms for provider: ${provider}`));
    }, timeoutMs);
  });

  // Race against timeout
  const result = await Promise.race([
    generateWithLLM(request.prompt || '', {
      provider,
      projectId: request.projectId,
      taskType: request.taskType,
      maxTokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.7
    }),
    timeoutPromise
  ]);

  return {
    response: result.response || '',
    usage: result.usage
  };
}

// ---------------------------------------------------------------------------
// Health Check Endpoint
// ---------------------------------------------------------------------------

/**
 * Get current health status of all providers
 */
export function getLLMProvidersHealth() {
  const manager = getCircuitBreakerManager();
  const health = manager.getHealthStatus();
  const metrics = manager.getAllMetrics();

  return {
    timestamp: new Date().toISOString(),
    health,
    metrics,
    summary: {
      healthy: health.healthy.length,
      degraded: health.degraded.length,
      unavailable: health.unavailable.length
    }
  };
}

// ---------------------------------------------------------------------------
// Monitoring & Diagnostics
// ---------------------------------------------------------------------------

/**
 * Get detailed diagnostics for resilience system
 */
export function getResilientLLMDiagnostics() {
  const manager = getCircuitBreakerManager();
  const health = manager.getHealthStatus();
  const metrics = manager.getAllMetrics();

  const diagnostics = {
    timestamp: new Date().toISOString(),
    status: 'ok' as const,
    providers: {} as Record<string, any>
  };

  for (const [provider, metric] of Object.entries(metrics)) {
    diagnostics.providers[provider] = {
      state: metric.state,
      successRate: `${metric.successRate}%`,
      failures: metric.failureCount,
      successes: metric.successCount,
      rateLimited: metric.rateLimited,
      canHandle: manager.canHandle(provider as SupportedProvider),
      lastFailure: metric.lastFailureAt
        ? new Date(metric.lastFailureAt).toISOString()
        : null,
      lastSuccess: metric.lastSuccessAt
        ? new Date(metric.lastSuccessAt).toISOString()
        : null
    };
  }

  return diagnostics;
}
