/**
 * API Route: ROI Simulator - Debt Paydown Strategies
 * CRUD operations for debt paydown strategies
 */

import { NextRequest, NextResponse } from 'next/server';
import { debtPaydownStrategyDb, refactoringEconomicsDb } from '@/app/db';
import { logger } from '@/lib/logger';

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

    const strategies = debtPaydownStrategyDb.getByProject(projectId);

    return NextResponse.json({
      success: true,
      strategies,
    });
  } catch (error) {
    logger.error('Failed to get strategies:', { data: error });
    return NextResponse.json(
      { error: 'Failed to get strategies', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, strategy_type, monthly_capacity_hours, paydown_aggressiveness } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Get all refactorings to build debt items
    const refactorings = refactoringEconomicsDb.getByProject(project_id);
    const debtItems = refactorings
      .filter(r => r.status !== 'completed' && r.status !== 'rejected')
      .map((r, index) => ({
        id: r.id,
        source_type: r.source_type,
        priority: r.priority_score,
        order: index + 1,
      }));

    // Sort based on strategy type
    switch (strategy_type) {
      case 'snowball':
        // Smallest items first (quick wins)
        debtItems.sort((a, b) => {
          const refA = refactorings.find(r => r.id === a.id)!;
          const refB = refactorings.find(r => r.id === b.id)!;
          return refA.estimated_hours - refB.estimated_hours;
        });
        break;
      case 'avalanche':
        // Highest impact first
        debtItems.sort((a, b) => {
          const refA = refactorings.find(r => r.id === a.id)!;
          const refB = refactorings.find(r => r.id === b.id)!;
          return refB.calculated_benefit - refA.calculated_benefit;
        });
        break;
      case 'highest_roi':
        // Best ROI first
        debtItems.sort((a, b) => {
          const refA = refactorings.find(r => r.id === a.id)!;
          const refB = refactorings.find(r => r.id === b.id)!;
          return refB.roi_percentage - refA.roi_percentage;
        });
        break;
      case 'highest_risk':
        // Riskiest items first
        debtItems.sort((a, b) => {
          const refA = refactorings.find(r => r.id === a.id)!;
          const refB = refactorings.find(r => r.id === b.id)!;
          return refB.security_risk_before - refA.security_risk_before;
        });
        break;
    }

    // Update order after sorting
    debtItems.forEach((item, index) => {
      item.order = index + 1;
    });

    const totalDebtHours = refactorings
      .filter(r => debtItems.some(d => d.id === r.id))
      .reduce((sum, r) => sum + r.estimated_hours, 0);

    const totalDebtCost = refactorings
      .filter(r => debtItems.some(d => d.id === r.id))
      .reduce((sum, r) => sum + r.calculated_cost, 0);

    // Calculate paydown schedule
    const monthlyHours = monthly_capacity_hours || 40;
    const aggressiveness = paydown_aggressiveness ?? 0.3;
    const hoursForDebt = monthlyHours * aggressiveness;

    const paydownSchedule: Array<{ month: number; items: string[]; hours: number; remaining: number }> = [];
    let remainingHours = totalDebtHours;
    let currentMonth = 1;
    let itemIndex = 0;

    while (remainingHours > 0 && currentMonth <= 24) {
      const monthItems: string[] = [];
      let monthHours = 0;

      while (monthHours < hoursForDebt && itemIndex < debtItems.length) {
        const item = debtItems[itemIndex];
        const refactoring = refactorings.find(r => r.id === item.id)!;

        if (monthHours + refactoring.estimated_hours <= hoursForDebt) {
          monthItems.push(item.id);
          monthHours += refactoring.estimated_hours;
          remainingHours -= refactoring.estimated_hours;
          itemIndex++;
        } else {
          break;
        }
      }

      if (monthItems.length > 0) {
        paydownSchedule.push({
          month: currentMonth,
          items: monthItems,
          hours: Math.round(monthHours * 10) / 10,
          remaining: Math.round(remainingHours * 10) / 10,
        });
      }

      currentMonth++;
    }

    // Calculate completion date
    const completionDate = remainingHours <= 0
      ? new Date(Date.now() + (currentMonth - 1) * 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Calculate equilibrium (sustainable debt level)
    const avgNewDebtPerMonth = 10; // Assume 10 hours of new debt per month
    const equilibriumLevel = avgNewDebtPerMonth / Math.max(0.01, aggressiveness);

    // Create strategy
    const strategy = debtPaydownStrategyDb.create({
      project_id,
      name: body.name || `${strategy_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Strategy`,
      description: body.description || null,
      strategy_type: strategy_type || 'balanced',
      debt_items: JSON.stringify(debtItems),
      total_debt_hours: totalDebtHours,
      total_debt_cost: totalDebtCost,
      monthly_capacity_hours: monthlyHours,
      paydown_aggressiveness: aggressiveness,
      feature_pressure: body.feature_pressure ?? 0.5,
      paydown_schedule: JSON.stringify(paydownSchedule),
      projected_completion_date: completionDate,
      projected_roi_curve: '[]',
      equilibrium_debt_level: equilibriumLevel,
      debt_accumulation_rate: avgNewDebtPerMonth,
      net_paydown_rate: Math.max(0, hoursForDebt - avgNewDebtPerMonth),
      status: 'draft',
      is_active: 0,
      completed_at: null,
    });

    return NextResponse.json({
      success: true,
      strategy,
    });
  } catch (error) {
    logger.error('Failed to create strategy:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create strategy', details: String(error) },
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

    const deleted = debtPaydownStrategyDb.delete(id);

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    logger.error('Failed to delete strategy:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete strategy', details: String(error) },
      { status: 500 }
    );
  }
}
