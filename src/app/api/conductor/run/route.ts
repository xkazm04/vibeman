/**
 * Conductor Pipeline Run API
 *
 * POST: Start, pause, resume, or stop a pipeline run
 *
 * V4: Single-session autonomous pipeline (PRE-FLIGHT → EXECUTE → POST-FLIGHT).
 * Replaces V3's multi-session PLAN → DISPATCH → REFLECT cycle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  startV4Pipeline,
  pauseV4Pipeline,
  resumeV4Pipeline,
  stopV4Pipeline,
  getV4RunState,
} from '@/app/features/Conductor/lib/v4/conductorV4';
import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';
import { withValidation } from '@/lib/api/withValidation';
import { RunPostBodySchema, type RunPostBody } from '@/lib/api/schemas/conductor';

export const POST = withValidation(
  RunPostBodySchema,
  async (_request: NextRequest, body: RunPostBody) => {
  const { action, projectId, runId, config, projectPath, projectName, goalId } = body;
  try {
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
            { success: false, error: 'Conductor requires a goalId' },
            { status: 400 }
          );
        }

        const id = runId || uuidv4();
        startV4Pipeline(
          id,
          projectId,
          config || {},
          projectPath || '',
          projectName || 'Project',
          goalId,
        );

        return NextResponse.json({
          success: true,
          runId: id,
          status: 'running',
          pipelineVersion: 4,
        });
      }

      case 'pause': {
        if (!runId && !projectId) {
          return NextResponse.json(
            { success: false, error: 'Missing runId or projectId' },
            { status: 400 }
          );
        }

        const pauseTargetId = runId || (() => {
          const runs = conductorRepository.getRunHistory(projectId!, 1);
          return runs.find(r => r.status === 'running')?.id;
        })();

        if (pauseTargetId) {
          pauseV4Pipeline(pauseTargetId);
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

        const resumeTargetId = runId || (() => {
          const runs = conductorRepository.getRunHistory(projectId!, 1);
          return runs.find(r => r.status === 'paused')?.id;
        })();

        if (resumeTargetId) {
          resumeV4Pipeline(resumeTargetId, projectPath || '', config || {});
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

        const stopTargetId = runId || (() => {
          const runs = conductorRepository.getRunHistory(projectId!, 1);
          return runs.find(r => r.status === 'running' || r.status === 'paused')?.id;
        })();

        if (stopTargetId) {
          stopV4Pipeline(stopTargetId);
        }

        return NextResponse.json({ success: true, status: 'completed' });
      }

      case 'status': {
        if (!runId) {
          return NextResponse.json(
            { success: false, error: 'Missing runId' },
            { status: 400 }
          );
        }

        const state = getV4RunState(runId);
        if (state) {
          return NextResponse.json({ success: true, ...state });
        }

        // Fall back to DB
        const dbRun = conductorRepository.getRunById(runId);
        return NextResponse.json({
          success: true,
          status: dbRun?.status || 'unknown',
        });
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
});
