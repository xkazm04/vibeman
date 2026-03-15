/**
 * POST /api/conductor/specs/purge
 *
 * Manually trigger a stale-spec purge.  Deletes DB rows and disk files for
 * all conductor runs that have been in a terminal state (completed / failed /
 * interrupted) for longer than `ttlHours` (default 24).
 *
 * Body (optional):
 *   { ttlHours?: number }   — age threshold in hours (default 24)
 *
 * Response:
 *   { success: true, purged: number, errors: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { specLifecycleManager } from '@/app/features/Manager/lib/conductor/spec/specLifecycleManager';

export async function POST(request: NextRequest) {
  try {
    let ttlHours = 24;

    try {
      const body = await request.json();
      if (typeof body?.ttlHours === 'number' && body.ttlHours > 0) {
        ttlHours = body.ttlHours;
      }
    } catch {
      // No body or invalid JSON — use default TTL
    }

    const result = await specLifecycleManager.purgeStaleSpecs(ttlHours);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[conductor/specs/purge] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
