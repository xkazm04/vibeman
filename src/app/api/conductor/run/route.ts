/**
 * Conductor Pipeline Run API
 *
 * POST: Start, pause, resume, or stop a pipeline run
 *
 * Uses conductorRepository for all DB state management.
 * V3-only: 3-phase adaptive pipeline (PLAN → DISPATCH → REFLECT).
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  startV3Pipeline,
  pauseV3Pipeline,
  resumeV3Pipeline,
  stopV3Pipeline,
} from '@/app/features/Conductor/lib/v3/conductorV3';
import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';
import { withValidation } from '@/lib/api/withValidation';
import { RunPostBodySchema, type RunPostBody } from '@/lib/api/schemas/conductor';

export const POST = withValidation(
  RunPostBodySchema,
  async (_request: NextRequest, body: RunPostBody) => {
  const { action, projectId, runId, config, projectPath, projectName, goalId, refinedIntent } = body;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startV3Pipeline(id, projectId, (config || {}) as any, projectPath || '', projectName || 'Project', goalId, refinedIntent || undefined);

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

        const pauseTargetId = runId || (() => {
          const runs = conductorRepository.getRunHistory(projectId!, 1);
          return runs.find(r => r.status === 'running')?.id;
        })();

        if (pauseTargetId) {
          pauseV3Pipeline(pauseTargetId);
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
          resumeV3Pipeline(resumeTargetId);
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
          stopV3Pipeline(stopTargetId);
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
});
