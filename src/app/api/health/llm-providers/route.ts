import { NextRequest, NextResponse } from 'next/server';
import { getCircuitBreakerManager } from '@/lib/llm/circuitBreaker';
import { logger } from '@/lib/logger';

/**
 * GET /api/health/llm-providers
 * 
 * Returns health status of all LLM providers
 * Useful for monitoring dashboards and automated health checks
 * 
 * Response:
 * {
 *   status: 'healthy' | 'degraded' | 'critical'
 *   timestamp: ISO string
 *   providers: {
 *     healthy: string[]
 *     degraded: string[]
 *     unavailable: string[]
 *   }
 *   metrics: {
 *     [provider]: {
 *       state: 'closed' | 'open' | 'half-open'
 *       successRate: number (0-100)
 *       failureCount: number
 *       successCount: number
 *       rateLimited: boolean
 *       lastFailureAt: ISO string | null
 *     }
 *   }
 * }
 */

interface ProviderMetricsResponse {
  state: string;
  successRate: number;
  failureCount: number;
  successCount: number;
  rateLimited: boolean;
  rateLimitUntil: string | null;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  stateChangedAt: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  fallbackChain: string[];
  providers: {
    healthy: string[];
    degraded: string[];
    unavailable: string[];
  };
  metrics: Record<string, ProviderMetricsResponse>;
}

async function handleGet(request: NextRequest): Promise<NextResponse<HealthResponse>> {
  try {
    const manager = getCircuitBreakerManager();
    const health = manager.getHealthStatus();
    const allMetrics = manager.getAllMetrics();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical';
    if (health.healthy.length > 0 && health.unavailable.length === 0) {
      status = 'healthy';
    } else if (health.healthy.length > 0 || health.degraded.length > 0) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    // Format metrics for response
    const metrics: Record<string, ProviderMetricsResponse> = {};
    for (const [provider, metric] of Object.entries(allMetrics)) {
      metrics[provider] = {
        state: metric.state,
        successRate: metric.successRate,
        failureCount: metric.failureCount,
        successCount: metric.successCount,
        rateLimited: metric.rateLimited,
        rateLimitUntil: metric.rateLimitUntil ? new Date(metric.rateLimitUntil).toISOString() : null,
        lastFailureAt: metric.lastFailureAt ? new Date(metric.lastFailureAt).toISOString() : null,
        lastSuccessAt: metric.lastSuccessAt ? new Date(metric.lastSuccessAt).toISOString() : null,
        stateChangedAt: new Date(metric.stateChangedAt).toISOString()
      };
    }

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      fallbackChain: manager.getFallbackChain(),
      providers: health,
      metrics
    });
  } catch (error) {
    logger.error('LLM health check failed', { error });
    return NextResponse.json(
      {
        status: 'critical',
        timestamp: new Date().toISOString(),
        fallbackChain: [],
        providers: {
          healthy: [],
          degraded: [],
          unavailable: []
        },
        metrics: {}
      },
      { status: 500 }
    );
  }
}

export const GET = handleGet;
