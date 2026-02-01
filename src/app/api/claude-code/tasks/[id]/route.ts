import { NextRequest } from 'next/server';
import { errorResponse } from '../../helpers';
import { getTaskStatus } from '../../taskStatusHandler';
import { withObservability } from '@/lib/observability/middleware';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/claude-code/tasks/:id - Get task status
 *
 * RESTful endpoint for getting the status of a specific task.
 * Returns task details including progress, activity, and output.
 */
async function handleGet(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: taskId } = await context.params;

    if (!taskId) {
      return errorResponse(new Error('Task ID is required'), 'Missing task ID');
    }

    return getTaskStatus(taskId);
  } catch (error) {
    return errorResponse(error, 'Error in GET /api/claude-code/tasks/:id');
  }
}

export const GET = withObservability(handleGet, '/api/claude-code/tasks/[id]');
