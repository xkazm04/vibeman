import { NextRequest, NextResponse } from 'next/server';
import { goalDb, contextDb } from '@/app/db';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';
import { fireAndForgetSync, syncGoalToSupabase, deleteGoalFromSupabase } from '@/lib/supabase/goalSync';
import { fireAndForgetGitHubSync, syncGoalToGitHub, deleteGoalFromGitHub } from '@/lib/github';
import { projectDb } from '@/lib/project_database';
import { fireAndForgetGoalAnalysis } from '@/lib/goals';
import { withObservability } from '@/lib/observability/middleware';
import { signalCollector } from '@/lib/brain/signalCollector';
import { parseProjectIds } from '@/lib/api-helpers/projectFilter';
import type { GoalResponse, GoalsListResponse, GoalMutationResponse, GoalDeleteResponse } from '@/lib/api-types/goals';

// GET /api/goals?projectId=xxx or /api/goals?id=xxx
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('id');

    // If goalId is provided, fetch single goal
    if (goalId) {
      const goal = goalDb.getGoalById(goalId);

      if (!goal) {
        return notFoundResponse('Goal');
      }

      return NextResponse.json({ goal } satisfies GoalResponse);
    }

    // Parse project filter (supports single, multi, or all)
    const projectFilter = parseProjectIds(searchParams);

    if (projectFilter.mode === 'single') {
      const goals = goalDb.getGoalsByProject(projectFilter.projectId!);
      return NextResponse.json({ goals } satisfies GoalsListResponse);
    }

    if (projectFilter.mode === 'multi') {
      const goals = projectFilter.projectIds!.flatMap(pid => goalDb.getGoalsByProject(pid));
      return NextResponse.json({ goals } satisfies GoalsListResponse);
    }

    // 'all' mode - projectId required for goals unless multi-project
    return createErrorResponse('Project ID or Goal ID is required', 400);
  } catch (error) {
    logger.error('Error in GET /api/goals:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// POST /api/goals
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      contextId,
      title,
      description,
      status = 'open',
      orderIndex,
      createAnalysis = true,
      projectPath: requestProjectPath  // Accept projectPath from frontend (preferred)
    } = body;

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

    // Record brain signal: goal created
    try {
      signalCollector.recordContextFocus(projectId, {
        contextId: contextId || projectId,
        contextName: title,
        duration: 0,
        actions: ['create_goal'],
      });
    } catch {
      // Signal recording must never break the main flow
    }

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

    // Fire-and-forget goal analysis (creates Claude Code requirement)
    if (createAnalysis) {
      // Use projectPath from request (correct local path) if provided,
      // otherwise fall back to DB lookup (may have relative/incorrect path)
      const effectiveProjectPath = requestProjectPath || projectDb.getProject(projectId)?.path;

      logger.info('Goal analysis check:', {
        createAnalysis,
        projectId,
        requestProjectPath,
        effectiveProjectPath,
        pathSource: requestProjectPath ? 'request' : 'database'
      });

      if (effectiveProjectPath) {
        // Get context info if available
        let contextName: string | undefined;
        let contextFiles: string[] | undefined;

        if (contextId) {
          const context = contextDb.getContextById(contextId);
          if (context) {
            contextName = context.name;
            try {
              contextFiles = JSON.parse(context.file_paths || '[]');
            } catch {
              contextFiles = [];
            }
          }
        }

        logger.info('Creating goal analysis requirement:', {
          goalId: goal.id,
          goalTitle: goal.title,
          projectPath: effectiveProjectPath,
          contextName,
        });

        fireAndForgetGoalAnalysis(
          {
            goal,
            projectPath: effectiveProjectPath,
            contextName,
            contextFiles,
          },
          `Create analysis for goal ${goal.id}`
        );
      } else {
        logger.warn('Cannot create goal analysis - project path not found:', {
          projectId,
          requestProjectPath,
        });
      }
    }

    return NextResponse.json({ goal } satisfies GoalMutationResponse);
  } catch (error) {
    logger.error('Error in POST /api/goals:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// PUT /api/goals
async function handlePut(request: NextRequest) {
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

    return NextResponse.json({ goal } satisfies GoalMutationResponse);
  } catch (error) {
    logger.error('Error in PUT /api/goals:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// DELETE /api/goals?id=xxx
async function handleDelete(request: NextRequest) {
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

    return NextResponse.json({ success: true } satisfies GoalDeleteResponse);
  } catch (error) {
    logger.error('Error in DELETE /api/goals:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/goals');
export const POST = withObservability(handlePost, '/api/goals');
export const PUT = withObservability(handlePut, '/api/goals');
export const DELETE = withObservability(handleDelete, '/api/goals'); 