/**
 * API Route: Observability Stats
 *
 * GET /api/observability/stats?projectId=xxx&days=7
 * Returns API endpoint statistics and usage data
 */

import { NextRequest, NextResponse } from 'next/server';
import { observabilityDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { ObsStatsResponse } from '@/app/db/models/observability.types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 7;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    // Check if project has data
    const hasData = observabilityDb.hasData(projectId);

    if (!hasData) {
      return NextResponse.json({
        success: true,
        hasData: false,
        message: 'No observability data available. Run onboarding to start collecting data.',
        stats: null
      });
    }

    // Get dashboard stats
    const dashboardStats = observabilityDb.getDashboardStats(projectId, days);

    // Get endpoint summaries
    const endpoints = observabilityDb.getEndpointSummary(projectId, days);

    // Get top endpoints
    const topEndpoints = observabilityDb.getTopEndpoints(projectId, 10, days);

    // Get high error endpoints
    const highErrorEndpoints = observabilityDb.getHighErrorEndpoints(projectId, 5, days);

    // Get usage trends
    const trends = observabilityDb.getUsageTrends(projectId, days);

    // Calculate period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const response: ObsStatsResponse = {
      project_id: projectId,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        total_calls: dashboardStats.total_calls,
        unique_endpoints: dashboardStats.unique_endpoints,
        avg_response_time_ms: dashboardStats.avg_response_time_ms || 0,
        total_errors: dashboardStats.total_errors,
        error_rate: dashboardStats.error_rate
      },
      endpoints,
      trends: trends.map(t => ({
        endpoint: t.endpoint,
        direction: t.direction,
        change_percent: t.change_percent
      }))
    };

    return NextResponse.json({
      success: true,
      hasData: true,
      stats: response,
      topEndpoints,
      highErrorEndpoints
    });

  } catch (error) {
    logger.error('[API] Observability stats GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
