/**
 * Conductor Pipeline Status API
 *
 * GET: Get current pipeline run state by runId or latest for projectId
 *
 * Uses conductorRepository for DB-persisted state (no globalThis).
 */

import { NextRequest, NextResponse } from 'next/server';
import { conductorRepository } from '@/app/features/Manager/lib/conductor/conductor.repository';

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
          startedAt: run.started_at,
          completedAt: run.completed_at,
        },
      });
    }

    // Fallback: get the most recent run for the project
    const runs = conductorRepository.getRunHistory(projectId!, 1);
    const latestRun = runs[0] || null;

    if (!latestRun) {
      return NextResponse.json({
        success: true,
        run: null,
      });
    }

    return NextResponse.json({
      success: true,
      run: {
        id: latestRun.id,
        projectId: latestRun.project_id,
        goalId: latestRun.goal_id,
        status: latestRun.status,
        currentStage: latestRun.current_stage,
        cycle: latestRun.cycle,
        config: latestRun.config,
        stages: latestRun.stages,
        metrics: latestRun.metrics,
        startedAt: latestRun.started_at,
        completedAt: latestRun.completed_at,
      },
    });
  } catch (error) {
    console.error('[conductor/status] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
