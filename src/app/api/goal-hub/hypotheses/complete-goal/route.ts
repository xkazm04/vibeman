/**
 * Complete Goal Hypotheses API
 * Marks all hypotheses for a goal as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { goalHubDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-helpers';

/**
 * POST /api/goal-hub/hypotheses/complete-goal
 * Mark all hypotheses for a goal as completed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalId } = body;

    if (!goalId) {
      return createErrorResponse('goalId is required', 400);
    }

    // Get all hypotheses for this goal
    const hypotheses = goalHubDb.hypotheses.getByGoalId(goalId);

    if (hypotheses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hypotheses found for this goal',
        updated: 0,
      });
    }

    // Update each hypothesis to completed
    let updated = 0;

    for (const hypothesis of hypotheses) {
      if (hypothesis.status !== 'completed') {
        goalHubDb.hypotheses.update(hypothesis.id, {
          status: 'completed',
        });
        updated++;
      }
    }

    // Update goal progress
    goalHubDb.extensions.updateProgress(goalId);

    logger.info('Completed all hypotheses for goal', {
      goalId,
      total: hypotheses.length,
      updated,
    });

    return NextResponse.json({
      success: true,
      message: `Marked ${updated} hypotheses as completed`,
      total: hypotheses.length,
      updated,
    });
  } catch (error) {
    logger.error('Error in POST /api/goal-hub/hypotheses/complete-goal:', {
      data: error,
      message: error instanceof Error ? error.message : 'Unknown',
    });
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
