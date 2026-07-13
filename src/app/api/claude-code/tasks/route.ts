import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-errors';
import { withObservability } from '@/lib/observability/middleware';
import type { TaskOutcome } from '@/app/db/repositories/task-outcome.repository';

/**
 * GET /api/claude-code/tasks - List all execution tasks
 *
 * RESTful endpoint for listing tasks.
 * Optionally filter by projectPath or projectId query param.
 *
 * Each task is enriched with its persisted `outcome` (migration 237) when one
 * exists — files touched, duration, status, and a summary — so the TaskRunner
 * post-completion panel keeps working after the in-memory task and terminal run
 * events have been garbage-collected. Completed tasks that are gone from the
 * in-memory queue (page reload / server restart) are re-materialised from their
 * persisted outcome so their history is not lost.
 *
 * Query params:
 * - projectPath?: string (filter tasks by project path)
 * - projectId?: string (filter tasks by project ID)
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const projectId = searchParams.get('projectId');

    const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');

    // Filter by projectPath or projectId if provided; otherwise return all tasks
    const tasks = projectPath
      ? executionQueue.getProjectTasks(projectPath)
      : projectId
        ? executionQueue.getTasksByProjectId(projectId)
        : executionQueue.getAllTasks();

    // Load persisted outcomes for the requested scope (best-effort).
    let outcomes: TaskOutcome[] = [];
    try {
      const { taskOutcomeRepository } = await import('@/app/db/repositories/task-outcome.repository');
      if (projectPath) outcomes = taskOutcomeRepository.listByProjectPath(projectPath);
      else if (projectId) outcomes = taskOutcomeRepository.listByProjectId(projectId);
    } catch {
      outcomes = [];
    }

    const outcomeByTaskId = new Map(outcomes.map((o) => [o.taskId, o]));
    const liveTaskIds = new Set(tasks.map((t) => t.id));

    // Enrich in-memory tasks with their persisted outcome.
    const enriched = tasks.map((task) => ({
      ...task,
      outcome: outcomeByTaskId.get(task.id) ?? null,
    }));

    // Re-materialise finished tasks that have been GC'd from the in-memory queue
    // but still have a persisted outcome, so their history survives a reload.
    const revived = outcomes
      .filter((o) => !liveTaskIds.has(o.taskId))
      .map((o) => ({
        id: o.taskId,
        projectPath: o.projectPath ?? projectPath ?? '',
        projectId: o.projectId ?? projectId ?? undefined,
        requirementName: o.requirementName,
        status: (o.status === 'completed' ? 'completed'
          : o.status === 'session-limit' ? 'session-limit'
          : 'failed') as 'completed' | 'failed' | 'session-limit',
        progress: [] as string[],
        provider: o.provider ?? undefined,
        model: o.model ?? undefined,
        endTime: o.updatedAt,
        error: o.status !== 'completed' ? (o.summary ?? undefined) : undefined,
        output: o.status === 'completed' ? (o.summary ?? undefined) : undefined,
        outcome: o,
      }));

    return NextResponse.json({ tasks: [...enriched, ...revived] });
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
