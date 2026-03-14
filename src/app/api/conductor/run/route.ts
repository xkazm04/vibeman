/**
 * Conductor Pipeline Run API
 *
 * POST: Start, pause, resume, or stop a pipeline run
 *
 * Uses conductorRepository for all DB state management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  startPipeline,
  pausePipeline,
  resumePipeline,
  stopPipeline,
} from '@/app/features/Manager/lib/conductor/conductorOrchestrator';
import { conductorRepository } from '@/app/features/Manager/lib/conductor/conductor.repository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, runId, config, projectPath, projectName, goalId } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing action' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'start': {
        if (!projectId) {
          return NextResponse.json(
            { success: false, error: 'Missing projectId' },
            { status: 400 }
          );
        }

        if (!goalId) {
          return NextResponse.json(
            { success: false, error: 'Missing goalId' },
            { status: 400 }
          );
        }

        const id = runId || uuidv4();

        // Launch pipeline orchestrator — it creates the DB run record internally
        startPipeline(id, projectId, config || {}, projectPath, projectName, goalId);

        return NextResponse.json({
          success: true,
          runId: id,
          status: 'running',
        });
      }

      case 'pause': {
        if (!runId && !projectId) {
          return NextResponse.json(
            { success: false, error: 'Missing runId or projectId' },
            { status: 400 }
          );
        }

        if (runId) {
          pausePipeline(runId);
        } else {
          // For projectId-based pause, get the latest running run
          const runs = conductorRepository.getRunHistory(projectId, 1);
          const activeRun = runs.find(r => r.status === 'running');
          if (activeRun) {
            pausePipeline(activeRun.id);
          }
        }

        return NextResponse.json({ success: true, status: 'paused' });
      }

      case 'resume': {
        if (!runId && !projectId) {
          return NextResponse.json(
            { success: false, error: 'Missing runId or projectId' },
            { status: 400 }
          );
        }

        if (runId) {
          resumePipeline(runId);
        } else {
          const runs = conductorRepository.getRunHistory(projectId, 1);
          const pausedRun = runs.find(r => r.status === 'paused');
          if (pausedRun) {
            resumePipeline(pausedRun.id);
          }
        }

        return NextResponse.json({ success: true, status: 'running' });
      }

      case 'stop': {
        if (!runId && !projectId) {
          return NextResponse.json(
            { success: false, error: 'Missing runId or projectId' },
            { status: 400 }
          );
        }

        if (runId) {
          stopPipeline(runId);
        } else {
          const runs = conductorRepository.getRunHistory(projectId, 1);
          const activeRun = runs.find(r => r.status === 'running' || r.status === 'paused');
          if (activeRun) {
            stopPipeline(activeRun.id);
          }
        }

        return NextResponse.json({ success: true, status: 'completed' });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[conductor/run] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
