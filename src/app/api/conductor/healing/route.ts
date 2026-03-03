/**
 * Conductor Self-Healing API
 *
 * GET: Get error classifications and healing patches
 * POST: Apply or revert a healing patch
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

    // Get errors for this project's runs
    const errors = db.prepare(`
      SELECT ce.*
      FROM conductor_errors ce
      JOIN conductor_runs cr ON ce.pipeline_run_id = cr.id
      WHERE cr.project_id = ?
      ORDER BY ce.last_seen DESC
      LIMIT 50
    `).all(projectId) as any[];

    // Get patches for this project's runs
    const patches = db.prepare(`
      SELECT cp.*
      FROM conductor_healing_patches cp
      JOIN conductor_runs cr ON cp.pipeline_run_id = cr.id
      WHERE cr.project_id = ?
      ORDER BY cp.applied_at DESC
      LIMIT 50
    `).all(projectId) as any[];

    return NextResponse.json({
      success: true,
      errors: errors.map((e: any) => ({
        id: e.id,
        pipelineRunId: e.pipeline_run_id,
        stage: e.stage,
        errorType: e.error_type,
        errorMessage: e.error_message,
        taskId: e.task_id,
        scanType: e.scan_type,
        occurrenceCount: e.occurrence_count,
        firstSeen: e.first_seen,
        lastSeen: e.last_seen,
        resolved: !!e.resolved,
      })),
      patches: patches.map((p: any) => ({
        id: p.id,
        pipelineRunId: p.pipeline_run_id,
        targetType: p.target_type,
        targetId: p.target_id,
        originalValue: p.original_value,
        patchedValue: p.patched_value,
        reason: p.reason,
        errorPattern: p.error_pattern,
        appliedAt: p.applied_at,
        effectiveness: p.effectiveness,
        reverted: !!p.reverted,
      })),
    });
  } catch (error) {
    console.error('[conductor/healing] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, patchId } = body;

    if (!action || !patchId) {
      return NextResponse.json(
        { success: false, error: 'Missing action or patchId' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    switch (action) {
      case 'revert': {
        db.prepare(`
          UPDATE conductor_healing_patches
          SET reverted = 1
          WHERE id = ?
        `).run(patchId);

        return NextResponse.json({ success: true, action: 'reverted' });
      }

      case 'apply': {
        db.prepare(`
          UPDATE conductor_healing_patches
          SET reverted = 0, applied_at = datetime('now')
          WHERE id = ?
        `).run(patchId);

        return NextResponse.json({ success: true, action: 'applied' });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[conductor/healing] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
