import { NextRequest, NextResponse } from 'next/server';
import { getPeriodDateRange } from '@/lib/standup';
import { generateUnifiedStandup } from '@/lib/standup/standupService';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';

/**
 * POST /api/standup/generate
 * Generate a new standup summary for a project and period.
 * Uses the unified pipeline: single data-fetch pass feeds both
 * the retrospective LLM summary and the predictive analysis.
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, periodType, periodStart, forceRegenerate = false } = body;

    if (!projectId || !periodType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          required: ['projectId', 'periodType'],
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

    const { start, end } = getPeriodDateRange(periodType, periodStart);

    const result = await generateUnifiedStandup(
      projectId,
      periodType,
      start,
      end,
      forceRegenerate
    );

    if (!result.cached) {
      logger.info('Standup summary generated', {
        projectId,
        periodType,
        periodStart: start.toISOString().split('T')[0],
      });
    }

    return NextResponse.json({
      success: true,
      summary: result.summary,
      predictions: result.predictions,
      cached: result.cached,
    });
  } catch (error) {
    logger.error('Error generating standup summary:', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate standup summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = withObservability(withRateLimit(handlePost, '/api/standup/generate', 'expensive'), '/api/standup/generate');
