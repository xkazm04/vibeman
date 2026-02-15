/**
 * Goal Lifecycle Engine API
 *
 * GET  - Get lifecycle status for a goal or project summary
 * POST - Record a signal, catch-up progress, decompose into sub-goals, or confirm/dismiss completion
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  processSignal,
  getGoalLifecycleStatus,
  getProjectLifecycleSummary,
  confirmGoalCompletion,
  dismissAutoCompletion,
  catchUpGoalProgress,
} from '@/lib/goals/goalLifecycleEngine';
import { goalSubGoalRepository } from '@/app/db/repositories/goal-lifecycle.repository';
import { goalSignalRepository } from '@/app/db/repositories/goal-lifecycle.repository';
import type { GoalSignalType } from '@/app/db/models/types';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/goals/lifecycle?goalId=xxx or ?projectId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');
    const projectId = searchParams.get('projectId');

    if (goalId) {
      const status = getGoalLifecycleStatus(goalId);
      if (!status) return errorResponse('Goal not found', 404);
      return NextResponse.json({ success: true, data: status });
    }

    if (projectId) {
      const summary = getProjectLifecycleSummary(projectId);
      return NextResponse.json({ success: true, data: summary });
    }

    return errorResponse('goalId or projectId is required', 400);
  } catch (error) {
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/goals/lifecycle
 *
 * Actions:
 * - signal: Record a lifecycle signal
 * - catch_up: Scan for unlinked progress
 * - confirm_complete: Confirm auto-completion
 * - dismiss_complete: Dismiss auto-completion suggestion
 * - add_sub_goals: Add sub-goals to a goal
 * - update_sub_goal: Update a sub-goal's status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'signal': {
        const { projectId, signalType, contextId, sourceId, sourceTitle, description, metadata } = body;
        if (!projectId || !signalType) {
          return errorResponse('projectId and signalType are required', 400);
        }

        const result = processSignal({
          projectId,
          signalType: signalType as GoalSignalType,
          contextId,
          sourceId,
          sourceTitle,
          description,
          metadata,
        });

        return NextResponse.json({ success: true, ...result });
      }

      case 'catch_up': {
        const { projectId } = body;
        if (!projectId) return errorResponse('projectId is required', 400);

        const result = catchUpGoalProgress(projectId);
        return NextResponse.json({ success: true, ...result });
      }

      case 'confirm_complete': {
        const { goalId } = body;
        if (!goalId) return errorResponse('goalId is required', 400);

        const goal = confirmGoalCompletion(goalId);
        return NextResponse.json({ success: true, goal });
      }

      case 'dismiss_complete': {
        const { goalId } = body;
        if (!goalId) return errorResponse('goalId is required', 400);

        dismissAutoCompletion(goalId);
        return NextResponse.json({ success: true });
      }

      case 'add_sub_goals': {
        const { goalId, projectId, subGoals } = body;
        if (!goalId || !projectId || !Array.isArray(subGoals)) {
          return errorResponse('goalId, projectId, and subGoals array are required', 400);
        }

        const created = goalSubGoalRepository.createBatch(
          subGoals.map((sg: { title: string; description?: string }, i: number) => ({
            parent_goal_id: goalId,
            project_id: projectId,
            title: sg.title,
            description: sg.description,
            order_index: i,
          }))
        );

        return NextResponse.json({ success: true, subGoals: created });
      }

      case 'update_sub_goal': {
        const { subGoalId, updates } = body;
        if (!subGoalId) return errorResponse('subGoalId is required', 400);

        const updated = goalSubGoalRepository.update(subGoalId, updates);
        return NextResponse.json({ success: true, subGoal: updated });
      }

      case 'delete_sub_goals': {
        const { goalId } = body;
        if (!goalId) return errorResponse('goalId is required', 400);

        const deleted = goalSubGoalRepository.deleteByParent(goalId);
        return NextResponse.json({ success: true, deleted });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    return errorResponse('Internal server error', 500);
  }
}
