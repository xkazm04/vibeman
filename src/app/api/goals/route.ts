import { NextRequest, NextResponse } from 'next/server';
import { goalDb } from '@/app/db';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { createErrorResponse, handleError, notFoundResponse } from '@/lib/api-helpers';
import { fireAndForgetSync, syncGoalToSupabase, deleteGoalFromSupabase } from '@/lib/supabase/goalSync';
import { fireAndForgetGitHubSync, syncGoalToGitHub, deleteGoalFromGitHub } from '@/lib/github';

// GET /api/goals?projectId=xxx or /api/goals?id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const goalId = searchParams.get('id');

    // If goalId is provided, fetch single goal
    if (goalId) {
      const goal = goalDb.getGoalById(goalId);
      
      if (!goal) {
        return notFoundResponse('Goal');
      }
      
      return NextResponse.json({ goal });
    }

    // Otherwise, fetch all goals for project
    if (!projectId) {
      return createErrorResponse('Project ID or Goal ID is required', 400);
    }

    const goals = goalDb.getGoalsByProject(projectId);
    return NextResponse.json({ goals });
  } catch (error) {
    logger.error('Error in GET /api/goals:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// POST /api/goals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, contextId, title, description, status = 'open', orderIndex } = body;

    if (!projectId || !title) {
      return createErrorResponse('Project ID and title are required', 400);
    }

    // If no order index provided, get the next available one
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      finalOrderIndex = goalDb.getMaxOrderIndex(projectId) + 1;
    }

    const goal = goalDb.createGoal({
      id: randomUUID(),
      project_id: projectId,
      context_id: contextId,
      title,
      description,
      status,
      order_index: finalOrderIndex
    });

    // Fire-and-forget sync to Supabase
    fireAndForgetSync(
      () => syncGoalToSupabase(goal),
      `Create goal ${goal.id}`
    );

    // Fire-and-forget sync to GitHub Projects
    fireAndForgetGitHubSync(
      () => syncGoalToGitHub(goal),
      `Create goal ${goal.id} in GitHub`
    );

    return NextResponse.json({ goal });
  } catch (error) {
    logger.error('Error in POST /api/goals:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// PUT /api/goals
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, status, orderIndex, contextId } = body;

    if (!id) {
      return createErrorResponse('Goal ID is required', 400);
    }

    const updateData: {
      title?: string;
      description?: string;
      status?: 'open' | 'in_progress' | 'done';
      order_index?: number;
      context_id?: string | null;
    } = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (orderIndex !== undefined) updateData.order_index = orderIndex;
    if (contextId !== undefined) updateData.context_id = contextId;

    const goal = goalDb.updateGoal(id, updateData);

    if (!goal) {
      return notFoundResponse('Goal');
    }

    // Fire-and-forget sync to Supabase
    fireAndForgetSync(
      () => syncGoalToSupabase(goal),
      `Update goal ${goal.id}`
    );

    // Fire-and-forget sync to GitHub Projects
    fireAndForgetGitHubSync(
      () => syncGoalToGitHub(goal),
      `Update goal ${goal.id} in GitHub`
    );

    return NextResponse.json({ goal });
  } catch (error) {
    logger.error('Error in PUT /api/goals:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// DELETE /api/goals?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Goal ID is required', 400);
    }

    // Get the goal first to capture github_item_id before deletion
    const goal = goalDb.getGoalById(id);
    const githubItemId = goal?.github_item_id || null;

    const success = goalDb.deleteGoal(id);

    if (!success) {
      return notFoundResponse('Goal');
    }

    // Fire-and-forget sync to Supabase
    fireAndForgetSync(
      () => deleteGoalFromSupabase(id),
      `Delete goal ${id}`
    );

    // Fire-and-forget sync to GitHub Projects
    fireAndForgetGitHubSync(
      () => deleteGoalFromGitHub(id, githubItemId),
      `Delete goal ${id} from GitHub`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/goals:', { error });
    return createErrorResponse('Internal server error', 500);
  }
} 