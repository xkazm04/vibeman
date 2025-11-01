/**
 * Technical Debt API Endpoints
 * GET    /api/tech-debt - Get all tech debt for a project
 * POST   /api/tech-debt - Create new tech debt item
 * PATCH  /api/tech-debt - Update tech debt item
 * DELETE /api/tech-debt - Delete tech debt item
 */

import { NextRequest, NextResponse } from 'next/server';
import { techDebtDb } from '@/app/db';
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
    console.error('Error fetching tech debt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tech debt', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tech-debt
 * Create a new technical debt item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      scanId,
      category,
      title,
      description,
      severity,
      riskScore,
      estimatedEffortHours,
      impactScope,
      technicalImpact,
      businessImpact,
      detectedBy,
      detectionDetails,
      filePaths,
      status,
      remediationPlan,
      remediationSteps,
      estimatedCompletionDate,
      backlogItemId,
      goalId
    } = body;

    // Validate required fields
    if (!projectId || !category || !title || !description || !severity || riskScore === undefined || !detectedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const id = `tech-debt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newTechDebt = techDebtDb.createTechDebt({
      id,
      project_id: projectId,
      scan_id: scanId || null,
      category,
      title,
      description,
      severity,
      risk_score: riskScore,
      estimated_effort_hours: estimatedEffortHours || null,
      impact_scope: impactScope || null,
      technical_impact: technicalImpact || null,
      business_impact: businessImpact || null,
      detected_by: detectedBy,
      detection_details: detectionDetails || null,
      file_paths: filePaths || null,
      status: status || 'detected',
      remediation_plan: remediationPlan || null,
      remediation_steps: remediationSteps || null,
      estimated_completion_date: estimatedCompletionDate || null,
      backlog_item_id: backlogItemId || null,
      goal_id: goalId || null
    });

    return NextResponse.json({ techDebt: newTechDebt }, { status: 201 });
  } catch (error) {
    console.error('Error creating tech debt:', error);
    return NextResponse.json(
      { error: 'Failed to create tech debt', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tech-debt
 * Update an existing technical debt item
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Convert camelCase to snake_case for database
    const dbUpdates: any = {};
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

    const updatedTechDebt = techDebtDb.updateTechDebt(id, dbUpdates);

    if (!updatedTechDebt) {
      return NextResponse.json(
        { error: 'Tech debt item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ techDebt: updatedTechDebt });
  } catch (error) {
    console.error('Error updating tech debt:', error);
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tech debt:', error);
    return NextResponse.json(
      { error: 'Failed to delete tech debt', details: String(error) },
      { status: 500 }
    );
  }
}
