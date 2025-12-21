/**
 * Bridge API - Task Status
 * GET: Get status of all offloaded tasks
 * POST: Update status of a task (called by passive device)
 */

import { NextRequest } from 'next/server';
import {
  requireBridgeAuth,
  bridgeSuccessResponse,
  bridgeErrorResponse,
} from '@/lib/bridge/auth';
import { devicePairDb, offloadQueueDb } from '@/app/db';
import {
  UpdateTaskStatusRequest,
  TaskStatusResponse,
  OffloadTaskStatus,
} from '@/app/db/models/offload.types';

export async function GET(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const devicePairId = searchParams.get('devicePairId');

    if (!devicePairId) {
      return bridgeErrorResponse('devicePairId query parameter is required', 400);
    }

    // Verify the pairing exists
    const pair = devicePairDb.getById(devicePairId);

    if (!pair) {
      return bridgeErrorResponse('Device pair not found', 404);
    }

    // Get all tasks for this pair
    const tasks = offloadQueueDb.getByDevicePairId(devicePairId);

    // Also get stats
    const stats = offloadQueueDb.getStats(devicePairId);

    const response: TaskStatusResponse & { stats: typeof stats } = {
      tasks: tasks.map((task) => ({
        id: task.id,
        requirementName: task.requirement_name,
        status: task.status,
        startedAt: task.started_at,
        completedAt: task.completed_at,
        resultSummary: task.result_summary,
        errorMessage: task.error_message,
      })),
      stats,
    };

    return bridgeSuccessResponse(response);
  } catch (error) {
    console.error('[Bridge/Offload/Status] GET error:', error);
    return bridgeErrorResponse('Failed to get task status', 500);
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as UpdateTaskStatusRequest;

    if (!body.taskId) {
      return bridgeErrorResponse('taskId is required', 400);
    }
    if (!body.status) {
      return bridgeErrorResponse('status is required', 400);
    }

    const validStatuses: OffloadTaskStatus[] = [
      'pending',
      'synced',
      'running',
      'completed',
      'failed',
    ];
    if (!validStatuses.includes(body.status)) {
      return bridgeErrorResponse(
        `status must be one of: ${validStatuses.join(', ')}`,
        400
      );
    }

    // Get the task to verify it exists
    const task = offloadQueueDb.getById(body.taskId);

    if (!task) {
      return bridgeErrorResponse('Task not found', 404);
    }

    // Update the task status
    const updatedTask = offloadQueueDb.updateStatus(body.taskId, body.status, {
      resultSummary: body.resultSummary,
      errorMessage: body.errorMessage,
    });

    if (!updatedTask) {
      return bridgeErrorResponse('Failed to update task status', 500);
    }

    // Update heartbeat on the device pair
    devicePairDb.updateHeartbeat(task.device_pair_id);

    return bridgeSuccessResponse({
      success: true,
      task: {
        id: updatedTask.id,
        requirementName: updatedTask.requirement_name,
        status: updatedTask.status,
        startedAt: updatedTask.started_at,
        completedAt: updatedTask.completed_at,
        resultSummary: updatedTask.result_summary,
        errorMessage: updatedTask.error_message,
      },
    });
  } catch (error) {
    console.error('[Bridge/Offload/Status] POST error:', error);
    return bridgeErrorResponse('Failed to update task status', 500);
  }
}
