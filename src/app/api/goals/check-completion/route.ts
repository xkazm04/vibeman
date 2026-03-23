/**
 * Goal Completion Check API
 * Checks if a newly created implementation log matches any in-progress goals
 * by context_id, and updates goal progress accordingly.
 *
 * Also provides GET for the frontend to fetch goals with pending completions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkGoalCompletion, getCompletionSuggestions } from '@/lib/goals/goalService';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/api-helpers/rateLimiter';

/**
 * POST - Check and update goal progress when an implementation log is created
 * Called as a fire-and-forget hook after implementation log creation
 */
export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, '/api/goals/check-completion', 'strict');
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const { contextId, projectId } = body;

    if (!contextId || !projectId) {
      return NextResponse.json(
        { success: false, error: 'contextId and projectId are required', matched: 0 },
        { status: 400 }
      );
    }

    const result = checkGoalCompletion(contextId, projectId, body.logTitle);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error checking goal completion:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to check goal completion' },
      { status: 500 }
    );
  }
}

/**
 * GET - Fetch goals with pending completion suggestions
 * Returns in-progress goals that have recent implementation logs
 * in their linked context, suggesting they may be ready for completion.
 */
export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request, '/api/goals/check-completion', 'strict');
  if (rateLimited) return rateLimited;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const suggestions = getCompletionSuggestions(projectId);

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    logger.error('Error fetching completion suggestions:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch completion suggestions' },
      { status: 500 }
    );
  }
}
