/**
 * API Route: Brain Signal Decay
 *
 * POST /api/brain/signals/decay - Apply decay to signals with configurable settings
 *
 * Designed to be called as a weekly scheduled job. Safe to call multiple times
 * per week — duplicates are skipped automatically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';
import { applySignalDecay } from '@/lib/brain/brainService';
import {
  DEFAULT_DECAY_FACTOR,
  DEFAULT_RETENTION_DAYS,
  DECAY_FACTOR_MIN,
  DECAY_FACTOR_MAX,
  RETENTION_DAYS_MIN,
  RETENTION_DAYS_MAX,
} from '@/lib/brain/config';

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, decayFactor = DEFAULT_DECAY_FACTOR, retentionDays = DEFAULT_RETENTION_DAYS } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Verify project exists and caller has access
    const accessDenied = checkProjectAccess(projectId, request);
    if (accessDenied) return accessDenied;

    // Validate ranges
    const clampedFactor = Math.max(DECAY_FACTOR_MIN, Math.min(DECAY_FACTOR_MAX, Number(decayFactor)));
    const clampedRetention = Math.max(RETENTION_DAYS_MIN, Math.min(RETENTION_DAYS_MAX, Math.floor(Number(retentionDays))));

    const { decayed, deleted } = applySignalDecay(projectId, clampedFactor, clampedRetention);

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

export const POST = withObservability(withRateLimit(handlePost, '/api/brain/signals/decay', 'strict'), '/api/brain/signals/decay');
