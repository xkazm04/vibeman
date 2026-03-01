/**
 * Brain Insight Influence API
 *
 * POST: Record insight influence events (which insights were active during a direction decision)
 * GET:  Compute and return causal validation scores (compares influenced vs non-influenced decisions)
 *
 * Query params (GET):
 *   - projectId: string (required)
 *
 * Body (POST):
 *   - projectId: string (required)
 *   - directionId: string (required)
 *   - decision: 'accepted' | 'rejected' (required)
 *   - insights: Array<{ id: string; title: string; shownAt: string }> (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { insightInfluenceDb } from '@/app/db';
import { computeCausalScores } from '@/lib/brain/insightCausalValidator';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { logger } from '@/lib/logger';

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }

  try {
    const report = computeCausalScores(projectId);

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error) {
    logger.error('[Brain Insight Influence] Causal score error:', { error });
    return NextResponse.json(
      { error: 'Failed to compute causal scores' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, directionId, decision, insights } = body;

    if (!projectId || !directionId || !decision || !Array.isArray(insights)) {
      return NextResponse.json(
        { error: 'projectId, directionId, decision, and insights[] are required' },
        { status: 400 }
      );
    }

    if (!['accepted', 'rejected'].includes(decision)) {
      return NextResponse.json(
        { error: 'decision must be "accepted" or "rejected"' },
        { status: 400 }
      );
    }

    if (insights.length === 0) {
      return NextResponse.json({
        success: true,
        recorded: 0,
        message: 'No insights to record',
      });
    }

    const recorded = insightInfluenceDb.recordInfluenceBatch(
      projectId,
      directionId,
      decision,
      insights
    );

    logger.info('[Brain Insight Influence] Recorded influence events', {
      projectId,
      directionId,
      decision,
      insightCount: recorded,
    });

    return NextResponse.json({
      success: true,
      recorded,
    });
  } catch (error) {
    logger.error('[Brain Insight Influence] Record error:', { error });
    return NextResponse.json(
      { error: 'Failed to record insight influence' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(
  withRateLimit(handleGet, '/api/brain/insights/influence', 'strict'),
  '/api/brain/insights/influence'
);

export const POST = withObservability(
  withRateLimit(handlePost, '/api/brain/insights/influence', 'standard'),
  '/api/brain/insights/influence'
);
