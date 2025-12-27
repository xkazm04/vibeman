import { NextRequest, NextResponse } from 'next/server';
import { standupDb } from '@/app/db';
import { logger } from '@/lib/logger';

// Inline type since the original types file was removed
interface StandupHistoryItem {
  id: string;
  periodType: 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  title: string;
  implementationsCount: number;
  ideasGenerated: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing' | null;
}

/**
 * GET /api/standup/history
 * Fetch standup summary history for a project
 *
 * Query params:
 * - projectId: string (required)
 * - periodType: 'daily' | 'weekly' (optional, filter by type)
 * - limit: number (optional, default 14)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const periodType = searchParams.get('periodType') as 'daily' | 'weekly' | null;
    const limitStr = searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : 14;

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: projectId',
        },
        { status: 400 }
      );
    }

    let summaries;
    if (periodType === 'daily') {
      summaries = standupDb.getRecentDailySummaries(projectId, limit);
    } else if (periodType === 'weekly') {
      summaries = standupDb.getRecentWeeklySummaries(projectId, limit);
    } else {
      summaries = standupDb.getSummariesByProject(projectId, limit);
    }

    const history: StandupHistoryItem[] = summaries.map((s) => ({
      id: s.id,
      periodType: s.period_type,
      periodStart: s.period_start,
      periodEnd: s.period_end,
      title: s.title,
      implementationsCount: s.implementations_count,
      ideasGenerated: s.ideas_generated,
      velocityTrend: s.velocity_trend,
    }));

    return NextResponse.json({ success: true, history });
  } catch (error) {
    logger.error('Error fetching standup history:', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch standup history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
