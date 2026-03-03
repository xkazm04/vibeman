/**
 * Conductor Pipeline Config API
 *
 * GET: Get saved balancing config for a project
 * PUT: Update balancing config
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

    // Get config from the most recent run for this project
    const row = db.prepare(`
      SELECT config_snapshot
      FROM conductor_runs
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId) as any;

    return NextResponse.json({
      success: true,
      config: row ? JSON.parse(row.config_snapshot || '{}') : null,
    });
  } catch (error) {
    console.error('[conductor/config] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, config } = body;

    if (!projectId || !config) {
      return NextResponse.json(
        { success: false, error: 'Missing projectId or config' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Update config on the active run if one exists
    const result = db.prepare(`
      UPDATE conductor_runs
      SET config_snapshot = ?
      WHERE project_id = ? AND status IN ('running', 'paused')
    `).run(JSON.stringify(config), projectId);

    return NextResponse.json({
      success: true,
      updated: (result as any).changes > 0,
    });
  } catch (error) {
    console.error('[conductor/config] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
