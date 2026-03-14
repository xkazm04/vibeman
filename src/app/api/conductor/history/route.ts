/**
 * Conductor Pipeline History API
 *
 * GET: Get past pipeline run summaries for a project
 *
 * Uses conductorRepository for DB-persisted state (no globalThis).
 */

import { NextRequest, NextResponse } from 'next/server';
import { conductorRepository } from '@/app/features/Manager/lib/conductor/conductor.repository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing projectId' },
        { status: 400 }
      );
    }

    const runs = conductorRepository.getRunHistory(projectId, limit);

    const runSummaries = runs.map((run) => ({
      id: run.id,
      projectId: run.project_id,
      goalId: run.goal_id,
      status: run.status,
      currentStage: run.current_stage,
      cycle: run.cycle,
      metrics: run.metrics,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      durationMs: run.started_at && run.completed_at
        ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
        : null,
    }));

    return NextResponse.json({
      success: true,
      runs: runSummaries,
    });
  } catch (error) {
    console.error('[conductor/history] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
