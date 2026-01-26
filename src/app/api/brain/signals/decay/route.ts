/**
 * API Route: Brain Signal Decay
 *
 * POST /api/brain/signals/decay - Apply decay to signals with configurable settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { behavioralSignalDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';

/**
 * POST /api/brain/signals/decay
 * Apply exponential decay to signals older than the threshold,
 * and delete signals beyond retention period.
 *
 * Body:
 * - projectId: string (required)
 * - decayFactor: number (0.8-0.99, default 0.9)
 * - retentionDays: number (7-90, default 30)
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, decayFactor = 0.9, retentionDays = 30 } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Validate ranges
    const clampedFactor = Math.max(0.8, Math.min(0.99, Number(decayFactor)));
    const clampedRetention = Math.max(7, Math.min(90, Math.floor(Number(retentionDays))));

    // Apply decay to signals older than 7 days (same trigger threshold)
    const decayed = behavioralSignalDb.applyDecay(projectId, clampedFactor, 7);

    // Delete signals beyond retention period
    const deleted = behavioralSignalDb.deleteOld(projectId, clampedRetention);

    return NextResponse.json({
      success: true,
      affected: decayed + deleted,
      decayed,
      deleted,
      settings: {
        decayFactor: clampedFactor,
        retentionDays: clampedRetention,
      },
    });
  } catch (error) {
    console.error('[API] Brain signals decay POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/brain/signals/decay');
