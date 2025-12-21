/**
 * Bridge API - Push Tasks
 * POST: Push tasks from active device to passive device's queue
 */

import { NextRequest } from 'next/server';
import {
  requireBridgeAuth,
  bridgeSuccessResponse,
  bridgeErrorResponse,
} from '@/lib/bridge/auth';
import { devicePairDb, offloadQueueDb } from '@/app/db';
import { PushTasksRequest, PushTasksResponse } from '@/app/db/models/offload.types';

export async function POST(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as PushTasksRequest;

    if (!body.devicePairId) {
      return bridgeErrorResponse('devicePairId is required', 400);
    }
    if (!body.tasks || !Array.isArray(body.tasks) || body.tasks.length === 0) {
      return bridgeErrorResponse('tasks array is required and must not be empty', 400);
    }

    // Verify the pairing exists and is active
    const pair = devicePairDb.getById(body.devicePairId);

    if (!pair) {
      return bridgeErrorResponse('Device pair not found', 404);
    }

    if (pair.status !== 'paired') {
      return bridgeErrorResponse('Device pair is not active', 400);
    }

    // Validate each task
    for (let i = 0; i < body.tasks.length; i++) {
      const task = body.tasks[i];
      if (!task.requirementName) {
        return bridgeErrorResponse(`Task ${i}: requirementName is required`, 400);
      }
      if (!task.requirementContent) {
        return bridgeErrorResponse(`Task ${i}: requirementContent is required`, 400);
      }
    }

    // Create all tasks in the queue
    const taskIds = offloadQueueDb.createMany(
      body.tasks.map((task) => ({
        devicePairId: body.devicePairId,
        projectId: pair.project_id,
        requirementName: task.requirementName,
        requirementContent: task.requirementContent,
        priority: task.priority ?? 5,
      }))
    );

    // Update heartbeat
    devicePairDb.updateHeartbeat(body.devicePairId);

    const response: PushTasksResponse = {
      queued: taskIds.length,
      taskIds,
    };

    return bridgeSuccessResponse(response, 201);
  } catch (error) {
    console.error('[Bridge/Offload/Push] POST error:', error);
    return bridgeErrorResponse('Failed to push tasks', 500);
  }
}
