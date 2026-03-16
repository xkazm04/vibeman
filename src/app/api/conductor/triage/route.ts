/**
 * Conductor Triage Decisions API
 *
 * POST: Submit triage decisions (approve/reject) for a paused pipeline run.
 * Merges decisions into triage_data and resumes the pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, decisions } = body;

    // Validate input
    if (!runId) {
      return NextResponse.json(
        { success: false, error: 'Missing runId' },
        { status: 400 }
      );
    }

    if (!decisions || !Array.isArray(decisions) || decisions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty decisions array' },
        { status: 400 }
      );
    }

    // Check run exists and is paused
    const run = conductorRepository.getRunById(runId);
    if (!run) {
      return NextResponse.json(
        { success: false, error: 'Run not found' },
        { status: 404 }
      );
    }

    if (run.status !== 'paused') {
      return NextResponse.json(
        { success: false, error: 'Run not in paused state' },
        { status: 409 }
      );
    }

    // Check checkpoint_type is 'triage'
    const db = getDatabase();
    const row = db.prepare(
      'SELECT checkpoint_type, triage_data FROM conductor_runs WHERE id = ?'
    ).get(runId) as { checkpoint_type: string | null; triage_data: string | null } | undefined;

    if (!row || row.checkpoint_type !== 'triage') {
      return NextResponse.json(
        { success: false, error: 'Run not at triage checkpoint' },
        { status: 409 }
      );
    }

    // Read existing triage_data, merge decisions
    let triageData: Record<string, unknown> = {};
    if (row.triage_data) {
      try {
        triageData = JSON.parse(row.triage_data);
      } catch {
        triageData = {};
      }
    }

    triageData.decisions = decisions;

    // Write back merged triage_data
    db.prepare(
      'UPDATE conductor_runs SET triage_data = ? WHERE id = ?'
    ).run(JSON.stringify(triageData), runId);

    // Resume pipeline
    conductorRepository.updateRunStatus(runId, 'running');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[conductor/triage] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
