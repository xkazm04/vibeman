import { NextRequest, NextResponse } from 'next/server';
import { analyticsAggregationService, CacheKey } from '@/lib/services/analyticsAggregation';
import { logger } from '@/lib/logger';

/**
 * GET /api/ideas/stats/aggregated
 * Get pre-computed aggregated statistics with caching and temporal partitioning
 *
 * Query params:
 * - projectId: Filter by project
 * - contextId: Filter by context
 * - timeWindow: 'all' | 'week' | 'month' | 'quarter' | 'year' (default: 'all')
 * - startDate: Custom start date (overrides timeWindow)
 * - endDate: Custom end date (overrides timeWindow)
 * - includeSnapshots: Include weekly snapshots in response (default: false)
 * - nocache: Skip cache and compute fresh stats (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const contextId = searchParams.get('contextId');
    const timeWindow = searchParams.get('timeWindow') as CacheKey['timeWindow'] || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeSnapshots = searchParams.get('includeSnapshots') === 'true';
    const noCache = searchParams.get('nocache') === 'true';

    let stats;

    // Use custom date range if provided
    if (startDate || endDate) {
      stats = analyticsAggregationService.getStatsWithDateRange(
        projectId,
        contextId,
        startDate,
        endDate
      );
    } else {
      // Use standard time window with caching
      if (noCache) {
        analyticsAggregationService.invalidateCache();
      }

      stats = analyticsAggregationService.getAggregatedStats({
        projectId,
        contextId,
        timeWindow
      });
    }

    // Optionally exclude weekly snapshots to reduce response size
    const response = {
      scanTypes: stats.scanTypes,
      overall: stats.overall,
      projects: stats.projects,
      contexts: stats.contexts,
      weeklySnapshots: includeSnapshots
        ? stats.weeklySnapshots.map(snapshot => ({
            weekStart: snapshot.weekStart,
            weekEnd: snapshot.weekEnd,
            scanTypes: snapshot.scanTypes,
            overall: snapshot.overall,
            // Convert Maps to objects for JSON serialization
            projectBreakdown: Object.fromEntries(snapshot.projectBreakdown),
            contextBreakdown: Object.fromEntries(snapshot.contextBreakdown)
          }))
        : undefined,
      meta: {
        lastUpdated: stats.lastUpdated,
        cacheKey: stats.cacheKey,
        timeWindow: startDate || endDate ? 'custom' : timeWindow
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to fetch aggregated stats:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch aggregated stats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ideas/stats/aggregated
 * Administrative operations for the aggregation cache
 *
 * Body:
 * - action: 'invalidate' | 'prewarm' | 'clear' | 'stats'
 * - projectId: Optional project ID for targeted invalidation
 * - contextId: Optional context ID for targeted invalidation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, contextId } = body;

    switch (action) {
      case 'invalidate':
        if (projectId) {
          analyticsAggregationService.invalidateCacheForProject(projectId);
          return NextResponse.json({ success: true, message: `Cache invalidated for project ${projectId}` });
        } else if (contextId) {
          analyticsAggregationService.invalidateCacheForContext(contextId);
          return NextResponse.json({ success: true, message: `Cache invalidated for context ${contextId}` });
        } else {
          analyticsAggregationService.invalidateCache();
          return NextResponse.json({ success: true, message: 'All cache invalidated' });
        }

      case 'prewarm':
        analyticsAggregationService.preWarmCache();
        return NextResponse.json({ success: true, message: 'Cache pre-warmed' });

      case 'clear':
        analyticsAggregationService.clearCache();
        return NextResponse.json({ success: true, message: 'Cache cleared' });

      case 'stats':
        const cacheStats = analyticsAggregationService.getCacheStats();
        return NextResponse.json({ success: true, data: cacheStats });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: invalidate, prewarm, clear, or stats' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Failed to perform cache operation:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform cache operation' },
      { status: 500 }
    );
  }
}
