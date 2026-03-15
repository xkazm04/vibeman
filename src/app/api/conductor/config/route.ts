/**
 * Conductor Pipeline Config API
 *
 * GET: Get saved balancing config for a project
 * PUT: Update balancing config
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { withValidation } from '@/lib/api/withValidation';
import { ConfigPutBodySchema, type ConfigPutBody } from '@/lib/api/schemas/conductor';

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
    `).get(projectId) as { config_snapshot: string | null } | undefined;

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

export const PUT = withValidation(
  ConfigPutBodySchema,
  async (_request: NextRequest, body: ConfigPutBody) => {
    try {
      const { projectId, config } = body;
      const db = getDatabase();

      const result = db.prepare(`
        UPDATE conductor_runs
        SET config_snapshot = ?
        WHERE project_id = ? AND status IN ('running', 'paused')
      `).run(JSON.stringify(config), projectId);

      return NextResponse.json({
        success: true,
        updated: result.changes > 0,
      });
    } catch (error) {
      console.error('[conductor/config] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
