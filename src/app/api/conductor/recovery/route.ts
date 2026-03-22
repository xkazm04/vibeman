/**
 * Conductor Pipeline Recovery API
 *
 * POST: Detect and mark orphaned pipeline runs after app crash/restart.
 * Runs marked 'running' or 'paused' in DB with no active orchestrator
 * loop are set to 'interrupted'.
 *
 * V4 runs get partial post-flight processing so implementation logs,
 * ideas, contexts, and brain signals are not lost.
 */

import { NextResponse } from 'next/server';
import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';
import { processPostFlight } from '@/app/features/Conductor/lib/v4/postFlight';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const { runIds, v4Runs } = conductorRepository.markInterruptedRuns();

    // Process partial post-flight for V4 zombie runs
    let v4Recovered = 0;
    for (const run of v4Runs) {
      try {
        const result = processPostFlight(run.runId, run.projectId, run.startedAt, run.goalId, undefined, { skipStatusUpdate: true });
        if (result.status !== 'failed') {
          v4Recovered++;
          logger.info(`[conductor/recovery] V4 run ${run.runId}: post-flight recovered ${result.implementationsProcessed} implementations`);
        }
      } catch (err) {
        logger.warn(`[conductor/recovery] V4 post-flight failed for run ${run.runId}: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      recovered: runIds.length,
      runIds,
      v4Recovered,
    });
  } catch (error) {
    console.error('[conductor/recovery] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Recovery failed' },
      { status: 500 }
    );
  }
}
