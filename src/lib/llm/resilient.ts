/**
 * Resilient LLM Provider Wrapper
 *
 * Provides diagnostics for the resilience system.
 */

import { getCircuitBreakerManager } from '@/lib/llm/circuitBreaker';
import type { SupportedProvider } from '@/lib/llm/types';

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
