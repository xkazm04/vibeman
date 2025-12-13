import { NextRequest, NextResponse } from 'next/server';
import { analyticsAggregationService } from '@/lib/services/analyticsAggregation';
import { generateExecutiveInsightReport } from '@/app/features/reflector/sub_Reflection/lib/insightGenerator';
import { TimeWindow, ScanTypeStats } from '@/app/features/reflector/sub_Reflection/lib/types';
import { contextDb } from '@/app/db';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { logger } from '@/lib/logger';

/**
 * GET /api/ideas/stats/executive-insights
 * Generate executive insights and narrative reports from reflection analytics
 *
 * Query params:
 * - projectId: Filter by project
 * - contextId: Filter by context
 * - timeWindow: 'all' | 'week' | 'month' | 'quarter' | 'year' (default: 'all')
 * - startDate: Custom start date (overrides timeWindow)
 * - endDate: Custom end date (overrides timeWindow)
 * - enableAI: Enable AI-enhanced insights (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const contextId = searchParams.get('contextId');
    const timeWindow = (searchParams.get('timeWindow') as TimeWindow) || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const enableAI = searchParams.get('enableAI') === 'true';

    // Fetch stats from aggregation service
    let stats;
    const isCustomRange = !!(startDate || endDate);

    if (isCustomRange) {
      stats = analyticsAggregationService.getStatsWithDateRange(
        projectId,
        contextId,
        startDate,
        endDate
      );
    } else {
      stats = analyticsAggregationService.getAggregatedStats({
        projectId,
        contextId,
        timeWindow
      });
    }

    // Get project and context names for context
    let projectName: string | null = null;
    let contextName: string | null = null;

    // Get project name from stats if available
    if (projectId && stats.projects.length > 0) {
      const project = stats.projects.find(p => p.projectId === projectId);
      projectName = project?.name || null;
    }

    if (contextId) {
      try {
        const context = contextDb.getContextById(contextId);
        contextName = context?.name || null;
      } catch {
        // Ignore - name will be null
      }
    }

    // Convert scanTypes to expected format with proper ScanType typing
    const typedScanTypes: ScanTypeStats[] = stats.scanTypes.map(st => ({
      ...st,
      scanType: st.scanType as ScanType
    }));

    // Generate executive insight report
    const report = generateExecutiveInsightReport(
      {
        scanTypes: typedScanTypes,
        overall: stats.overall,
        projects: stats.projects,
        contexts: stats.contexts
      },
      {
        timeWindow: isCustomRange ? 'custom' : timeWindow,
        projectId,
        projectName,
        contextId,
        contextName,
        dateRange: isCustomRange
          ? { start: startDate, end: endDate }
          : undefined,
        config: {
          enableAI
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Failed to generate executive insights:', { error });
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate executive insights'
      },
      { status: 500 }
    );
  }
}
