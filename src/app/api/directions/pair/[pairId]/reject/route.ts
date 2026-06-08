/**
 * POST /api/directions/pair/[pairId]/reject
 * Reject both directions in a pair
 */

import { NextRequest, NextResponse } from 'next/server';
import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';
import { directionRepository } from '@/app/db/repositories/direction.repository';
import { insightEffectivenessCacheRepository } from '@/app/db/repositories/insight-effectiveness-cache.repository';
import { insightInfluenceRepository } from '@/app/db/repositories/insight-influence.repository';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const { pairId } = await params;

    // Reject both directions in the pair
    const rejectedCount = directionRepository.rejectDirectionPair(pairId);

    if (rejectedCount === 0) {
      return NextResponse.json(
        { error: 'Direction pair not found or already processed' },
        { status: 404 }
      );
    }

    logger.info('[API] Direction pair rejected:', { pairId, rejectedCount });

    // Record insight influence for causal validation
    try {
      const pair = directionRepository.getDirectionPair(pairId);
      const projectId = pair.directionA?.project_id || pair.directionB?.project_id;
      if (projectId) {
        const activeInsights = brainInsightRepository.getForEffectiveness(projectId);
        if (activeInsights.length > 0) {
          const now = new Date().toISOString();
          const insightBatch = activeInsights.map(i => ({
            id: i.id,
            title: i.title,
            shownAt: i.completed_at || now,
          }));
          if (pair.directionA) {
            insightInfluenceRepository.recordInfluenceBatch(projectId, pair.directionA.id, 'rejected', insightBatch);
          }
          if (pair.directionB) {
            insightInfluenceRepository.recordInfluenceBatch(projectId, pair.directionB.id, 'rejected', insightBatch);
          }
        }
        // Invalidate effectiveness cache since both directions were rejected
        try { insightEffectivenessCacheRepository.invalidate(projectId); } catch { /* non-critical */ }
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
