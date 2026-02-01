import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse } from '../helpers';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/claude-code/tasks - List all execution tasks
 *
 * RESTful endpoint for listing tasks.
 * Optionally filter by projectPath query param.
 *
 * Query params:
 * - projectPath?: string (filter tasks by project)
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');

    // If projectPath provided, filter by project; otherwise return all tasks
    const tasks = projectPath
      ? executionQueue.getProjectTasks(projectPath)
      : executionQueue.getAllTasks();

    return NextResponse.json({ tasks });
  } catch (error) {
    return errorResponse(error, 'Error in GET /api/claude-code/tasks');
  }
}

/**
 * DELETE /api/claude-code/tasks - Clear old completed tasks
 *
 * RESTful endpoint for cleaning up old tasks.
 */
async function handleDelete() {
  try {
    const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
    executionQueue.clearOldTasks();

    return successResponse({}, 'Old tasks cleared');
  } catch (error) {
    return errorResponse(error, 'Error in DELETE /api/claude-code/tasks');
  }
}

export const GET = withObservability(handleGet, '/api/claude-code/tasks');
export const DELETE = withObservability(handleDelete, '/api/claude-code/tasks');
