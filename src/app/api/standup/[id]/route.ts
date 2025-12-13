import { NextRequest, NextResponse } from 'next/server';
import { standupDb } from '@/app/db';
import { StandupSummaryResponse, StandupBlocker, StandupHighlight, StandupFocusArea } from '@/app/db/models/standup.types';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/standup/[id]
 * Fetch a specific standup summary by ID
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;

    const dbSummary = standupDb.getSummaryById(id);

    if (!dbSummary) {
      return NextResponse.json(
        {
          success: false,
          error: 'Standup summary not found',
        },
        { status: 404 }
      );
    }

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

/**
 * DELETE /api/standup/[id]
 * Delete a standup summary
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;

    const deleted = standupDb.deleteSummary(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Standup summary not found',
        },
        { status: 404 }
      );
    }

    logger.info('Standup summary deleted', { id });

    return NextResponse.json({ success: true, message: 'Standup summary deleted' });
  } catch (error) {
    logger.error('Error deleting standup summary:', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete standup summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
