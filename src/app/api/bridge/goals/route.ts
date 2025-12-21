/**
 * Bridge API - Goals
 * GET: List goals for a project
 * POST: Create a new goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';
import { bridgeEvents } from '@/lib/bridge/eventEmitter';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return bridgeErrorResponse('projectId is required', 400);
    }

    const goals = goalRepository.getGoalsByProject(projectId);

    return bridgeSuccessResponse({
      goals,
      total: goals.length,
    });
  } catch (error) {
    console.error('[Bridge/Goals] GET error:', error);
    return bridgeErrorResponse('Failed to fetch goals', 500);
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, name, description, contextId } = body;

    if (!projectId) {
      return bridgeErrorResponse('projectId is required', 400);
    }

    if (!name) {
      return bridgeErrorResponse('name is required', 400);
    }

    // Get max order index for positioning
    const maxOrder = goalRepository.getMaxOrderIndex(projectId);

    const goal = goalRepository.createGoal({
      id: uuidv4(),
      project_id: projectId,
      context_id: contextId || undefined,
      title: name,
      description: description || undefined,
      status: 'open',
      order_index: maxOrder + 1,
    });

    // Emit event for SSE clients
    bridgeEvents.emit('goal_created', {
      goalId: goal.id,
      name: goal.title,
      projectId: goal.project_id,
    }, projectId);

    return bridgeSuccessResponse({ goal }, 201);
  } catch (error) {
    console.error('[Bridge/Goals] POST error:', error);
    return bridgeErrorResponse('Failed to create goal', 500);
  }
}
