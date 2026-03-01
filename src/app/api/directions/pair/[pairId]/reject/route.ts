/**
 * POST /api/directions/pair/[pairId]/reject
 * Reject both directions in a pair
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb, brainInsightDb, insightInfluenceDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const { pairId } = await params;

    // Reject both directions in the pair
    const rejectedCount = directionDb.rejectDirectionPair(pairId);

    if (rejectedCount === 0) {
      return NextResponse.json(
        { error: 'Direction pair not found or already processed' },
        { status: 404 }
      );
    }

    logger.info('[API] Direction pair rejected:', { pairId, rejectedCount });

    // Record insight influence for causal validation
    try {
      const pair = directionDb.getDirectionPair(pairId);
      const projectId = pair.directionA?.project_id || pair.directionB?.project_id;
      if (projectId) {
        const activeInsights = brainInsightDb.getForEffectiveness(projectId);
        if (activeInsights.length > 0) {
          const now = new Date().toISOString();
          const insightBatch = activeInsights.map(i => ({
            id: i.id,
            title: i.title,
            shownAt: i.completed_at || now,
          }));
          if (pair.directionA) {
            insightInfluenceDb.recordInfluenceBatch(projectId, pair.directionA.id, 'rejected', insightBatch);
          }
          if (pair.directionB) {
            insightInfluenceDb.recordInfluenceBatch(projectId, pair.directionB.id, 'rejected', insightBatch);
          }
        }
      }
    } catch {
      // Influence tracking must never break the main flow
    }

    return NextResponse.json({
      success: true,
      rejectedCount,
    });
  } catch (error) {
    logger.error('[API] Direction pair reject error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
