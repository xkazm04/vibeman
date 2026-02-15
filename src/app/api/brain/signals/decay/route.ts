/**
 * API Route: Brain Signal Decay
 *
 * POST /api/brain/signals/decay - Apply decay to signals with configurable settings
 *
 * Designed to be called as a weekly scheduled job. The repository's applyDecay()
 * uses decay_applied_at tracking to ensure signals are only decayed once per
 * weekly cycle (Monday-Sunday). Safe to call multiple times per week — duplicates
 * are skipped automatically. Updates are batched in 1000-row chunks to avoid
 * table locks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { behavioralSignalDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';

/**
 * POST /api/brain/signals/decay
 * Apply exponential decay to signals older than the threshold,
 * and delete signals beyond retention period.
 *
 * Body:
 * - projectId: string (required, or "all" to decay all projects)
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

    // Verify project exists and caller has access
    const accessDenied = checkProjectAccess(projectId, request);
    if (accessDenied) return accessDenied;

    // Validate ranges
    const clampedFactor = Math.max(0.8, Math.min(0.99, Number(decayFactor)));
    const clampedRetention = Math.max(7, Math.min(90, Math.floor(Number(retentionDays))));

    // Apply decay to signals older than 7 days.
    // Batched in 1000-row chunks with decay_applied_at tracking
    // to skip already-decayed signals in the current weekly cycle.
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

export const POST = withObservability(withRateLimit(handlePost, '/api/brain/signals/decay', 'strict'), '/api/brain/signals/decay');
