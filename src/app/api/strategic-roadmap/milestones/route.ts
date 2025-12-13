/**
 * Roadmap Milestones API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { roadmapMilestoneDb } from '@/app/db';
import type { DbRoadmapMilestone } from '@/app/db/models/strategic-roadmap.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/strategic-roadmap/milestones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const initiativeId = searchParams.get('initiativeId');
    const status = searchParams.get('status');

    if (!projectId && !initiativeId) {
      return NextResponse.json(
        { error: 'projectId or initiativeId is required' },
        { status: 400 }
      );
    }

    let milestones: DbRoadmapMilestone[];

    if (initiativeId) {
      milestones = roadmapMilestoneDb.getByInitiative(initiativeId);
    } else if (status && projectId) {
      milestones = roadmapMilestoneDb.getByStatus(projectId, status as DbRoadmapMilestone['status']);
    } else {
      milestones = roadmapMilestoneDb.getByProject(projectId!);
    }

    return NextResponse.json({ milestones });
  } catch (error) {
    logger.error('Error fetching milestones:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/strategic-roadmap/milestones
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      initiativeId,
      title,
      description,
      targetDate,
      quarterIndex,
      monthIndex,
      targetHealthScore,
      targetDebtReduction,
      targetVelocityImprovement,
      keyResults,
    } = body;

    if (!projectId || !title || !description || !targetDate || !quarterIndex || !monthIndex) {
      return NextResponse.json(
        { error: 'projectId, title, description, targetDate, quarterIndex, and monthIndex are required' },
        { status: 400 }
      );
    }

    const milestone = roadmapMilestoneDb.create({
      project_id: projectId,
      initiative_id: initiativeId || null,
      title,
      description,
      target_date: targetDate,
      quarter_index: quarterIndex,
      month_index: monthIndex,
      target_health_score: targetHealthScore || 70,
      target_debt_reduction: targetDebtReduction || 0,
      target_velocity_improvement: targetVelocityImprovement || 0,
      actual_health_score: null,
      actual_debt_reduction: null,
      actual_velocity_change: null,
      status: 'upcoming',
      key_results: JSON.stringify(keyResults || []),
      achieved_at: null,
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    logger.error('Error creating milestone:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create milestone' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/strategic-roadmap/milestones
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

    const dbUpdates: Partial<DbRoadmapMilestone> = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate;
    if (updates.quarterIndex !== undefined) dbUpdates.quarter_index = updates.quarterIndex;
    if (updates.monthIndex !== undefined) dbUpdates.month_index = updates.monthIndex;
    if (updates.targetHealthScore !== undefined) dbUpdates.target_health_score = updates.targetHealthScore;
    if (updates.targetDebtReduction !== undefined) dbUpdates.target_debt_reduction = updates.targetDebtReduction;
    if (updates.targetVelocityImprovement !== undefined) dbUpdates.target_velocity_improvement = updates.targetVelocityImprovement;
    if (updates.actualHealthScore !== undefined) dbUpdates.actual_health_score = updates.actualHealthScore;
    if (updates.actualDebtReduction !== undefined) dbUpdates.actual_debt_reduction = updates.actualDebtReduction;
    if (updates.actualVelocityChange !== undefined) dbUpdates.actual_velocity_change = updates.actualVelocityChange;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.keyResults !== undefined) dbUpdates.key_results = JSON.stringify(updates.keyResults);

    const milestone = roadmapMilestoneDb.update(id, dbUpdates);

    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ milestone });
  } catch (error) {
    logger.error('Error updating milestone:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/strategic-roadmap/milestones
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

    const deleted = roadmapMilestoneDb.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting milestone:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
      { status: 500 }
    );
  }
}
