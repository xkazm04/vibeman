import { NextRequest, NextResponse } from 'next/server';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
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
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';
import type { GoalResponse, GoalsListResponse, GoalMutationResponse, GoalDeleteResponse } from '@/lib/api-types/goals';
import type { GoalStatus } from '@/types/goalStatus';
import { GoalCreateBodySchema, GoalUpdateBodySchema } from '@/lib/api/schemas/goals';

/** Coarse progress signal (0–100) derived from a goal's lifecycle status. */
function goalProgressForStatus(status: GoalStatus | string | undefined): number {
  switch (status) {
    case 'done': return 100;
    case 'in_progress': return 50;
    case 'undecided': return 25;
    default: return 0; // open, rejected
  }
}

// GET /api/goals?projectId=xxx or /api/goals?id=xxx
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('id');

    // If goalId is provided, fetch single goal
    if (goalId) {
      const goal = goalRepository.getGoalById(goalId);

      if (!goal) {
        return notFoundResponse('Goal');
      }

      return NextResponse.json({ goal } satisfies GoalResponse);
    }

    // Parse project filter (supports single, multi, or all)
    const projectFilter = parseProjectIds(searchParams);

    if (projectFilter.mode === 'single') {
      const accessDenied = checkProjectAccess(projectFilter.projectId!, request);
      if (accessDenied) return accessDenied;

      const goals = goalRepository.getGoalsByProject(projectFilter.projectId!);
      return NextResponse.json({ goals } satisfies GoalsListResponse);
    }

    if (projectFilter.mode === 'multi') {
      const goals = projectFilter.projectIds!.flatMap(pid => goalRepository.getGoalsByProject(pid));
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
    const rawBody = await request.json();
    const parsed = GoalCreateBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return createErrorResponse(
        `Invalid request body: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        400
      );
    }
    const {
      projectId,
      contextId,
      title,
      description,
      status,
      orderIndex,
      createAnalysis,
      projectPath: requestProjectPath,
    } = parsed.data;

    // Verify caller has access to the project
    const accessDenied = checkProjectAccess(projectId, request);
    if (accessDenied) return accessDenied;

    // If no order index provided, get the next available one
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      finalOrderIndex = goalRepository.getMaxOrderIndex(projectId) + 1;
    }

    const goal = goalRepository.createGoal({
      id: randomUUID(),
      project_id: projectId,
      context_id: contextId,
      title,
      description,
      status,
      order_index: finalOrderIndex
    });

    // Record brain signal: goal created (goal lifecycle → WEIGHT_GOAL_NO_TRANSITION)
    try {
      signalCollector.recordGoalLifecycleSignal(projectId, {
        goalId: goal.id,
        goalTitle: goal.title,
        signalType: 'goal_created',
        progress: goalProgressForStatus(goal.status),
        contextId: contextId || null,
        contextName: title,
      });
    } catch {
      // Signal recording must never break the main flow
    }

    // Fire-and-forget all syncs in parallel instead of sequentially
    Promise.allSettled([
      // Sync to Supabase
      Promise.resolve().then(() => fireAndForgetSync(
        () => syncGoalToSupabase(goal),
        `Create goal ${goal.id}`
      )),
      // Sync to GitHub Projects
      Promise.resolve().then(() => fireAndForgetGitHubSync(
        () => syncGoalToGitHub(goal),
        `Create goal ${goal.id} in GitHub`
      )),
      // Goal analysis (creates Claude Code requirement) - defer context lookup into async body
      createAnalysis ? Promise.resolve().then(() => {
        const effectiveProjectPath = requestProjectPath || projectDb.getProject(projectId)?.path;

        logger.info('Goal analysis check:', {
          createAnalysis,
          projectId,
          requestProjectPath,
          effectiveProjectPath,
          pathSource: requestProjectPath ? 'request' : 'database'
        });

        if (effectiveProjectPath) {
          let contextName: string | undefined;
          let contextFiles: string[] | undefined;

          if (contextId) {
            const context = contextRepository.getContextById(contextId);
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
      }) : Promise.resolve(),
    ]);

    return NextResponse.json({ goal } satisfies GoalMutationResponse);
  } catch (error) {
    logger.error('Error in POST /api/goals:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// PUT /api/goals
async function handlePut(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = GoalUpdateBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return createErrorResponse(
        `Invalid request body: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        400
      );
    }
    const { id, title, description, status, orderIndex, contextId } = parsed.data;

    // Verify goal exists and caller has project access
    const existingGoal = goalRepository.getGoalById(id);
    if (!existingGoal) {
      return notFoundResponse('Goal');
    }
    const accessDenied = checkProjectAccess(existingGoal.project_id, request);
    if (accessDenied) return accessDenied;

    const updateData: {
      title?: string;
      description?: string;
      status?: GoalStatus;
      order_index?: number;
      context_id?: string | null;
    } = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (orderIndex !== undefined) updateData.order_index = orderIndex;
    if (contextId !== undefined) updateData.context_id = contextId;

    const goal = goalRepository.updateGoal(id, updateData, existingGoal.status as GoalStatus);

    if (!goal) {
      return notFoundResponse('Goal');
    }

    // Record brain signal: goal state change (WEIGHT_GOAL_TRANSITION when the
    // status actually moved, giving the goal-transition weight real data).
    if (status !== undefined && status !== existingGoal.status) {
      try {
        const isComplete = status === 'done';
        signalCollector.recordGoalLifecycleSignal(goal.project_id, {
          goalId: goal.id,
          goalTitle: goal.title,
          signalType: isComplete ? 'goal_completed' : 'goal_state_change',
          transition: { from: existingGoal.status, to: status },
          progress: goalProgressForStatus(status),
          contextId: goal.context_id || null,
          contextName: goal.title,
        });
      } catch {
        // Signal recording must never break the main flow
      }
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
    const goal = goalRepository.getGoalById(id);
    const githubItemId = goal?.github_item_id || null;

    // Verify goal exists and caller has project access
    if (!goal) {
      return notFoundResponse('Goal');
    }
    const accessDenied = checkProjectAccess(goal.project_id, request);
    if (accessDenied) return accessDenied;

    const success = goalRepository.deleteGoal(id);

    if (!success) {
      return notFoundResponse('Goal');
    }

    // Record brain signal: goal deleted (lifecycle, no transition)
    try {
      signalCollector.recordGoalLifecycleSignal(goal.project_id, {
        goalId: goal.id,
        goalTitle: goal.title,
        signalType: 'goal_deleted',
        progress: goalProgressForStatus(goal.status),
        contextId: goal.context_id || null,
        contextName: goal.title,
      });
    } catch {
      // Signal recording must never break the main flow
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