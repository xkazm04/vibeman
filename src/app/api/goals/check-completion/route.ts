/**
 * Goal Completion Check API
 * Checks if a newly created implementation log matches any in-progress goals
 * by context_id, and updates goal progress accordingly.
 *
 * Also provides GET for the frontend to fetch goals with pending completions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { goalDb, implementationLogDb, contextDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { processSignal } from '@/lib/goals/goalLifecycleEngine';
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
      return NextResponse.json({ success: true, matched: 0 });
    }

    // Find active goals linked to this context
    const matchingGoals = goalDb.getActiveGoalsByContextId(contextId);

    if (matchingGoals.length === 0) {
      return NextResponse.json({ success: true, matched: 0 });
    }

    // Count total implementation logs for this context to gauge progress
    const contextLogs = implementationLogDb.getLogsByContext(contextId);
    const testedCount = contextLogs.filter(l => l.tested === 1).length;
    const totalCount = contextLogs.length;

    // Calculate a simple progress metric:
    // Having at least 1 implementation log means work has started.
    // Progress scales with number of tested (accepted) logs.
    // Cap at 90% - only manual completion gets to 100%.
    const progress = totalCount > 0
      ? Math.min(Math.round((testedCount / Math.max(totalCount, 1)) * 80 + 10), 90)
      : 0;

    const updatedGoals: string[] = [];

    for (const goal of matchingGoals) {
      // Start the goal if it's still in 'open' status
      if (goal.status === 'open') {
        goalDb.updateGoal(goal.id, { status: 'in_progress' });
      }

      // Update progress
      goalDb.updateGoalProgress(goal.id, progress);
      updatedGoals.push(goal.id);
    }

    // Feed into lifecycle engine for autonomous progress tracking
    try {
      processSignal({
        projectId,
        signalType: 'implementation_log',
        contextId,
        sourceTitle: body.logTitle,
        description: `Implementation log created in context`,
        metadata: { totalLogs: totalCount, testedLogs: testedCount },
      });
    } catch (e) {
      // Lifecycle engine errors should not block the main flow
      logger.warn('Lifecycle engine signal failed:', { error: e });
    }

    logger.info('Goal-implementation link updated', {
      contextId,
      matchedGoals: updatedGoals.length,
      progress,
      totalLogs: totalCount,
      testedLogs: testedCount,
    });

    return NextResponse.json({
      success: true,
      matched: updatedGoals.length,
      goalIds: updatedGoals,
      progress,
    });
  } catch (error) {
    logger.error('Error checking goal completion:', { error });
    return NextResponse.json({ success: true, matched: 0 });
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

    const goals = goalDb.getGoalsByProject(projectId);
    const inProgressGoals = goals.filter(
      g => (g.status === 'in_progress' || g.status === 'open') && g.context_id
    );

    const suggestions: Array<{
      goalId: string;
      goalTitle: string;
      contextId: string;
      contextName: string | null;
      implementationCount: number;
      testedCount: number;
      progress: number;
      latestLogTitle: string | null;
    }> = [];

    for (const goal of inProgressGoals) {
      if (!goal.context_id) continue;

      const contextLogs = implementationLogDb.getLogsByContext(goal.context_id);
      if (contextLogs.length === 0) continue;

      const context = contextDb.getContextById(goal.context_id);
      const testedCount = contextLogs.filter(l => l.tested === 1).length;
      const progress = goal.progress || 0;

      suggestions.push({
        goalId: goal.id,
        goalTitle: goal.title,
        contextId: goal.context_id,
        contextName: context?.name || null,
        implementationCount: contextLogs.length,
        testedCount,
        progress,
        latestLogTitle: contextLogs[0]?.title || null,
      });
    }

    // Sort by progress descending (most likely to be complete first)
    suggestions.sort((a, b) => b.progress - a.progress);

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
