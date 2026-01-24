/**
 * Brain Outcomes API
 * Returns direction implementation outcomes and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { directionOutcomeDb } from '@/app/db';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : undefined;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get recent outcomes
    const outcomes = directionOutcomeDb.getByProject(projectId, { limit });

    // Get statistics
    const stats = directionOutcomeDb.getStats(projectId, days);

    return NextResponse.json({
      success: true,
      outcomes,
      stats: {
        total: stats.total,
        successful: stats.successful,
        failed: stats.failed,
        reverted: stats.reverted,
        pending: stats.pending,
        avgSatisfaction: stats.avgSatisfaction,
      },
    });
  } catch (error) {
    console.error('Failed to get outcomes:', error);
    return NextResponse.json(
      { error: 'Failed to get outcomes' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGET, '/api/brain/outcomes');
