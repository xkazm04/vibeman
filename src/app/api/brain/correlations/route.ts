/**
 * API Route: Brain Signal Correlations
 *
 * GET /api/brain/correlations?projectId=xxx&windowDays=14&topN=5
 * Compute pairwise temporal correlations between signal types.
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeCorrelations } from '@/lib/brain/correlationEngine';
import { withObservability } from '@/lib/observability/middleware';
import { parseQueryInt } from '@/lib/api-helpers/parseQueryInt';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const windowDays = parseQueryInt(searchParams.get('windowDays'), {
      default: 14, min: 1, max: 365, paramName: 'windowDays',
    });
    const topN = parseQueryInt(searchParams.get('topN'), {
      default: 5, min: 1, max: 50, paramName: 'topN',
    });

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
