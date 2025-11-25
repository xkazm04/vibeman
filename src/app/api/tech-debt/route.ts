/**
 * Technical Debt API Endpoints
 * GET    /api/tech-debt - Get all tech debt for a project
 * POST   /api/tech-debt - Create new tech debt item
 * PATCH  /api/tech-debt - Update tech debt item
 * DELETE /api/tech-debt - Delete tech debt item
 */

import { NextRequest, NextResponse } from 'next/server';
import { techDebtDb } from '@/app/db';
import { logger } from '@/lib/logger';
import type {
  TechDebtCategory,
  TechDebtSeverity,
  TechDebtStatus
} from '@/app/db/models/tech-debt.types';

/**
 * GET /api/tech-debt
 * Fetch technical debt items for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Parse optional filters
    const statusFilter = searchParams.get('status')?.split(',') as TechDebtStatus[] | undefined;
    const severityFilter = searchParams.get('severity')?.split(',') as TechDebtSeverity[] | undefined;
    const categoryFilter = searchParams.get('category')?.split(',') as TechDebtCategory[] | undefined;

    const filters = {
      status: statusFilter,
      severity: severityFilter,
      category: categoryFilter
    };

    const techDebt = techDebtDb.getTechDebtByProject(projectId, filters);

    return NextResponse.json({ techDebt });
  } catch (error) {
    console.error('Failed to fetch tech debt', error);
    return NextResponse.json(
      { error: 'Failed to fetch tech debt', details: String(error) },
      { status: 500 }
    );
  }
}

interface CreateTechDebtBody {
  projectId: string;
  scanId?: string;
  category: TechDebtCategory;
  title: string;
  description: string;
  severity: TechDebtSeverity;
  riskScore: number;
  estimatedEffortHours?: number;
  impactScope?: string;
  technicalImpact?: string;
  businessImpact?: string;
  detectedBy: 'automated_scan' | 'manual_entry' | 'ai_analysis';
  detectionDetails?: string;
  filePaths?: string;
  status?: TechDebtStatus;
  remediationPlan?: string;
  remediationSteps?: string;
  estimatedCompletionDate?: string;
  backlogItemId?: string;
  goalId?: string;
}

/**
 * Helper: Validate required fields for tech debt creation
 */
function validateTechDebtBody(body: Partial<CreateTechDebtBody>): body is CreateTechDebtBody {
  return !!(
    body.projectId &&
    body.category &&
    body.title &&
    body.description &&
    body.severity &&
    body.riskScore !== undefined &&
    body.detectedBy
  );
}

/**
 * POST /api/tech-debt
 * Create a new technical debt item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<CreateTechDebtBody>;

    // Validate required fields
    if (!validateTechDebtBody(body)) {
      console.warn('Missing required fields for tech debt creation', body);
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const id = `tech-debt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newTechDebt = techDebtDb.createTechDebt({
      id,
      project_id: body.projectId,
      scan_id: body.scanId || null,
      category: body.category,
      title: body.title,
      description: body.description,
      severity: body.severity,
      risk_score: body.riskScore,
      estimated_effort_hours: body.estimatedEffortHours || null,
      impact_scope: body.impactScope ? JSON.parse(body.impactScope) : null,
      technical_impact: body.technicalImpact || null,
      business_impact: body.businessImpact || null,
      detected_by: body.detectedBy,
      detection_details: body.detectionDetails ? (typeof body.detectionDetails === 'string' ? JSON.parse(body.detectionDetails) : body.detectionDetails) : null,
      file_paths: body.filePaths ? JSON.parse(body.filePaths) : null,
      status: body.status || 'detected',
      remediation_plan: body.remediationPlan ? (typeof body.remediationPlan === 'string' ? JSON.parse(body.remediationPlan) : body.remediationPlan) : null,
      remediation_steps: body.remediationSteps ? (typeof body.remediationSteps === 'string' ? JSON.parse(body.remediationSteps) : body.remediationSteps) : null,
      estimated_completion_date: body.estimatedCompletionDate || null,
      backlog_item_id: body.backlogItemId || null,
      goal_id: body.goalId || null
    });

    console.log('Created tech debt item', { id, projectId: body.projectId });
    return NextResponse.json({ techDebt: newTechDebt }, { status: 201 });
  } catch (error) {
    console.error('Failed to create tech debt', error);
    return NextResponse.json(
      { error: 'Failed to create tech debt', details: String(error) },
      { status: 500 }
    );
  }
}

interface TechDebtUpdates {
  status?: TechDebtStatus;
  severity?: TechDebtSeverity;
  riskScore?: number;
  estimatedEffortHours?: number;
  remediationPlan?: string;
  remediationSteps?: string;
  estimatedCompletionDate?: string;
  backlogItemId?: string;
  goalId?: string;
  dismissalReason?: string;
}

/**
 * Helper: Convert camelCase updates to snake_case for database
 */
function convertUpdatesToDatabaseFormat(updates: TechDebtUpdates): Record<string, unknown> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.severity !== undefined) dbUpdates.severity = updates.severity;
  if (updates.riskScore !== undefined) dbUpdates.risk_score = updates.riskScore;
  if (updates.estimatedEffortHours !== undefined) dbUpdates.estimated_effort_hours = updates.estimatedEffortHours;
  if (updates.remediationPlan !== undefined) dbUpdates.remediation_plan = updates.remediationPlan;
  if (updates.remediationSteps !== undefined) dbUpdates.remediation_steps = updates.remediationSteps;
  if (updates.estimatedCompletionDate !== undefined) dbUpdates.estimated_completion_date = updates.estimatedCompletionDate;
  if (updates.backlogItemId !== undefined) dbUpdates.backlog_item_id = updates.backlogItemId;
  if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId;
  if (updates.dismissalReason !== undefined) dbUpdates.dismissal_reason = updates.dismissalReason;

  return dbUpdates;
}

/**
 * PATCH /api/tech-debt
 * Update an existing technical debt item
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body as { id?: string } & TechDebtUpdates;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Convert camelCase to snake_case for database
    const dbUpdates = convertUpdatesToDatabaseFormat(updates);

    const updatedTechDebt = techDebtDb.updateTechDebt(id, dbUpdates);

    if (!updatedTechDebt) {
      return NextResponse.json(
        { error: 'Tech debt item not found' },
        { status: 404 }
      );
    }

    console.log('Updated tech debt item', id);
    return NextResponse.json({ techDebt: updatedTechDebt });
  } catch (error) {
    console.error('Failed to update tech debt', error);
    return NextResponse.json(
      { error: 'Failed to update tech debt', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tech-debt
 * Delete a technical debt item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const deleted = techDebtDb.deleteTechDebt(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Tech debt item not found' },
        { status: 404 }
      );
    }

    console.log('Deleted tech debt item', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tech debt', error);
    return NextResponse.json(
      { error: 'Failed to delete tech debt', details: String(error) },
      { status: 500 }
    );
  }
}
