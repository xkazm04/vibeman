/**
 * Strategic Roadmap API Routes
 * Main endpoint for roadmap summary and initiatives
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  strategicInitiativeDb,
  roadmapSummaryDb,
} from '@/app/db';
import type { DbStrategicInitiative } from '@/app/db/models/strategic-roadmap.types';

import { logger } from '@/lib/logger';
/**
 * GET /api/strategic-roadmap
 * Get roadmap summary or list of initiatives
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type'); // 'summary' | 'initiatives'
    const status = searchParams.get('status');
    const initiativeType = searchParams.get('initiativeType');
    const month = searchParams.get('month');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Return summary by default
    if (type === 'summary' || !type) {
      const summary = roadmapSummaryDb.getSummary(projectId);
      return NextResponse.json({ summary });
    }

    // Filter initiatives
    let initiatives: DbStrategicInitiative[];

    if (status) {
      initiatives = strategicInitiativeDb.getByStatus(projectId, status as DbStrategicInitiative['status']);
    } else if (initiativeType) {
      initiatives = strategicInitiativeDb.getByType(projectId, initiativeType as DbStrategicInitiative['initiative_type']);
    } else if (month) {
      initiatives = strategicInitiativeDb.getByMonth(projectId, parseInt(month, 10));
    } else {
      initiatives = strategicInitiativeDb.getByProject(projectId);
    }

    return NextResponse.json({ initiatives });
  } catch (error) {
    logger.error('Error fetching roadmap:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch roadmap data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/strategic-roadmap
 * Create a new strategic initiative
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      title,
      description,
      initiativeType,
      priority,
      businessImpactScore,
      technicalImpactScore,
      riskReductionScore,
      velocityImpactScore,
      estimatedEffortHours,
      estimatedComplexity,
      targetQuarter,
      targetMonth,
      dependsOn,
      relatedTechDebtIds,
      relatedGoalIds,
      relatedIdeaIds,
    } = body;

    if (!projectId || !title || !description || !initiativeType || !targetQuarter) {
      return NextResponse.json(
        { error: 'projectId, title, description, initiativeType, and targetQuarter are required' },
        { status: 400 }
      );
    }

    const initiative = strategicInitiativeDb.create({
      project_id: projectId,
      title,
      description,
      initiative_type: initiativeType,
      priority: priority || 5,
      business_impact_score: businessImpactScore || 50,
      technical_impact_score: technicalImpactScore || 50,
      risk_reduction_score: riskReductionScore || 0,
      velocity_impact_score: velocityImpactScore || 0,
      estimated_effort_hours: estimatedEffortHours || 0,
      estimated_complexity: estimatedComplexity || 'medium',
      target_quarter: targetQuarter,
      target_month: targetMonth || 1,
      depends_on: JSON.stringify(dependsOn || []),
      blocks: '[]',
      status: 'proposed',
      confidence_score: 50,
      simulated_outcomes: '{}',
      related_tech_debt_ids: JSON.stringify(relatedTechDebtIds || []),
      related_goal_ids: JSON.stringify(relatedGoalIds || []),
      related_idea_ids: JSON.stringify(relatedIdeaIds || []),
      completed_at: null,
    });

    return NextResponse.json({ initiative }, { status: 201 });
  } catch (error) {
    logger.error('Error creating initiative:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create initiative' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/strategic-roadmap
 * Update an existing initiative
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
    const dbUpdates: Partial<DbStrategicInitiative> = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.initiativeType !== undefined) dbUpdates.initiative_type = updates.initiativeType;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.businessImpactScore !== undefined) dbUpdates.business_impact_score = updates.businessImpactScore;
    if (updates.technicalImpactScore !== undefined) dbUpdates.technical_impact_score = updates.technicalImpactScore;
    if (updates.riskReductionScore !== undefined) dbUpdates.risk_reduction_score = updates.riskReductionScore;
    if (updates.velocityImpactScore !== undefined) dbUpdates.velocity_impact_score = updates.velocityImpactScore;
    if (updates.estimatedEffortHours !== undefined) dbUpdates.estimated_effort_hours = updates.estimatedEffortHours;
    if (updates.estimatedComplexity !== undefined) dbUpdates.estimated_complexity = updates.estimatedComplexity;
    if (updates.targetQuarter !== undefined) dbUpdates.target_quarter = updates.targetQuarter;
    if (updates.targetMonth !== undefined) dbUpdates.target_month = updates.targetMonth;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.confidenceScore !== undefined) dbUpdates.confidence_score = updates.confidenceScore;
    if (updates.dependsOn !== undefined) dbUpdates.depends_on = JSON.stringify(updates.dependsOn);
    if (updates.blocks !== undefined) dbUpdates.blocks = JSON.stringify(updates.blocks);
    if (updates.simulatedOutcomes !== undefined) dbUpdates.simulated_outcomes = JSON.stringify(updates.simulatedOutcomes);
    if (updates.relatedTechDebtIds !== undefined) dbUpdates.related_tech_debt_ids = JSON.stringify(updates.relatedTechDebtIds);
    if (updates.relatedGoalIds !== undefined) dbUpdates.related_goal_ids = JSON.stringify(updates.relatedGoalIds);
    if (updates.relatedIdeaIds !== undefined) dbUpdates.related_idea_ids = JSON.stringify(updates.relatedIdeaIds);

    const initiative = strategicInitiativeDb.update(id, dbUpdates);

    if (!initiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ initiative });
  } catch (error) {
    logger.error('Error updating initiative:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update initiative' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/strategic-roadmap
 * Delete an initiative
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

    const deleted = strategicInitiativeDb.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting initiative:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete initiative' },
      { status: 500 }
    );
  }
}
