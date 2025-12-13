/**
 * Roadmap Simulations API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { roadmapSimulationDb } from '@/app/db';
import type { DbRoadmapSimulation } from '@/app/db/models/strategic-roadmap.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/strategic-roadmap/simulations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const selectedOnly = searchParams.get('selectedOnly');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (selectedOnly === 'true') {
      const simulation = roadmapSimulationDb.getSelected(projectId);
      return NextResponse.json({ simulation });
    }

    const simulations = roadmapSimulationDb.getByProject(projectId);
    return NextResponse.json({ simulations });
  } catch (error) {
    logger.error('Error fetching simulations:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch simulations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/strategic-roadmap/simulations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      name,
      description,
      simulationType,
      inputParameters,
      assumptions,
      projectedInitiatives,
      projectedMilestones,
      projectedHealthScores,
      projectedVelocity,
      totalDebtReduction,
      velocityImprovement,
      riskReduction,
      isSelected,
    } = body;

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'projectId and name are required' },
        { status: 400 }
      );
    }

    const simulation = roadmapSimulationDb.create({
      project_id: projectId,
      name,
      description: description || '',
      simulation_type: simulationType || 'baseline',
      input_parameters: JSON.stringify(inputParameters || {}),
      assumptions: JSON.stringify(assumptions || []),
      projected_initiatives: JSON.stringify(projectedInitiatives || []),
      projected_milestones: JSON.stringify(projectedMilestones || []),
      projected_health_scores: JSON.stringify(projectedHealthScores || []),
      projected_velocity: JSON.stringify(projectedVelocity || []),
      total_debt_reduction: totalDebtReduction || 0,
      velocity_improvement: velocityImprovement || 0,
      risk_reduction: riskReduction || 0,
      is_selected: isSelected ? 1 : 0,
      comparison_notes: null,
    });

    return NextResponse.json({ simulation }, { status: 201 });
  } catch (error) {
    logger.error('Error creating simulation:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create simulation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/strategic-roadmap/simulations
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, select, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Handle selection
    if (select === true) {
      const simulation = roadmapSimulationDb.select(id);
      if (!simulation) {
        return NextResponse.json(
          { error: 'Simulation not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ simulation });
    }

    // Convert to db format
    const dbUpdates: Partial<DbRoadmapSimulation> = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.simulationType !== undefined) dbUpdates.simulation_type = updates.simulationType;
    if (updates.inputParameters !== undefined) dbUpdates.input_parameters = JSON.stringify(updates.inputParameters);
    if (updates.assumptions !== undefined) dbUpdates.assumptions = JSON.stringify(updates.assumptions);
    if (updates.projectedInitiatives !== undefined) dbUpdates.projected_initiatives = JSON.stringify(updates.projectedInitiatives);
    if (updates.projectedMilestones !== undefined) dbUpdates.projected_milestones = JSON.stringify(updates.projectedMilestones);
    if (updates.projectedHealthScores !== undefined) dbUpdates.projected_health_scores = JSON.stringify(updates.projectedHealthScores);
    if (updates.projectedVelocity !== undefined) dbUpdates.projected_velocity = JSON.stringify(updates.projectedVelocity);
    if (updates.totalDebtReduction !== undefined) dbUpdates.total_debt_reduction = updates.totalDebtReduction;
    if (updates.velocityImprovement !== undefined) dbUpdates.velocity_improvement = updates.velocityImprovement;
    if (updates.riskReduction !== undefined) dbUpdates.risk_reduction = updates.riskReduction;
    if (updates.comparisonNotes !== undefined) dbUpdates.comparison_notes = updates.comparisonNotes;

    const simulation = roadmapSimulationDb.update(id, dbUpdates);

    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ simulation });
  } catch (error) {
    logger.error('Error updating simulation:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update simulation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/strategic-roadmap/simulations
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

    const deleted = roadmapSimulationDb.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting simulation:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete simulation' },
      { status: 500 }
    );
  }
}
