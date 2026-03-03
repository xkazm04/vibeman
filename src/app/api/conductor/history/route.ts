/**
 * Conductor Pipeline History API
 *
 * GET: Get past pipeline run summaries for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';

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

    const db = getDatabase();

    const rows = db.prepare(`
      SELECT id, project_id, status, cycle, metrics, started_at, completed_at
      FROM conductor_runs
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(projectId, limit) as any[];

    const runs = rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      status: row.status,
      cycles: row.cycle,
      metrics: JSON.parse(row.metrics || '{}'),
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));

    return NextResponse.json({
      success: true,
      runs,
    });
  } catch (error) {
    console.error('[conductor/history] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
