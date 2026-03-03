/**
 * Conductor Pipeline Run API
 *
 * POST: Start, pause, resume, or stop a pipeline run
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { v4 as uuidv4 } from 'uuid';
import {
  startPipeline,
  pausePipeline,
  resumePipeline,
  stopPipeline,
} from '@/app/features/Manager/lib/conductor/conductorOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, runId, config, projectPath, projectName } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing action' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    switch (action) {
      case 'start': {
        if (!projectId) {
          return NextResponse.json(
            { success: false, error: 'Missing projectId' },
            { status: 400 }
          );
        }

        const id = runId || uuidv4();
        const now = new Date().toISOString();

        const stages = {
          scout: { status: 'pending', itemsIn: 0, itemsOut: 0 },
          triage: { status: 'pending', itemsIn: 0, itemsOut: 0 },
          batch: { status: 'pending', itemsIn: 0, itemsOut: 0 },
          execute: { status: 'pending', itemsIn: 0, itemsOut: 0 },
          review: { status: 'pending', itemsIn: 0, itemsOut: 0 },
        };

        const metrics = {
          ideasGenerated: 0,
          ideasAccepted: 0,
          ideasRejected: 0,
          tasksCreated: 0,
          tasksCompleted: 0,
          tasksFailed: 0,
          healingPatchesApplied: 0,
          totalDurationMs: 0,
          estimatedCost: 0,
        };

        db.prepare(`
          INSERT INTO conductor_runs (id, project_id, status, current_stage, cycle, config_snapshot, stages_state, metrics, started_at)
          VALUES (?, ?, 'running', 'scout', 1, ?, ?, ?, ?)
        `).run(
          id,
          projectId,
          JSON.stringify(config || {}),
          JSON.stringify(stages),
          JSON.stringify(metrics),
          now
        );

        // Launch pipeline orchestrator in background
        startPipeline(id, projectId, config || {}, projectPath, projectName);

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
          db.prepare(`UPDATE conductor_runs SET status = 'paused' WHERE id = ? AND status = 'running'`).run(runId);
        } else {
          db.prepare(`UPDATE conductor_runs SET status = 'paused' WHERE project_id = ? AND status = 'running'`).run(projectId);
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
          db.prepare(`UPDATE conductor_runs SET status = 'running' WHERE id = ? AND status = 'paused'`).run(runId);
        } else {
          db.prepare(`UPDATE conductor_runs SET status = 'running' WHERE project_id = ? AND status = 'paused'`).run(projectId);
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

        const now = new Date().toISOString();
        if (runId) {
          stopPipeline(runId);
          db.prepare(`UPDATE conductor_runs SET status = 'completed', completed_at = ? WHERE id = ? AND status IN ('running', 'paused')`).run(now, runId);
        } else {
          db.prepare(`UPDATE conductor_runs SET status = 'completed', completed_at = ? WHERE project_id = ? AND status IN ('running', 'paused')`).run(now, projectId);
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
