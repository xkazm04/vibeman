/**
 * Bridge API - Pull Tasks
 * GET: Pull pending tasks for passive device to execute
 */

import { NextRequest } from 'next/server';
import {
  requireBridgeAuth,
  bridgeSuccessResponse,
  bridgeErrorResponse,
} from '@/lib/bridge/auth';
import { devicePairDb, offloadQueueDb } from '@/app/db';
import { PullTasksResponse } from '@/app/db/models/offload.types';

export async function GET(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const devicePairId = searchParams.get('devicePairId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!devicePairId) {
      return bridgeErrorResponse('devicePairId query parameter is required', 400);
    }

    // Verify the pairing exists and is active
    const pair = devicePairDb.getById(devicePairId);

    if (!pair) {
      return bridgeErrorResponse('Device pair not found', 404);
    }

    if (pair.status !== 'paired') {
      return bridgeErrorResponse('Device pair is not active', 400);
    }

    // Get pending tasks
    const pendingTasks = offloadQueueDb.getPending(devicePairId, limit);

    // Mark them as synced
    if (pendingTasks.length > 0) {
      const taskIds = pendingTasks.map((t) => t.id);
      offloadQueueDb.markManySynced(taskIds);
    }

    // Update heartbeat
    devicePairDb.updateHeartbeat(devicePairId);

    const response: PullTasksResponse = {
      tasks: pendingTasks.map((task) => ({
        id: task.id,
        requirementName: task.requirement_name,
        requirementContent: task.requirement_content,
        priority: task.priority,
      })),
    };

    return bridgeSuccessResponse(response);
  } catch (error) {
    console.error('[Bridge/Offload/Pull] GET error:', error);
    return bridgeErrorResponse('Failed to pull tasks', 500);
  }
}
