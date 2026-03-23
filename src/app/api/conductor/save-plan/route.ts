/**
 * Conductor V4 Save Plan API
 *
 * Receives the execution plan from Claude Code CLI (via save_plan MCP tool)
 * and persists each requirement as an Idea with status 'accepted'.
 *
 * POST /api/conductor/save-plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDatabase } from '@/app/db/connection';
import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';
import { logger } from '@/lib/logger';

interface PlanRequirement {
  title: string;
  description: string;
  category?: string;
  effort?: number;
  impact?: number;
  targetFiles?: string[];
  contextId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, taskId, requirements, planSummary } = await request.json();

    if (!projectId || !requirements || !Array.isArray(requirements)) {
      return NextResponse.json(
        { success: false, error: 'Missing projectId or requirements array' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const ideaIds: string[] = [];

    // Create a scan record for this plan
    const scanId = `conductor-v4-plan-${randomUUID().substring(0, 8)}`;
    db.prepare(
      `INSERT OR IGNORE INTO scans (id, project_id, scan_type, summary, created_at)
       VALUES (?, ?, 'conductor_v4_plan', ?, datetime('now'))`
    ).run(scanId, projectId, planSummary || 'Conductor V4 execution plan');

    // Save each requirement as an Idea with status 'accepted'
    const insertStmt = db.prepare(
      `INSERT INTO ideas (id, scan_id, project_id, context_id, scan_type, category, title, description, reasoning, status, effort, impact, requirement_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'conductor_v4', ?, ?, ?, ?, 'accepted', ?, ?, ?, datetime('now'), datetime('now'))`
    );

    for (const req of requirements as PlanRequirement[]) {
      const ideaId = randomUUID();
      const requirementSlug = `v4-${ideaId.substring(0, 8)}-${slugify(req.title)}`;

      insertStmt.run(
        ideaId,
        scanId,
        projectId,
        req.contextId || null,
        req.category || 'feature',
        req.title,
        req.description,
        req.targetFiles ? `Target files: ${req.targetFiles.join(', ')}` : null,
        req.effort || null,
        req.impact || null,
        requirementSlug,
      );

      ideaIds.push(ideaId);
    }

    // Check if plan approval is required (from conductor run config)
    let requiresApproval = false;
    if (taskId) {
      // Extract runId from taskId (format: "conductor-v4-{runId}")
      const runId = taskId.replace('conductor-v4-', '');
      const run = conductorRepository.getRunById(runId);
      if (run) {
        try {
          const config = typeof run.config === 'string'
            ? JSON.parse(run.config)
            : run.config;
          requiresApproval = config?.requirePlanApproval === true;
        } catch { /* use default */ }

        // If approval required, pause the run
        if (requiresApproval) {
          conductorRepository.updateRunStatus(runId, 'paused');
        }
      }
    }

    logger.info(`[V4 save-plan] Saved ${ideaIds.length} requirements as Ideas for project ${projectId}`);

    return NextResponse.json({
      success: true,
      savedCount: ideaIds.length,
      ideaIds,
      requiresApproval,
      scanId,
    });
  } catch (error) {
    logger.error('[V4 save-plan] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}
