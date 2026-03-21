/**
 * Conductor Pipeline Recovery API
 *
 * POST: Detect and mark orphaned pipeline runs after app crash/restart.
 * Runs marked 'running' or 'paused' in DB with no active orchestrator
 * loop are set to 'interrupted'.
 */

import { NextResponse } from 'next/server';
import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';

export async function POST() {
  try {
    const runIds = conductorRepository.markInterruptedRuns();
    return NextResponse.json({
      success: true,
      recovered: runIds.length,
      runIds,
    });
  } catch (error) {
    console.error('[conductor/recovery] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Recovery failed' },
      { status: 500 }
    );
  }
}
