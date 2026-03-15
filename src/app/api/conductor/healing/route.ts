/**
 * Conductor Self-Healing API
 *
 * GET: Get error classifications and healing patches
 * POST: Apply or revert a healing patch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { withValidation } from '@/lib/api/withValidation';
import { HealingPostBodySchema, type HealingPostBody } from '@/lib/api/schemas/conductor';

interface ConductorErrorRow {
  id: string;
  pipeline_run_id: string;
  stage: string;
  error_type: string;
  error_message: string;
  task_id: string | null;
  scan_type: string | null;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved: number;
}

interface HealingPatchRow {
  id: string;
  pipeline_run_id: string;
  target_type: string;
  target_id: string;
  original_value: string;
  patched_value: string;
  reason: string;
  error_pattern: string;
  applied_at: string;
  effectiveness: number | null;
  reverted: number;
  expires_at: string;
  application_count: number | null;
  success_count: number | null;
}

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
    `).all(projectId) as ConductorErrorRow[];

    // Get patches for this project's runs
    const patches = db.prepare(`
      SELECT cp.*
      FROM conductor_healing_patches cp
      JOIN conductor_runs cr ON cp.pipeline_run_id = cr.id
      WHERE cr.project_id = ?
      ORDER BY cp.applied_at DESC
      LIMIT 50
    `).all(projectId) as HealingPatchRow[];

    return NextResponse.json({
      success: true,
      errors: errors.map((e) => ({
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
      patches: patches.map((p) => ({
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
        expiresAt: p.expires_at,
        applicationCount: p.application_count ?? 0,
        successCount: p.success_count ?? 0,
        successRate: p.application_count ? (p.success_count ?? 0) / p.application_count : null,
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

export const POST = withValidation(
  HealingPostBodySchema,
  async (_request: NextRequest, body: HealingPostBody) => {
  const { action, patchId } = body;
  try {
    if (!patchId && action !== 'save') {
      return NextResponse.json(
        { success: false, error: 'Missing patchId' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    switch (action) {
      case 'save': {
        const { patch } = body;
        if (!patch) {
          return NextResponse.json(
            { success: false, error: 'Missing patch data' },
            { status: 400 }
          );
        }

        const expiresAt = patch.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        db.prepare(`
          INSERT INTO conductor_healing_patches
          (id, pipeline_run_id, target_type, target_id, original_value, patched_value, reason, error_pattern, applied_at, reverted, expires_at, application_count, success_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0)
        `).run(
          patch.id || patchId,
          patch.pipelineRunId,
          patch.targetType,
          patch.targetId,
          patch.originalValue || '',
          patch.patchedValue || '',
          patch.reason || '',
          patch.errorPattern || '',
          patch.appliedAt || new Date().toISOString(),
          expiresAt,
        );

        return NextResponse.json({ success: true, action: 'saved' });
      }

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

      case 'update_effectiveness': {
        const { effectiveness } = body;
        if (effectiveness === undefined || effectiveness === null) {
          return NextResponse.json(
            { success: false, error: 'Missing effectiveness value' },
            { status: 400 }
          );
        }

        db.prepare(`
          UPDATE conductor_healing_patches
          SET effectiveness = ?
          WHERE id = ?
        `).run(effectiveness, patchId);

        return NextResponse.json({ success: true, action: 'effectiveness_updated' });
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
});
