/**
 * API Route: ROI Simulator - Simulations
 * CRUD operations for ROI simulations
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  roiSimulationDb,
  refactoringEconomicsDb,
} from '@/app/db';

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

    const simulations = roiSimulationDb.getByProject(projectId);

    return NextResponse.json({
      success: true,
      simulations,
    });
  } catch (error) {
    logger.error('Failed to get simulations:', { data: error });
    return NextResponse.json(
      { error: 'Failed to get simulations', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, ...data } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Get selected refactorings to calculate investment
    let totalInvestment = 0;
    let selectedIds: string[] = [];
    try {
      selectedIds = JSON.parse(data.selected_refactoring_ids || '[]');
      if (selectedIds.length > 0) {
        const refactorings = refactoringEconomicsDb.getByProject(project_id);
        totalInvestment = refactorings
          .filter(r => selectedIds.includes(r.id))
          .reduce((sum, r) => sum + r.calculated_cost, 0);
      }
    } catch {
      selectedIds = [];
    }

    const simulation = roiSimulationDb.create({
      project_id,
      name: data.name || 'New Simulation',
      description: data.description || null,
      simulation_type: data.simulation_type || 'baseline',
      time_horizon_months: data.time_horizon_months || 12,
      discount_rate: data.discount_rate ?? 0.1,
      team_size: data.team_size || 5,
      average_hourly_rate: data.average_hourly_rate || 100,
      feature_velocity_baseline: data.feature_velocity_baseline || 5,
      current_health_score: data.current_health_score || 50,
      current_debt_score: data.current_debt_score || 50,
      selected_refactoring_ids: data.selected_refactoring_ids || '[]',
      total_investment: totalInvestment,
      projected_velocity: '[]',
      projected_health_scores: '[]',
      projected_debt_scores: '[]',
      cumulative_roi: '[]',
      total_cost: 0,
      total_benefit: 0,
      overall_roi: 0,
      break_even_month: null,
      final_velocity_improvement: 0,
      final_health_improvement: 0,
      is_selected: 0,
      comparison_notes: data.comparison_notes || null,
    });

    return NextResponse.json({
      success: true,
      simulation,
    });
  } catch (error) {
    logger.error('Failed to create simulation:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create simulation', details: String(error) },
      { status: 500 }
    );
  }
}

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

    const deleted = roiSimulationDb.delete(id);

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    logger.error('Failed to delete simulation:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete simulation', details: String(error) },
      { status: 500 }
    );
  }
}
