/**
 * Bridge API - Goal by ID
 * GET: Get a single goal
 * DELETE: Delete a goal
 */

import { NextRequest } from 'next/server';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';
import { bridgeEvents } from '@/lib/bridge/eventEmitter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const goal = goalRepository.getGoalById(id);

    if (!goal) {
      return bridgeErrorResponse('Goal not found', 404);
    }

    return bridgeSuccessResponse({ goal });
  } catch (error) {
    console.error('[Bridge/Goals] GET by ID error:', error);
    return bridgeErrorResponse('Failed to fetch goal', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    // Get goal first to access projectId for event
    const goal = goalRepository.getGoalById(id);
    if (!goal) {
      return bridgeErrorResponse('Goal not found', 404);
    }

    const deleted = goalRepository.deleteGoal(id);

    if (!deleted) {
      return bridgeErrorResponse('Failed to delete goal', 500);
    }

    // Emit event for SSE clients
    bridgeEvents.emit('goal_deleted', {
      goalId: id,
      name: goal.title,
      projectId: goal.project_id,
    }, goal.project_id);

    return bridgeSuccessResponse({ success: true });
  } catch (error) {
    console.error('[Bridge/Goals] DELETE error:', error);
    return bridgeErrorResponse('Failed to delete goal', 500);
  }
}
