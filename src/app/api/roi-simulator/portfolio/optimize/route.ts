/**
 * API Route: ROI Simulator - Portfolio Optimize
 * Runs portfolio optimization algorithm
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  portfolioOptimizationDb,
  refactoringEconomicsDb,
  type DbPortfolioOptimization,
} from '@/app/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, optimization_type, budget_constraint, refactoring_ids } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Get all refactorings
    const allRefactorings = refactoringEconomicsDb.getByProject(project_id);

    // Filter to selected ones if provided
    const candidateRefactorings = refactoring_ids?.length > 0
      ? allRefactorings.filter(r => refactoring_ids.includes(r.id))
      : allRefactorings.filter(r => r.status === 'proposed' || r.status === 'approved');

    // Sort based on optimization type
    let sorted = [...candidateRefactorings];
    switch (optimization_type) {
      case 'max_roi':
        sorted.sort((a, b) => b.roi_percentage - a.roi_percentage);
        break;
      case 'max_velocity':
        sorted.sort((a, b) => b.velocity_improvement - a.velocity_improvement);
        break;
      case 'min_risk':
        sorted.sort((a, b) =>
          (a.security_risk_before - a.security_risk_after) -
          (b.security_risk_before - b.security_risk_after)
        );
        sorted.reverse();
        break;
      case 'balanced':
        // Balance ROI, velocity, and risk
        sorted.sort((a, b) => {
          const scoreA = a.roi_percentage * 0.4 + a.velocity_improvement * 0.3 +
                        (a.security_risk_before - a.security_risk_after) * 0.3;
          const scoreB = b.roi_percentage * 0.4 + b.velocity_improvement * 0.3 +
                        (b.security_risk_before - b.security_risk_after) * 0.3;
          return scoreB - scoreA;
        });
        break;
      case 'pareto':
        // Keep as-is for pareto analysis
        break;
    }

    // Select items within budget constraint using greedy algorithm
    const selectedItems: Array<{ id: string; order: number; allocation: number }> = [];
    let totalAllocatedHours = 0;
    let expectedROI = 0;
    let expectedVelocityGain = 0;
    let expectedRiskReduction = 0;

    for (const refactoring of sorted) {
      if (budget_constraint > 0 && totalAllocatedHours + refactoring.estimated_hours > budget_constraint) {
        continue;
      }

      selectedItems.push({
        id: refactoring.id,
        order: selectedItems.length + 1,
        allocation: refactoring.estimated_hours,
      });

      totalAllocatedHours += refactoring.estimated_hours;
      expectedROI += refactoring.roi_percentage;
      expectedVelocityGain += refactoring.velocity_improvement;
      expectedRiskReduction += (refactoring.security_risk_before - refactoring.security_risk_after);
    }

    // Calculate Pareto frontier for multi-objective optimization
    const paretoFrontier: Array<{ roi: number; velocity: number; risk: number; items: string[] }> = [];

    if (optimization_type === 'pareto') {
      // Generate a few alternative solutions
      const solutions = [
        { type: 'max_roi', items: sorted.sort((a, b) => b.roi_percentage - a.roi_percentage).slice(0, 5) },
        { type: 'max_velocity', items: sorted.sort((a, b) => b.velocity_improvement - a.velocity_improvement).slice(0, 5) },
        { type: 'min_risk', items: sorted.sort((a, b) => b.security_risk_before - a.security_risk_before).slice(0, 5) },
      ];

      for (const sol of solutions) {
        paretoFrontier.push({
          roi: sol.items.reduce((sum, r) => sum + r.roi_percentage, 0),
          velocity: sol.items.reduce((sum, r) => sum + r.velocity_improvement, 0),
          risk: sol.items.reduce((sum, r) => sum + (r.security_risk_before - r.security_risk_after), 0),
          items: sol.items.map(r => r.id),
        });
      }
    }

    const avgROI = selectedItems.length > 0 ? expectedROI / selectedItems.length : 0;
    const avgVelocity = selectedItems.length > 0 ? expectedVelocityGain / selectedItems.length : 0;
    const avgRisk = selectedItems.length > 0 ? expectedRiskReduction / selectedItems.length : 0;

    // Create portfolio optimization record
    const portfolio = portfolioOptimizationDb.create({
      project_id,
      name: `${optimization_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Optimization`,
      optimization_type: optimization_type as DbPortfolioOptimization['optimization_type'],
      budget_constraint: budget_constraint || 0,
      time_constraint_months: 12,
      selected_items: JSON.stringify(selectedItems),
      total_allocated_hours: totalAllocatedHours,
      expected_roi: Math.round(avgROI * 10) / 10,
      expected_velocity_gain: Math.round(avgVelocity * 10) / 10,
      expected_risk_reduction: Math.round(avgRisk * 10) / 10,
      pareto_frontier: JSON.stringify(paretoFrontier),
      trade_off_analysis: JSON.stringify({
        roiVsVelocity: 'Higher ROI items may have lower immediate velocity impact',
        riskVsEffort: 'High-risk items often require more careful implementation',
        recommendation: optimization_type === 'balanced'
          ? 'Balanced approach provides good mix of benefits'
          : `Optimized for ${optimization_type.replace('_', ' ')}`,
      }),
      constraints_used: JSON.stringify({
        budget_hours: budget_constraint,
        candidate_count: candidateRefactorings.length,
        selected_count: selectedItems.length,
      }),
      optimization_algorithm: 'greedy',
      status: 'ready',
    });

    return NextResponse.json({
      success: true,
      portfolio,
    });
  } catch (error) {
    logger.error('Failed to optimize portfolio:', { data: error });
    return NextResponse.json(
      { error: 'Failed to optimize portfolio', details: String(error) },
      { status: 500 }
    );
  }
}
