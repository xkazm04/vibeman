/**
 * TaskRunner Test Utilities
 *
 * Utility functions for testing TaskRunner components.
 * Provides helpers for rendering, assertions, and common test patterns.
 */

import type { ProjectRequirement } from '../lib/types';
import type { BatchState, TaskState, BatchId } from '../store/taskRunnerStore';
import {
  isTaskQueued,
  isTaskRunning,
  isTaskCompleted,
  isTaskFailed,
  isBatchIdle,
  isBatchRunning,
  isBatchPaused,
  isBatchCompleted,
  type TaskStatusUnion,
  type BatchStatusUnion,
} from '../lib/types';

// ============================================================================
// Requirement Helpers
// ============================================================================

/**
 * Get requirement ID in the standard format
 */
export function getRequirementId(req: ProjectRequirement): string {
  return `${req.projectId}:${req.requirementName}`;
}

/**
 * Group requirements by project ID
 */
export function groupRequirementsByProject(
  requirements: ProjectRequirement[]
): Record<string, ProjectRequirement[]> {
  return requirements.reduce(
    (groups, req) => {
      if (!groups[req.projectId]) {
        groups[req.projectId] = [];
      }
      groups[req.projectId].push(req);
      return groups;
    },
    {} as Record<string, ProjectRequirement[]>
  );
}

/**
 * Filter requirements by status
 */
export function filterRequirementsByStatus(
  requirements: ProjectRequirement[],
  statuses: ProjectRequirement['status'][]
): ProjectRequirement[] {
  return requirements.filter((req) => statuses.includes(req.status));
}

/**
 * Get selectable requirements (not running or queued)
 */
export function getSelectableRequirements(
  requirements: ProjectRequirement[]
): ProjectRequirement[] {
  return requirements.filter((req) => req.status !== 'running' && req.status !== 'queued');
}

/**
 * Count requirements by status
 */
export function countRequirementsByStatus(
  requirements: ProjectRequirement[]
): Record<ProjectRequirement['status'], number> {
  const counts: Record<ProjectRequirement['status'], number> = {
    idle: 0,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    'session-limit': 0,
  };

  requirements.forEach((req) => {
    counts[req.status]++;
  });

  return counts;
}

// ============================================================================
// Batch Helpers
// ============================================================================

/**
 * Get batch progress information
 */
export function getBatchProgress(batch: BatchState | null): {
  total: number;
  completed: number;
  failed: number;
  remaining: number;
  percentage: number;
} {
  if (!batch) {
    return { total: 0, completed: 0, failed: 0, remaining: 0, percentage: 0 };
  }

  const total = batch.taskIds.length;
  const completed = batch.completedCount;
  const failed = batch.failedCount;
  const remaining = total - completed - failed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, failed, remaining, percentage };
}

/**
 * Check if batch can start a new task
 */
export function canBatchStartTask(
  batch: BatchState | null,
  tasks: Record<string, TaskState>
): boolean {
  if (!batch || !isBatchRunning(batch.status)) {
    return false;
  }

  // Check if any task is currently running
  const hasRunningTask = batch.taskIds.some((taskId) => {
    const task = tasks[taskId];
    return task && isTaskRunning(task.status);
  });

  return !hasRunningTask;
}

/**
 * Get next queued task for a batch
 */
export function getNextQueuedTask(
  batch: BatchState | null,
  tasks: Record<string, TaskState>
): TaskState | null {
  if (!batch) {
    return null;
  }

  for (const taskId of batch.taskIds) {
    const task = tasks[taskId];
    if (task && isTaskQueued(task.status)) {
      return task;
    }
  }

  return null;
}

/**
 * Get all active batches
 */
export function getActiveBatches(
  batches: Record<BatchId, BatchState | null>
): Array<{ id: BatchId; batch: BatchState }> {
  const batchIds: BatchId[] = ['batch1', 'batch2', 'batch3', 'batch4'];
  return batchIds
    .filter((id) => {
      const batch = batches[id];
      return batch && isBatchRunning(batch.status);
    })
    .map((id) => ({ id, batch: batches[id]! }));
}

// ============================================================================
// Task Helpers
// ============================================================================

/**
 * Get tasks for a specific batch
 */
export function getTasksForBatch(
  batchId: BatchId,
  batch: BatchState | null,
  tasks: Record<string, TaskState>
): TaskState[] {
  if (!batch) {
    return [];
  }

  return batch.taskIds.map((id) => tasks[id]).filter(Boolean);
}

/**
 * Count tasks by status in a batch
 */
export function countBatchTasksByStatus(
  batch: BatchState | null,
  tasks: Record<string, TaskState>
): { queued: number; running: number; completed: number; failed: number } {
  if (!batch) {
    return { queued: 0, running: 0, completed: 0, failed: 0 };
  }

  const counts = { queued: 0, running: 0, completed: 0, failed: 0 };

  batch.taskIds.forEach((taskId) => {
    const task = tasks[taskId];
    if (!task) return;

    if (isTaskQueued(task.status)) counts.queued++;
    else if (isTaskRunning(task.status)) counts.running++;
    else if (isTaskCompleted(task.status)) counts.completed++;
    else if (isTaskFailed(task.status)) counts.failed++;
  });

  return counts;
}

// ============================================================================
// Status Utilities
// ============================================================================

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: ProjectRequirement['status']): string {
  const labels: Record<ProjectRequirement['status'], string> = {
    idle: 'Idle',
    queued: 'Queued',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    'session-limit': 'Session Limit',
  };
  return labels[status];
}

/**
 * Get status color class
 */
export function getStatusColorClass(status: ProjectRequirement['status']): string {
  const colors: Record<ProjectRequirement['status'], string> = {
    idle: 'text-gray-400',
    queued: 'text-amber-400',
    running: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
    'session-limit': 'text-red-400',
  };
  return colors[status];
}

/**
 * Get batch status label
 */
export function getBatchStatusLabel(status: BatchStatusUnion): string {
  switch (status.type) {
    case 'idle':
      return 'Idle';
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    default:
      return 'Unknown';
  }
}

// ============================================================================
// Selection Helpers
// ============================================================================

/**
 * Toggle a requirement in the selection set
 */
export function toggleRequirementSelection(
  selectedRequirements: Set<string>,
  reqId: string
): Set<string> {
  const newSet = new Set(selectedRequirements);
  if (newSet.has(reqId)) {
    newSet.delete(reqId);
  } else {
    newSet.add(reqId);
  }
  return newSet;
}

/**
 * Select/deselect all requirements in a project
 */
export function toggleProjectSelection(
  selectedRequirements: Set<string>,
  requirements: ProjectRequirement[],
  projectId: string,
  getReqId: (req: ProjectRequirement) => string
): Set<string> {
  const projectReqs = requirements.filter((req) => req.projectId === projectId);
  const selectableReqs = getSelectableRequirements(projectReqs);

  const allSelected = selectableReqs.every((req) => selectedRequirements.has(getReqId(req)));

  const newSet = new Set(selectedRequirements);

  if (allSelected) {
    selectableReqs.forEach((req) => newSet.delete(getReqId(req)));
  } else {
    selectableReqs.forEach((req) => newSet.add(getReqId(req)));
  }

  return newSet;
}

/**
 * Check if all selectable requirements in a project are selected
 */
export function isProjectFullySelected(
  selectedRequirements: Set<string>,
  requirements: ProjectRequirement[],
  projectId: string,
  getReqId: (req: ProjectRequirement) => string
): boolean {
  const projectReqs = requirements.filter((req) => req.projectId === projectId);
  const selectableReqs = getSelectableRequirements(projectReqs);

  if (selectableReqs.length === 0) return false;

  return selectableReqs.every((req) => selectedRequirements.has(getReqId(req)));
}

/**
 * Check if any requirements in a project are selected
 */
export function isProjectPartiallySelected(
  selectedRequirements: Set<string>,
  requirements: ProjectRequirement[],
  projectId: string,
  getReqId: (req: ProjectRequirement) => string
): boolean {
  const projectReqs = requirements.filter((req) => req.projectId === projectId);
  const selectableReqs = getSelectableRequirements(projectReqs);

  const selectedCount = selectableReqs.filter((req) =>
    selectedRequirements.has(getReqId(req))
  ).length;

  return selectedCount > 0 && selectedCount < selectableReqs.length;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate requirement structure
 */
export function isValidRequirement(req: unknown): req is ProjectRequirement {
  if (!req || typeof req !== 'object') return false;

  const r = req as Record<string, unknown>;

  return (
    typeof r.projectId === 'string' &&
    typeof r.projectName === 'string' &&
    typeof r.projectPath === 'string' &&
    typeof r.requirementName === 'string' &&
    ['idle', 'queued', 'running', 'completed', 'failed', 'session-limit'].includes(
      r.status as string
    )
  );
}

/**
 * Validate batch state structure
 */
export function isValidBatchState(batch: unknown): batch is BatchState {
  if (!batch || typeof batch !== 'object') return false;

  const b = batch as Record<string, unknown>;

  return (
    typeof b.id === 'string' &&
    typeof b.name === 'string' &&
    Array.isArray(b.taskIds) &&
    b.taskIds.every((id) => typeof id === 'string') &&
    typeof b.status === 'object' &&
    b.status !== null &&
    typeof (b.status as Record<string, unknown>).type === 'string' &&
    typeof b.completedCount === 'number' &&
    typeof b.failedCount === 'number'
  );
}

/**
 * Validate task state structure
 */
export function isValidTaskState(task: unknown): task is TaskState {
  if (!task || typeof task !== 'object') return false;

  const t = task as Record<string, unknown>;

  return (
    typeof t.id === 'string' &&
    ['batch1', 'batch2', 'batch3', 'batch4'].includes(t.batchId as string) &&
    typeof t.status === 'object' &&
    t.status !== null &&
    typeof (t.status as Record<string, unknown>).type === 'string'
  );
}

// ============================================================================
// Mock Actions
// ============================================================================

/**
 * Create mock action handlers for testing
 */
export function createMockActions() {
  return {
    onToggleSelect: (reqId: string) => console.log('Toggle select:', reqId),
    onDelete: (reqId: string) => console.log('Delete:', reqId),
    onToggleProjectSelection: (projectId: string) =>
      console.log('Toggle project selection:', projectId),
    onStartBatch: (batchId: BatchId) => console.log('Start batch:', batchId),
    onPauseBatch: (batchId: BatchId) => console.log('Pause batch:', batchId),
    onResumeBatch: (batchId: BatchId) => console.log('Resume batch:', batchId),
    onClearBatch: (batchId: BatchId) => console.log('Clear batch:', batchId),
    onCreateBatch: (batchId: BatchId) => console.log('Create batch:', batchId),
  };
}

/**
 * Create tracking action handlers that record calls
 */
export function createTrackingActions() {
  const calls: Array<{ action: string; args: unknown[] }> = [];

  return {
    calls,
    handlers: {
      onToggleSelect: (reqId: string) => calls.push({ action: 'toggleSelect', args: [reqId] }),
      onDelete: (reqId: string) => calls.push({ action: 'delete', args: [reqId] }),
      onToggleProjectSelection: (projectId: string) =>
        calls.push({ action: 'toggleProjectSelection', args: [projectId] }),
      onStartBatch: (batchId: BatchId) => calls.push({ action: 'startBatch', args: [batchId] }),
      onPauseBatch: (batchId: BatchId) => calls.push({ action: 'pauseBatch', args: [batchId] }),
      onResumeBatch: (batchId: BatchId) => calls.push({ action: 'resumeBatch', args: [batchId] }),
      onClearBatch: (batchId: BatchId) => calls.push({ action: 'clearBatch', args: [batchId] }),
      onCreateBatch: (batchId: BatchId) => calls.push({ action: 'createBatch', args: [batchId] }),
    },
    reset: () => (calls.length = 0),
    getCallsFor: (action: string) => calls.filter((c) => c.action === action),
    wasActionCalled: (action: string) => calls.some((c) => c.action === action),
  };
}
