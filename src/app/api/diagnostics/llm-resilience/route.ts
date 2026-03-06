import { NextRequest, NextResponse } from 'next/server';
import { getCircuitBreakerManager } from '@/lib/llm/circuitBreaker';
import { getResilientLLMDiagnostics } from '@/lib/llm/resilient';
import { logger } from '@/lib/logger';

/**
 * GET /api/diagnostics/llm-resilience
 * 
 * Comprehensive diagnostics for the LLM resilience system
 * Shows detailed state of circuit breakers, retry metrics, and health trends
 * 
 * Response includes:
 * - Overall resilience system status
 * - Per-provider circuit breaker state
 * - Success rates and failure patterns
 * - Rate limiting status
 * - Recommendations for operators
 */

interface DiagnosticsResponse {
  timestamp: string;
  systemStatus: 'healthy' | 'degraded' | 'critical';
  summary: {
    healthyProviders: number;
    degradedProviders: number;
    unavailableProviders: number;
  };
  providers: Record<
    string,
    {
      circuitState: 'closed' | 'open' | 'half-open';
      successRate: string;
      recentFailures: number;
      recentSuccesses: number;
      rateLimited: boolean;
      rateLimitExpiry: string | null;
      availability: number; // 0-100 percentage
      recommendations: string[];
    }
  >;
  recommendations: string[];
  debugInfo?: {
    lastStateChange: Record<string, string>;
    failureWindow: number;
    resetTimeout: number;
  };
}

async function handleGet(request: NextRequest): Promise<NextResponse<DiagnosticsResponse>> {
  try {
    const manager = getCircuitBreakerManager();
    const health = manager.getHealthStatus();
    const allMetrics = manager.getAllMetrics();

    // Determine system status
    let systemStatus: 'healthy' | 'degraded' | 'critical';
    if (health.healthy.length > 0 && health.unavailable.length === 0) {
      systemStatus = 'healthy';
    } else if (health.healthy.length > 0 || health.degraded.length > 0) {
      systemStatus = 'degraded';
    } else {
      systemStatus = 'critical';
    }

    // Build per-provider diagnostics
    const providers: Record<string, any> = {};
    for (const [provider, metric] of Object.entries(allMetrics)) {
      const recommendations: string[] = [];

      // Success rate based recommendations
      if (metric.successRate < 50) {
        recommendations.push('Success rate < 50%, provider may be experiencing issues');
      }
      if (metric.successRate < 80 && metric.successRate >= 50) {
        recommendations.push('Success rate 50-80%, monitor closely');
      }

      // Circuit state recommendations
      if (metric.state === 'open') {
        recommendations.push('Circuit is open, requests will fail fast');
      } else if (metric.state === 'half-open') {
        recommendations.push('Circuit in recovery mode, allow some requests to test');
      }

      // Rate limiting recommendations
      if (metric.rateLimited) {
        recommendations.push(
          `Rate limited until ${metric.rateLimitUntil ? new Date(metric.rateLimitUntil).toISOString() : 'unknown'}`
        );
      }

      // Calculate availability percentage for this provider
      const availability = metric.state === 'closed' ? 100 : metric.state === 'half-open' ? 50 : 0;

      providers[provider] = {
        circuitState: metric.state,
        successRate: `${metric.successRate.toFixed(1)}%`,
        recentFailures: metric.failureCount,
        recentSuccesses: metric.successCount,
        rateLimited: metric.rateLimited,
        rateLimitExpiry: metric.rateLimitUntil
          ? new Date(metric.rateLimitUntil).toISOString()
          : null,
        availability,
        recommendations
      };
    }

    // System-wide recommendations
    const systemRecommendations: string[] = [];
    if (systemStatus === 'critical') {
      systemRecommendations.push(
        '🚨 ALL PROVIDERS UNAVAILABLE: Circuit breakers open. Check provider status and diagnostics.'
      );
    } else if (systemStatus === 'degraded') {
      systemRecommendations.push(
        '⚠️ DEGRADED: Some providers are unavailable. Requests will be routed to healthy providers.'
      );
    } else {
      systemRecommendations.push('✅ All providers healthy. System operating normally.');
    }

    if (health.degraded.length > 0) {
      systemRecommendations.push(
        `Degraded providers: ${health.degraded.join(', ')}. Monitor these closely.`
      );
    }

    // Include debug info if requested
    let debugInfo;
    const includeDebug = request.nextUrl.searchParams.get('debug') === 'true';
    if (includeDebug) {
      // Get approximate config values from metrics
      const firstMetric = Object.values(allMetrics)[0];
      debugInfo = {
        lastStateChange: Object.fromEntries(
          Object.entries(allMetrics).map(([provider, m]) => [
            provider,
            new Date(m.stateChangedAt).toISOString()
          ])
        ),
        failureWindow: 60000, // Default value
        resetTimeout: 30000 // Default value
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      systemStatus,
      summary: {
        healthyProviders: health.healthy.length,
        degradedProviders: health.degraded.length,
        unavailableProviders: health.unavailable.length
      },
      providers,
      recommendations: systemRecommendations,
      ...(debugInfo && { debugInfo })
    });
  } catch (error) {
    logger.error('LLM resilience diagnostics failed', { error });
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        systemStatus: 'critical' as const,
        summary: {
          healthyProviders: 0,
          degradedProviders: 0,
          unavailableProviders: 0
        },
        providers: {},
        recommendations: [
          'Failed to retrieve diagnostics. Check server logs.'
        ]
      },
      { status: 500 }
    );
  }
}

export const GET = handleGet;
