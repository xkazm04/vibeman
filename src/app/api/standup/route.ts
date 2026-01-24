import { NextRequest, NextResponse } from 'next/server';
import { standupDb } from '@/app/db';
import { StandupSummaryResponse, StandupBlocker, StandupHighlight, StandupFocusArea } from '@/app/db/models/standup.types';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/standup
 * Fetch standup summary by project and period
 *
 * Query params:
 * - projectId: string (required)
 * - periodType: 'daily' | 'weekly' (required)
 * - periodStart: string YYYY-MM-DD (required)
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const periodType = searchParams.get('periodType') as 'daily' | 'weekly' | null;
    const periodStart = searchParams.get('periodStart');

    if (!projectId || !periodType || !periodStart) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          required: ['projectId', 'periodType', 'periodStart'],
        },
        { status: 400 }
      );
    }

    if (periodType !== 'daily' && periodType !== 'weekly') {
      return NextResponse.json(
        {
          success: false,
          error: 'periodType must be "daily" or "weekly"',
        },
        { status: 400 }
      );
    }

    // Find summary for the period
    const dbSummary = standupDb.getSummaryByPeriod(projectId, periodType, periodStart);

    if (!dbSummary) {
      return NextResponse.json(
        {
          success: false,
          error: 'No standup summary found for this period',
        },
        { status: 404 }
      );
    }

    // Transform DB record to API response
    const summary: StandupSummaryResponse = {
      id: dbSummary.id,
      projectId: dbSummary.project_id,
      periodType: dbSummary.period_type,
      periodStart: dbSummary.period_start,
      periodEnd: dbSummary.period_end,
      title: dbSummary.title,
      summary: dbSummary.summary,
      stats: {
        implementationsCount: dbSummary.implementations_count,
        ideasGenerated: dbSummary.ideas_generated,
        ideasAccepted: dbSummary.ideas_accepted,
        ideasRejected: dbSummary.ideas_rejected,
        ideasImplemented: dbSummary.ideas_implemented,
        scansCount: dbSummary.scans_count,
      },
      blockers: dbSummary.blockers ? JSON.parse(dbSummary.blockers) as StandupBlocker[] : [],
      highlights: dbSummary.highlights ? JSON.parse(dbSummary.highlights) as StandupHighlight[] : [],
      insights: {
        velocityTrend: dbSummary.velocity_trend,
        burnoutRisk: dbSummary.burnout_risk,
        focusAreas: dbSummary.focus_areas ? JSON.parse(dbSummary.focus_areas) as StandupFocusArea[] : [],
      },
      generatedAt: dbSummary.generated_at,
    };

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    logger.error('Error fetching standup summary:', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch standup summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/standup');
