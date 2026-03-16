/**
 * Conductor Pipeline Status API
 *
 * GET: Get current pipeline run state by runId or latest for projectId
 *
 * Uses conductorRepository for DB-persisted state (no globalThis).
 */

import { NextRequest, NextResponse } from 'next/server';
import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';
import { getDatabase } from '@/app/db/connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    const projectId = searchParams.get('projectId');

    if (!runId && !projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing runId or projectId' },
        { status: 400 }
      );
    }

    if (runId) {
      // Direct lookup by runId
      const run = conductorRepository.getRunById(runId);

      if (!run) {
        return NextResponse.json(
          { success: false, error: 'Run not found' },
          { status: 404 }
        );
      }

      // Include triage_data when at triage checkpoint
      const triageInfo = getTriageDataIfAtCheckpoint(run.id);
      const intentQuestions = getIntentQuestions(run.id);

      return NextResponse.json({
        success: true,
        run: {
          id: run.id,
          projectId: run.project_id,
          goalId: run.goal_id,
          status: run.status,
          currentStage: run.current_stage,
          cycle: run.cycle,
          config: run.config,
          stages: run.stages,
          metrics: run.metrics,
          process_log: run.process_log,
          startedAt: run.started_at,
          completedAt: run.completed_at,
          pipelineVersion: run.pipeline_version,
          ...(triageInfo ? { triage_data: triageInfo } : {}),
          ...(intentQuestions ? { intent_questions: intentQuestions } : {}),
        },
      });
    }

    // Get all active runs for the project
    const activeRuns = conductorRepository.getActiveRuns(projectId!);

    const formattedRuns = activeRuns.map(run => {
      const triageInfo = getTriageDataIfAtCheckpoint(run.id);
      const intentQs = getIntentQuestions(run.id);
      return {
        id: run.id,
        projectId: run.project_id,
        goalId: run.goal_id,
        goalTitle: run.goal_title,
        status: run.status,
        currentStage: run.current_stage,
        cycle: run.cycle,
        config: run.config,
        stages: run.stages,
        metrics: run.metrics,
        process_log: run.process_log,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        pipelineVersion: run.pipeline_version,
        ...(triageInfo ? { triage_data: triageInfo } : {}),
        ...(intentQs ? { intent_questions: intentQs } : {}),
      };
    });

    return NextResponse.json({
      success: true,
      runs: formattedRuns,
      run: formattedRuns[0] || null, // backward compat
    });
  } catch (error) {
    console.error('[conductor/status] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Read triage_data from DB if the run is at a triage checkpoint.
 * Returns parsed triage data or null if not at triage checkpoint.
 */
function getTriageDataIfAtCheckpoint(runId: string): unknown | null {
  try {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT checkpoint_type, triage_data FROM conductor_runs WHERE id = ?'
    ).get(runId) as { checkpoint_type: string | null; triage_data: string | null } | undefined;

    if (row?.checkpoint_type === 'triage' && row.triage_data) {
      return JSON.parse(row.triage_data);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read intent_questions from DB if the run has them (paused at intent phase).
 */
function getIntentQuestions(runId: string): unknown | null {
  try {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT intent_questions FROM conductor_runs WHERE id = ?'
    ).get(runId) as { intent_questions: string | null } | undefined;

    if (row?.intent_questions) {
      return JSON.parse(row.intent_questions);
    }
    return null;
  } catch {
    return null;
  }
}
