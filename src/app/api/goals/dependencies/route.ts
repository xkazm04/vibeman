import { NextRequest, NextResponse } from 'next/server';
import { goalDependencyRepository } from '@/app/db/repositories/goal-dependency.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';
import { withObservability } from '@/lib/observability/middleware';
import { logger } from '@/lib/logger';
import type { GoalDependencyType } from '@/app/db/models/types';

// GET /api/goals/dependencies?projectId=xxx or ?goalId=xxx
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const goalId = searchParams.get('goalId');

    if (goalId) {
      const deps = goalDependencyRepository.getAllForGoal(goalId);
      return NextResponse.json({ dependencies: deps });
    }

    if (projectId) {
      const deps = goalDependencyRepository.getByProject(projectId);
      const blocked = goalDependencyRepository.getBlockedGoals(projectId);
      return NextResponse.json({ dependencies: deps, blockedGoals: blocked });
    }

    return createErrorResponse('projectId or goalId is required', 400);
  } catch (error) {
    logger.error('Error in GET /api/goals/dependencies:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// POST /api/goals/dependencies
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentGoalId, childGoalId, relationshipType = 'blocks' } = body as {
      parentGoalId: string;
      childGoalId: string;
      relationshipType?: GoalDependencyType;
    };

    if (!parentGoalId || !childGoalId) {
      return createErrorResponse('parentGoalId and childGoalId are required', 400);
    }

    if (parentGoalId === childGoalId) {
      return createErrorResponse('A goal cannot depend on itself', 400);
    }

    // Verify both goals exist
    const parent = goalRepository.getGoalById(parentGoalId);
    const child = goalRepository.getGoalById(childGoalId);
    if (!parent) return notFoundResponse('Parent goal');
    if (!child) return notFoundResponse('Child goal');

    // Cycle detection
    if (relationshipType === 'blocks' && goalDependencyRepository.wouldCreateCycle(parentGoalId, childGoalId)) {
      return createErrorResponse('Adding this dependency would create a circular dependency', 400);
    }

    const dep = goalDependencyRepository.create(parentGoalId, childGoalId, relationshipType);
    return NextResponse.json({ dependency: dep });
  } catch (error) {
    logger.error('Error in POST /api/goals/dependencies:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

// DELETE /api/goals/dependencies?id=xxx
async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Dependency ID is required', 400);
    }

    const success = goalDependencyRepository.delete(id);
    if (!success) {
      return notFoundResponse('Dependency');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/goals/dependencies:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

export const GET = withObservability(handleGet, '/api/goals/dependencies');
export const POST = withObservability(handlePost, '/api/goals/dependencies');
export const DELETE = withObservability(handleDelete, '/api/goals/dependencies');
