/**
 * API Route: Brain Signal Correlations
 *
 * GET /api/brain/correlations?projectId=xxx&windowDays=14&topN=5
 * Compute pairwise temporal correlations between signal types.
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeCorrelations } from '@/lib/brain/correlationEngine';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const windowDays = parseInt(searchParams.get('windowDays') || '14', 10);
    const topN = parseInt(searchParams.get('topN') || '5', 10);

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const report = computeCorrelations(projectId, windowDays, topN);

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error) {
    console.error('[API] Brain correlations GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/brain/correlations');
