import { NextRequest, NextResponse } from 'next/server';
import { generatePredictiveStandup } from '@/lib/standup/predictiveStandupEngine';
import { buildSprintPlan } from '@/lib/sprint/sprintPlanner';
import { logger } from '@/lib/logger';

/**
 * GET /api/sprint/plan?projectId=xxx&sprintDays=5
 *
 * Composes the existing predictive-standup outputs (recommendedTaskOrder +
 * velocityComparison) into a week-level sprint plan with a Monte Carlo
 * confidence band and burnout-aware day allocation.
 *
 * Returns SprintPlan from src/lib/sprint/sprintPlanner.ts plus a thin echo
 * of the source recommendations so the UI can hover/inspect tasks without
 * re-fetching the standup predict endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const sprintDaysRaw = searchParams.get('sprintDays');
    const sprintDays = sprintDaysRaw
      ? Math.max(1, Math.min(14, parseInt(sprintDaysRaw, 10) || 5))
      : 5;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const predictions = generatePredictiveStandup(projectId);
    const plan = buildSprintPlan(
      predictions.recommendedTaskOrder,
      predictions.velocityComparison.currentPeriod,
      sprintDays,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...plan,
        sprintDays,
        velocityTrend: predictions.velocityComparison.trend,
        velocityPercentChange: predictions.velocityComparison.percentChange,
      },
    });
  } catch (error) {
    logger.error('Error in GET /api/sprint/plan:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to build sprint plan' },
      { status: 500 }
    );
  }
}
