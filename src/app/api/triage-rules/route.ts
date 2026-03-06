import { NextRequest, NextResponse } from 'next/server';
import { triageRuleDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';
import { TriageCondition } from '@/app/db/models/types';
import { evaluateTriageRules, previewTriageRules } from '@/lib/triage/triageRulesEngine';
import { ideaDb } from '@/app/db';

const VALID_ACTIONS = ['accept', 'reject', 'archive'] as const;
const VALID_FIELDS: string[] = ['impact', 'effort', 'risk', 'category', 'scan_type', 'age_days'];
const VALID_OPERATORS: string[] = ['gte', 'lte', 'eq', 'neq', 'in', 'not_in'];

function validateConditions(conditions: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(conditions)) return { valid: false, error: 'conditions must be an array' };
  if (conditions.length === 0) return { valid: false, error: 'conditions must have at least one entry' };

  for (const c of conditions) {
    if (!c || typeof c !== 'object') return { valid: false, error: 'Each condition must be an object' };
    const cond = c as TriageCondition;
    if (!VALID_FIELDS.includes(cond.field)) return { valid: false, error: `Invalid field: ${cond.field}` };
    if (!VALID_OPERATORS.includes(cond.operator)) return { valid: false, error: `Invalid operator: ${cond.operator}` };
    if (cond.value === undefined || cond.value === null) return { valid: false, error: 'Condition value is required' };
  }
  return { valid: true };
}

/**
 * GET /api/triage-rules
 * Get all triage rules, optionally filtered by project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const rules = projectId
      ? triageRuleDb.getRulesByProject(projectId)
      : triageRuleDb.getAllRules();

    return NextResponse.json({ success: true, rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/triage-rules
 * Create a new triage rule, or run/preview rules
 * Body: { action: 'create' | 'run' | 'preview', ... }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const operation = body.operation || 'create';

    if (operation === 'run') {
      // Run all enabled rules against pending ideas
      const projectId = body.projectId as string | undefined;
      const ideas = projectId
        ? ideaDb.getIdeasByProject(projectId)
        : ideaDb.getIdeasByStatus('pending');

      const results = evaluateTriageRules(ideas, projectId);
      const totalAffected = results.reduce((sum, r) => sum + r.ideaIds.length, 0);

      return NextResponse.json({
        success: true,
        results,
        totalAffected,
      });
    }

    if (operation === 'preview') {
      const projectId = body.projectId as string | undefined;
      const ideas = projectId
        ? ideaDb.getIdeasByProject(projectId)
        : ideaDb.getIdeasByStatus('pending');

      const results = previewTriageRules(ideas, projectId);
      const totalWouldAffect = results.reduce((sum, r) => sum + r.ideaIds.length, 0);

      return NextResponse.json({
        success: true,
        results,
        totalWouldAffect,
      });
    }

    // Default: create a new rule
    const { name, description, action, conditions, projectId, enabled, priority } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    }
    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
    }

    const validation = validateConditions(conditions);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const rule = triageRuleDb.createRule({
      id: uuidv4(),
      project_id: projectId ?? null,
      name,
      description: description ?? null,
      action,
      conditions: JSON.stringify(conditions),
      enabled: enabled !== false,
      priority: priority ?? 0,
    });

    return NextResponse.json({ success: true, rule }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/triage-rules
 * Update an existing triage rule
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, action, conditions, enabled, priority } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    if (action && !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
    }

    if (conditions !== undefined) {
      const validation = validateConditions(conditions);
      if (!validation.valid) {
        return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
      }
    }

    const rule = triageRuleDb.updateRule(id, {
      name,
      description,
      action,
      conditions: conditions ? JSON.stringify(conditions) : undefined,
      enabled,
      priority,
    });

    if (!rule) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/triage-rules
 * Delete a triage rule by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const deleted = triageRuleDb.deleteRule(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
