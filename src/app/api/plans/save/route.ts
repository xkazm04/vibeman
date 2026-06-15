/**
 * Save Plan API (headless) — with risk/effort approval gate
 *
 * Receives an execution plan from a Claude Code CLI (via the `save_plan` MCP tool)
 * and persists each requirement as an Idea. Each plan also creates a `scans` record
 * (scan_type 'plan') so the ideas are grouped and recoverable.
 *
 * APPROVAL GATE: requirements whose effort or risk crosses a threshold are held
 * with status 'pending' (awaiting explicit user approval) instead of 'accepted'
 * (ready to enter an implementation wave). The response lists the flagged items so
 * the CLI can stop and surface them to the user. Below-threshold items are
 * auto-accepted.
 *
 * POST /api/plans/save
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDatabase } from '@/app/db/connection';
import { logger } from '@/lib/logger';

interface PlanRequirement {
  title: string;
  description: string;
  category?: string;
  effort?: number;
  impact?: number;
  risk?: number;
  targetFiles?: string[];
  contextId?: string;
}

interface FlaggedItem {
  id: string;
  title: string;
  effort: number | null;
  impact: number | null;
  risk: number | null;
  reason: string;
}

// Defaults: a requirement is held for approval when effort OR risk is "high".
const DEFAULT_EFFORT_THRESHOLD = 7;
const DEFAULT_RISK_THRESHOLD = 7;

export async function POST(request: NextRequest) {
  try {
    const { projectId, requirements, planSummary, effortThreshold, riskThreshold } = await request.json();

    if (!projectId || !requirements || !Array.isArray(requirements)) {
      return NextResponse.json(
        { success: false, error: 'Missing projectId or requirements array' },
        { status: 400 }
      );
    }

    const effortGate = typeof effortThreshold === 'number' ? effortThreshold : DEFAULT_EFFORT_THRESHOLD;
    const riskGate = typeof riskThreshold === 'number' ? riskThreshold : DEFAULT_RISK_THRESHOLD;

    // Cap requirements array size
    const MAX_REQUIREMENTS = 200;
    if (requirements.length > MAX_REQUIREMENTS) {
      return NextResponse.json(
        { success: false, error: `Requirements count ${requirements.length} exceeds maximum of ${MAX_REQUIREMENTS}` },
        { status: 400 }
      );
    }

    // Validate each requirement has at least title and description
    for (let i = 0; i < requirements.length; i++) {
      const req = requirements[i];
      if (!req || typeof req.title !== 'string' || !req.title.trim()) {
        return NextResponse.json(
          { success: false, error: `Requirement at index ${i} is missing a valid title` },
          { status: 400 }
        );
      }
      if (typeof req.description !== 'string' || !req.description.trim()) {
        return NextResponse.json(
          { success: false, error: `Requirement at index ${i} is missing a valid description` },
          { status: 400 }
        );
      }
    }

    const db = getDatabase();
    const ideaIds: string[] = [];
    const flaggedItems: FlaggedItem[] = [];

    // Create a scan record for this plan
    const scanId = `plan-${randomUUID().substring(0, 8)}`;
    db.prepare(
      `INSERT OR IGNORE INTO scans (id, project_id, scan_type, summary, created_at)
       VALUES (?, ?, 'plan', ?, datetime('now'))`
    ).run(scanId, projectId, planSummary || 'CLI execution plan');

    const insertStmt = db.prepare(
      `INSERT INTO ideas (id, scan_id, project_id, context_id, scan_type, category, title, description, reasoning, status, effort, impact, risk, requirement_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'plan', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    );

    for (const req of requirements as PlanRequirement[]) {
      const ideaId = randomUUID();
      const requirementSlug = `plan-${ideaId.substring(0, 8)}-${slugify(req.title)}`;

      const effort = req.effort ?? null;
      const impact = req.impact ?? null;
      const risk = req.risk ?? null;

      // Approval gate: hold high-effort or high-risk items as 'pending'.
      const reasons: string[] = [];
      if (effort != null && effort >= effortGate) reasons.push(`effort ${effort} ≥ ${effortGate}`);
      if (risk != null && risk >= riskGate) reasons.push(`risk ${risk} ≥ ${riskGate}`);
      const held = reasons.length > 0;
      const status = held ? 'pending' : 'accepted';

      insertStmt.run(
        ideaId,
        scanId,
        projectId,
        req.contextId || null,
        req.category || 'feature',
        req.title,
        req.description,
        req.targetFiles ? `Target files: ${req.targetFiles.join(', ')}` : null,
        status,
        effort,
        impact,
        risk,
        requirementSlug,
      );

      ideaIds.push(ideaId);
      if (held) {
        flaggedItems.push({ id: ideaId, title: req.title, effort, impact, risk, reason: reasons.join(' and ') });
      }
    }

    const requiresApproval = flaggedItems.length > 0;
    logger.info(
      `[plans/save] Saved ${ideaIds.length} requirements as Ideas for project ${projectId} ` +
      `(${flaggedItems.length} flagged for approval)`
    );

    return NextResponse.json({
      success: true,
      savedCount: ideaIds.length,
      ideaIds,
      requiresApproval,
      flaggedItems,
      scanId,
    });
  } catch (error) {
    logger.error('[plans/save] Error:', error);
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
