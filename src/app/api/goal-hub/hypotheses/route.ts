/**
 * Goal Hypotheses API
 * CRUD operations for goal hypotheses
 */

import { NextRequest, NextResponse } from 'next/server';
import { goalHubDb } from '@/app/db';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';

/**
 * GET /api/goal-hub/hypotheses?goalId=xxx
 * Get all hypotheses for a goal
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');
    const hypothesisId = searchParams.get('id');

    if (hypothesisId) {
      const hypothesis = goalHubDb.hypotheses.getById(hypothesisId);
      if (!hypothesis) {
        return notFoundResponse('Hypothesis');
      }
      return NextResponse.json({ hypothesis });
    }

    if (!goalId) {
      return createErrorResponse('goalId is required', 400);
    }

    let hypotheses;
    let counts;
    try {
      hypotheses = goalHubDb.hypotheses.getByGoalId(goalId);
      counts = goalHubDb.hypotheses.getCounts(goalId);
    } catch (dbError) {
      logger.error('Database error in GET hypotheses:', { data: dbError, message: dbError instanceof Error ? dbError.message : 'Unknown' });
      return createErrorResponse(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown'}`, 500);
    }

    return NextResponse.json({
      hypotheses,
      counts,
    });
  } catch (error) {
    logger.error('Error in GET /api/goal-hub/hypotheses:', { data: error });
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/goal-hub/hypotheses
 * Create a new hypothesis
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error('JSON parse error in hypotheses API:', {
        error: parseError instanceof Error ? parseError.message : 'Unknown'
      });
      return createErrorResponse(
        `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
        400
      );
    }
    const {
      goalId,
      projectId,
      title,
      statement,
      reasoning,
      category,
      priority,
      agentSource,
    } = body;

    if (!goalId || !projectId || !title || !statement) {
      return createErrorResponse('goalId, projectId, title, and statement are required', 400);
    }

    const hypothesis = goalHubDb.hypotheses.create({
      id: randomUUID(),
      goalId,
      projectId,
      title,
      statement,
      reasoning,
      category,
      priority,
      agentSource,
    });

    // Update goal progress
    goalHubDb.extensions.updateProgress(goalId);

    return NextResponse.json({ hypothesis }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/goal-hub/hypotheses:', { data: error });
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * PUT /api/goal-hub/hypotheses
 * Update a hypothesis
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return createErrorResponse('Hypothesis ID is required', 400);
    }

    const hypothesis = goalHubDb.hypotheses.update(id, updates);

    if (!hypothesis) {
      return notFoundResponse('Hypothesis');
    }

    // Update goal progress if status changed
    if (updates.status) {
      goalHubDb.extensions.updateProgress(hypothesis.goalId);
    }

    return NextResponse.json({ hypothesis });
  } catch (error) {
    logger.error('Error in PUT /api/goal-hub/hypotheses:', { data: error });
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/goal-hub/hypotheses?id=xxx
 * Delete a hypothesis
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Hypothesis ID is required', 400);
    }

    // Get the hypothesis first to know the goal ID
    const hypothesis = goalHubDb.hypotheses.getById(id);
    if (!hypothesis) {
      return notFoundResponse('Hypothesis');
    }

    const goalId = hypothesis.goalId;
    const success = goalHubDb.hypotheses.delete(id);

    if (success) {
      // Update goal progress after deletion
      goalHubDb.extensions.updateProgress(goalId);
    }

    return NextResponse.json({ success });
  } catch (error) {
    logger.error('Error in DELETE /api/goal-hub/hypotheses:', { data: error });
    return createErrorResponse('Internal server error', 500);
  }
}
