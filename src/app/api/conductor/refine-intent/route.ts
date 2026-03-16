/**
 * Intent Refinement API
 *
 * POST: Submit answers to intent-refinement questions and resume the pipeline.
 *       The CLI scan now happens server-side in conductorV3.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withValidation } from '@/lib/api/withValidation';
import { RefineIntentPostBodySchema, type RefineIntentPostBody } from '@/lib/api/schemas/conductor';
import { getDatabase } from '@/app/db/connection';
import { resumeV3Pipeline } from '@/app/features/Conductor/lib/v3/conductorV3';

// ============================================================================
// POST — Submit intent answers and resume pipeline
// ============================================================================

export const POST = withValidation(
  RefineIntentPostBodySchema,
  async (_request: NextRequest, body: RefineIntentPostBody) => {
    const { runId, answers } = body;

    try {
      const db = getDatabase();

      // Verify the run exists and is paused
      const row = db
        .prepare('SELECT status FROM conductor_runs WHERE id = ?')
        .get(runId) as { status: string } | undefined;

      if (!row) {
        return NextResponse.json(
          { success: false, error: 'Run not found' },
          { status: 404 }
        );
      }

      if (row.status !== 'paused') {
        return NextResponse.json(
          { success: false, error: `Run is not paused (status: ${row.status})` },
          { status: 409 }
        );
      }

      // Store answers on the run record
      db.prepare('UPDATE conductor_runs SET intent_answers = ? WHERE id = ?')
        .run(JSON.stringify(answers), runId);

      // Resume the pipeline
      resumeV3Pipeline(runId);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[conductor/refine-intent] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to submit answers' },
        { status: 500 }
      );
    }
  }
);
