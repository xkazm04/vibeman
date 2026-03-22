/**
 * API Route: Brain Anomalies
 *
 * GET /api/brain/anomalies?projectId=xxx
 * Detect statistical anomalies in behavioral signal patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectAnomalies } from '@/lib/brain/anomalyDetector';
import { withObservability } from '@/lib/observability/middleware';
import { parseQueryInt } from '@/lib/api-helpers/parseQueryInt';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const baselineDays = parseQueryInt(searchParams.get('baselineDays'), {
      default: 30, min: 1, max: 365, paramName: 'baselineDays',
    });
    const windowDays = parseQueryInt(searchParams.get('windowDays'), {
      default: 3, min: 1, max: 365, paramName: 'windowDays',
    });

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const report = detectAnomalies(projectId, baselineDays, windowDays);

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error) {
    console.error('[API] Brain anomalies GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/brain/anomalies');
