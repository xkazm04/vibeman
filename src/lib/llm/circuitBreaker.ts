/**
 * LLM Provider Circuit Breaker
 *
 * Implements the Circuit Breaker pattern for LLM providers to prevent
 * cascade failures and enable graceful degradation:
 * - Tracks provider health via failure rates
 * - Transitions between CLOSED → OPEN → HALF_OPEN states
 * - Enforces backoff and recovery periods
 * - Routes requests to healthy fallback providers
 * - Emits health events for monitoring
 */

import { eventBus } from '@/lib/events/eventBus';
import { ErrorClassifier } from '@/lib/errorClassifier';
import { logger } from '@/lib/logger';
import type { SupportedProvider } from '@/lib/llm/types';
import { DEFAULT_FALLBACK_CHAIN } from '@/lib/llm/llm-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  // Failure threshold before circuit opens
  failureThreshold: number; // number of failures
  failureWindow: number; // time window in ms to count failures (default: 60s)

  // Recovery configuration
  resetTimeout: number; // time in ms before attempting recovery (default: 30s)
  halfOpenRequests: number; // max concurrent requests in half-open state (default: 3)

  // Timeout configuration
  requestTimeout: number; // timeout for individual requests in ms (default: 30s)

  // Rate limiting
  rateLimitRetryAfter: number; // time to wait after 429 error in ms (default: 60s)

  // Provider-specific overrides
  providers?: {
    [key in SupportedProvider]?: Partial<CircuitBreakerConfig>;
  };
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  successRate: number; // 0-100
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  stateChangedAt: number;
  rateLimited: boolean;
  rateLimitUntil: number | null;
}

export interface ProviderHealthEvent {
  provider: SupportedProvider;
  state: CircuitState;
  metrics: CircuitBreakerMetrics;
  message: string;
}

export interface CircuitBreakerError extends Error {
  code: 'circuit_open' | 'timeout' | 'rate_limited' | 'provider_error';
  provider: SupportedProvider;
  retryAfter?: number;
  fallbackProviders?: SupportedProvider[];
}

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open circuit after 5 failures
  failureWindow: 60000, // Within 60 seconds
  resetTimeout: 30000, // Try recovery after 30 seconds
  halfOpenRequests: 3, // Allow 3 requests in half-open state
  requestTimeout: 30000, // 30 second timeout per request
  rateLimitRetryAfter: 60000 // 60 seconds after rate limit
};

// ---------------------------------------------------------------------------
// Provider Circuit Breaker
// ---------------------------------------------------------------------------

export class ProviderCircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private failureTimes: number[] = [];
  private lastFailureAt: number | null = null;
  private lastSuccessAt: number | null = null;
  private stateChangedAt = Date.now();
  private rateLimited = false;
  private rateLimitUntil: number | null = null;
  private halfOpenRequests = 0;
  private config: Required<CircuitBreakerConfig>;

  constructor(
    readonly provider: SupportedProvider,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...(config || {}),
      providers: config?.providers
    } as Required<CircuitBreakerConfig>;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.successCount++;
    this.lastSuccessAt = Date.now();

    if (this.state === 'half-open') {
      // Transition back to closed after successful recovery test
      this.state = 'closed';
      this.stateChangedAt = Date.now();
      this.failureCount = 0;
      this.failureTimes = [];
      this.halfOpenRequests = 0;
      logger.info('Circuit breaker recovered', { provider: this.provider });
      this.emitHealthEvent('Circuit breaker recovered — closed');
    }
  }

  /**
   * Record a failed request.
   *
   * Uses ErrorClassifier to distinguish transient from permanent failures.
   * Only transient errors (network, timeout, rate-limit, server 5xx) count
   * toward the failure threshold that trips the circuit. Permanent errors
   * (auth, validation, not-found) are logged but do not open the breaker.
   */
  recordFailure(errorOrMessage: Error | string): void {
    const now = Date.now();
    const error = errorOrMessage instanceof Error ? errorOrMessage : new Error(String(errorOrMessage));

    // Use the centralized ErrorClassifier to determine transience
    const classified = ErrorClassifier.classify(error);

    this.lastFailureAt = now;

    // Only count transient failures toward the sliding-window threshold
    if (classified.isTransient) {
      this.failureTimes.push(now);

      // Clean up old failures outside the window
      const windowStart = now - this.config.failureWindow;
      this.failureTimes = this.failureTimes.filter(t => t >= windowStart);
      this.failureCount = this.failureTimes.length;

      logger.warn('LLM provider transient failure recorded', {
        provider: this.provider,
        errorType: classified.type,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        error: error?.message || String(errorOrMessage)
      });

      // Check if we should open the circuit
      if (this.failureCount >= this.config.failureThreshold) {
        if (this.state !== 'open') {
          this.openCircuit(true);
          this.emitHealthEvent(`Circuit opened: ${this.failureCount} transient failures in ${this.config.failureWindow / 1000}s`);
        }
      }
    } else {
      logger.info('LLM provider permanent failure (circuit not tripped)', {
        provider: this.provider,
        errorType: classified.type,
        error: error?.message || String(errorOrMessage)
      });
    }
  }

  /**
   * Record rate limit response (429)
   */
  recordRateLimit(retryAfterMs?: number): void {
    this.rateLimited = true;
    this.rateLimitUntil = Date.now() + (retryAfterMs || this.config.rateLimitRetryAfter);

    logger.warn('LLM provider rate limited', {
      provider: this.provider,
      retryAfter: retryAfterMs || this.config.rateLimitRetryAfter
    });

    this.emitHealthEvent(`Rate limited until ${new Date(this.rateLimitUntil)}`);
  }

  /**
   * Check if a request can proceed
   */
  canAttempt(): boolean {
    // Check rate limiting
    if (this.rateLimited && this.rateLimitUntil && Date.now() < this.rateLimitUntil) {
      return false;
    }

    if (this.rateLimited && this.rateLimitUntil && Date.now() >= this.rateLimitUntil) {
      this.rateLimited = false;
      this.rateLimitUntil = null;
    }

    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      // Check if we should transition to half-open
      if (Date.now() - this.stateChangedAt >= this.config.resetTimeout) {
        this.transitionToHalfOpen();
        return true;
      }
      return false;
    }

    if (this.state === 'half-open') {
      // Allow limited requests in half-open
      return this.halfOpenRequests < this.config.halfOpenRequests;
    }

    return false;
  }

  /**
   * Get current circuit state and metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const total = this.failureCount + this.successCount;
    const successRate = total > 0 ? (this.successCount / total) * 100 : 100;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      successRate: Math.round(successRate * 10) / 10,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      stateChangedAt: this.stateChangedAt,
      rateLimited: this.rateLimited,
      rateLimitUntil: this.rateLimitUntil
    };
  }

  /**
   * Get circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.failureTimes = [];
    this.lastFailureAt = null;
    this.lastSuccessAt = null;
    this.stateChangedAt = Date.now();
    this.rateLimited = false;
    this.rateLimitUntil = null;
    this.halfOpenRequests = 0;

    logger.info('Circuit breaker reset', { provider: this.provider });
    this.emitHealthEvent('Circuit breaker manually reset');
  }

  /**
   * Open the circuit and prevent requests
   */
  private openCircuit(isFailure: boolean): void {
    if (this.state === 'open') return;

    this.state = 'open';
    this.stateChangedAt = Date.now();
    this.halfOpenRequests = 0;

    logger.error('Circuit breaker opened', {
      provider: this.provider,
      reason: isFailure ? 'threshold exceeded' : 'recovery',
      failureCount: this.failureCount
    });
  }

  /**
   * Transition to half-open (testing recovery)
   */
  private transitionToHalfOpen(): void {
    if (this.state !== 'open') return;

    this.state = 'half-open';
    this.stateChangedAt = Date.now();
    this.halfOpenRequests = 0;
    this.failureCount = 0; // Reset failure count for recovery test
    this.successCount = 0;
    this.failureTimes = [];

    logger.info('Circuit breaker half-open (testing recovery)', {
      provider: this.provider
    });

    this.emitHealthEvent('Testing provider recovery');
  }

  /**
   * Emit health event for monitoring
   */
  private emitHealthEvent(message: string): void {
    const metrics = this.getMetrics();
    
    eventBus.emit({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      kind: 'system:heartbeat',
      projectId: null,
      message: `[LLM:${this.provider}] State: ${this.state}, SuccessRate: ${(metrics.successRate * 100).toFixed(1)}%, Failures: ${metrics.failureCount} - ${message}`
    });
  }
}

// ---------------------------------------------------------------------------
// Circuit Breaker Manager (Multiple Providers)
// ---------------------------------------------------------------------------

export class CircuitBreakerManager {
  private breakers = new Map<SupportedProvider, ProviderCircuitBreaker>();
  private config: CircuitBreakerConfig;
  private fallbackChain: SupportedProvider[];

  constructor(
    config: Partial<CircuitBreakerConfig> = {},
    fallbackChain: SupportedProvider[] = DEFAULT_FALLBACK_CHAIN
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fallbackChain = fallbackChain;

    // Initialize breakers for all providers in the fallback chain
    for (const provider of fallbackChain) {
      const providerConfig = this.config.providers?.[provider] || {};
      this.breakers.set(provider, new ProviderCircuitBreaker(provider, {
        ...this.config,
        ...providerConfig
      }));
    }
  }

  /**
   * Check if a provider can handle requests
   */
  canHandle(provider: SupportedProvider): boolean {
    const breaker = this.breakers.get(provider);
    if (!breaker) return false;
    return breaker.canAttempt();
  }

  /**
   * Find the next available provider (respecting priority order)
   */
  selectProvider(preferred?: SupportedProvider): SupportedProvider | null {
    // Try preferred provider first if health allows
    if (preferred && this.canHandle(preferred)) {
      return preferred;
    }

    // Fall back to chain order
    for (const provider of this.fallbackChain) {
      if (this.canHandle(provider)) {
        return provider;
      }
    }

    return null;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): SupportedProvider[] {
    return this.fallbackChain.filter(p => this.canHandle(p));
  }

  /**
   * Record success for a provider
   */
  recordSuccess(provider: SupportedProvider): void {
    this.breakers.get(provider)?.recordSuccess();
  }

  /**
   * Record failure for a provider
   */
  recordFailure(provider: SupportedProvider, error: Error): void {
    this.breakers.get(provider)?.recordFailure(error);
  }

  /**
   * Record rate limit
   */
  recordRateLimit(provider: SupportedProvider, retryAfterMs?: number): void {
    this.breakers.get(provider)?.recordRateLimit(retryAfterMs);
  }

  /**
   * Get metrics for all providers
   */
  getAllMetrics(): Record<SupportedProvider, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [provider, breaker] of this.breakers.entries()) {
      metrics[provider] = breaker.getMetrics();
    }
    return metrics as Record<SupportedProvider, CircuitBreakerMetrics>;
  }

  /**
   * Get metrics for a specific provider
   */
  getMetrics(provider: SupportedProvider): CircuitBreakerMetrics | null {
    return this.breakers.get(provider)?.getMetrics() || null;
  }

  /**
   * Get health status for all providers
   */
  getHealthStatus(): {
    healthy: SupportedProvider[];
    degraded: SupportedProvider[];
    unavailable: SupportedProvider[];
  } {
    const healthy: SupportedProvider[] = [];
    const degraded: SupportedProvider[] = [];
    const unavailable: SupportedProvider[] = [];

    for (const [provider, breaker] of this.breakers.entries()) {
      const metrics = breaker.getMetrics();

      if (metrics.state === 'closed' && metrics.successRate >= 90) {
        healthy.push(provider);
      } else if (metrics.state === 'half-open' || metrics.successRate >= 50) {
        degraded.push(provider);
      } else {
        unavailable.push(provider);
      }
    }

    return { healthy, degraded, unavailable };
  }

  /**
   * Get configured fallback chain
   */
  getFallbackChain(): SupportedProvider[] {
    return [...this.fallbackChain];
  }

  /**
   * Reset a provider breaker
   */
  reset(provider: SupportedProvider): void {
    this.breakers.get(provider)?.reset();
  }

  /**
   * Reset all breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

let managerInstance: CircuitBreakerManager | null = null;

/**
 * Get the global circuit breaker manager
 */
export function getCircuitBreakerManager(): CircuitBreakerManager {
  if (!managerInstance) {
    managerInstance = new CircuitBreakerManager();
  }
  return managerInstance;
}

/**
 * Initialize the circuit breaker manager with custom config
 */
export function initializeCircuitBreakerManager(
  config: Partial<CircuitBreakerConfig> = {},
  fallbackChain?: SupportedProvider[]
): CircuitBreakerManager {
  managerInstance = new CircuitBreakerManager(config, fallbackChain);
  return managerInstance;
}
