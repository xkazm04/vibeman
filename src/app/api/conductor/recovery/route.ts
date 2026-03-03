/**
 * Conductor Pipeline Recovery API
 *
 * POST: Detect and mark orphaned pipeline runs after app crash/restart.
 * Runs marked 'running' or 'paused' in DB with no active orchestrator
 * loop are set to 'interrupted'.
 */

import { NextResponse } from 'next/server';
import { recoverOrphanedRuns } from '@/app/features/Manager/lib/conductor/conductorOrchestrator';

export async function POST() {
  try {
    const orphanedIds = recoverOrphanedRuns();
    return NextResponse.json({
      success: true,
      recovered: orphanedIds.length,
      runIds: orphanedIds,
    });
  } catch (error) {
    console.error('[conductor/recovery] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Recovery failed' },
      { status: 500 }
    );
  }
}
