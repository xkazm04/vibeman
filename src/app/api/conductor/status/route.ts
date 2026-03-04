/**
 * Conductor Pipeline Status API
 *
 * GET: Get current pipeline run state for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing projectId' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get the most recent active or recently completed run
    const row = db.prepare(`
      SELECT id, project_id, status, current_stage, cycle,
             config_snapshot, stages_state, metrics,
             started_at, completed_at
      FROM conductor_runs
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId) as any;

    if (!row) {
      return NextResponse.json({
        success: true,
        run: null,
      });
    }

    const run = {
      id: row.id,
      projectId: row.project_id,
      status: row.status,
      currentStage: row.current_stage,
      cycle: row.cycle,
      config: JSON.parse(row.config_snapshot || '{}'),
      stages: JSON.parse(row.stages_state || '{}'),
      metrics: JSON.parse(row.metrics || '{}'),
      startedAt: row.started_at,
      completedAt: row.completed_at,
      processLog: [],
    };

    return NextResponse.json({
      success: true,
      run,
    });
  } catch (error) {
    console.error('[conductor/status] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
