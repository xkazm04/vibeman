/**
 * API Route: ROI Simulator - Run Simulation
 * Executes a simulation and calculates projected outcomes
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  roiSimulationDb,
  refactoringEconomicsDb,
} from '@/app/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { simulationId } = body;

    if (!simulationId) {
      return NextResponse.json(
        { error: 'simulationId is required' },
        { status: 400 }
      );
    }

    const simulation = roiSimulationDb.getById(simulationId);
    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    // Get selected refactorings
    let selectedIds: string[] = [];
    try {
      selectedIds = JSON.parse(simulation.selected_refactoring_ids || '[]');
    } catch {
      selectedIds = [];
    }

    const allRefactorings = refactoringEconomicsDb.getByProject(simulation.project_id);
    const selectedRefactorings = allRefactorings.filter(r => selectedIds.includes(r.id));

    // Calculate totals
    const totalCost = selectedRefactorings.reduce((sum, r) => sum + r.calculated_cost, 0);
    const totalBenefit = selectedRefactorings.reduce((sum, r) => sum + r.calculated_benefit, 0);
    const avgVelocityImprovement = selectedRefactorings.length > 0
      ? selectedRefactorings.reduce((sum, r) => sum + r.velocity_improvement, 0) / selectedRefactorings.length
      : 0;

    // Simulate monthly projections
    const months = simulation.time_horizon_months;
    const baseVelocity = simulation.feature_velocity_baseline;
    const baseHealth = simulation.current_health_score;
    const baseDebt = simulation.current_debt_score;

    const projectedVelocity: number[] = [];
    const projectedHealth: number[] = [];
    const projectedDebt: number[] = [];
    const cumulativeROI: number[] = [];

    let cumulativeBenefit = 0;
    let breakEvenMonth: number | null = null;

    for (let month = 1; month <= months; month++) {
      // Velocity improves gradually as refactorings complete
      const completionFactor = Math.min(1, month / (selectedRefactorings.length * 2 + 1));
      const velocityGain = avgVelocityImprovement * completionFactor;
      projectedVelocity.push(Math.round((baseVelocity * (1 + velocityGain / 100)) * 10) / 10);

      // Health improves as technical improvements are made
      const healthGain = selectedRefactorings.reduce((sum, r) => {
        return sum + (r.maintainability_score_after - r.maintainability_score_before) * completionFactor / 100;
      }, 0);
      projectedHealth.push(Math.round(Math.min(100, baseHealth + healthGain * 50)));

      // Debt decreases over time
      const debtReduction = selectedRefactorings.reduce((sum, r) => {
        return sum + (r.code_complexity_before - r.code_complexity_after) * completionFactor / 100;
      }, 0);
      projectedDebt.push(Math.round(Math.max(0, baseDebt - debtReduction * 30)));

      // ROI accumulates monthly
      const monthlyBenefit = totalBenefit / 12 * completionFactor;
      cumulativeBenefit += monthlyBenefit;
      const roi = totalCost > 0 ? ((cumulativeBenefit - totalCost) / totalCost) * 100 : 0;
      cumulativeROI.push(Math.round(roi * 10) / 10);

      // Check for break even
      if (breakEvenMonth === null && cumulativeBenefit >= totalCost) {
        breakEvenMonth = month;
      }
    }

    const overallROI = totalCost > 0 ? ((totalBenefit - totalCost) / totalCost) * 100 : 0;
    const finalVelocityImprovement = projectedVelocity.length > 0
      ? ((projectedVelocity[projectedVelocity.length - 1] - baseVelocity) / baseVelocity) * 100
      : 0;
    const finalHealthImprovement = projectedHealth.length > 0
      ? projectedHealth[projectedHealth.length - 1] - baseHealth
      : 0;

    // Update simulation with results
    const updated = roiSimulationDb.update(simulationId, {
      projected_velocity: JSON.stringify(projectedVelocity),
      projected_health_scores: JSON.stringify(projectedHealth),
      projected_debt_scores: JSON.stringify(projectedDebt),
      cumulative_roi: JSON.stringify(cumulativeROI),
      total_cost: Math.round(totalCost * 100) / 100,
      total_benefit: Math.round(totalBenefit * 100) / 100,
      overall_roi: Math.round(overallROI * 10) / 10,
      break_even_month: breakEvenMonth,
      final_velocity_improvement: Math.round(finalVelocityImprovement * 10) / 10,
      final_health_improvement: Math.round(finalHealthImprovement),
      total_investment: Math.round(totalCost * 100) / 100,
    });

    return NextResponse.json({
      success: true,
      simulation: updated,
      results: {
        projectedVelocity,
        projectedHealth,
        projectedDebt,
        cumulativeROI,
        totalCost,
        totalBenefit,
        overallROI,
        breakEvenMonth,
      },
    });
  } catch (error) {
    logger.error('Failed to run simulation:', { data: error });
    return NextResponse.json(
      { error: 'Failed to run simulation', details: String(error) },
      { status: 500 }
    );
  }
}
