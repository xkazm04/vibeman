/**
 * TaskRunner Test Utilities
 *
 * Utility functions for testing TaskRunner components.
 * Provides helpers for rendering, assertions, and common test patterns.
 */

import type { ProjectRequirement } from '../lib/types';
import type { TaskState } from '../store/taskRunnerStore';
import {
  type TaskStatusType,
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
  statuses: TaskStatusType[]
): ProjectRequirement[] {
  return requirements.filter((req) => statuses.includes(req.status.type));
}

/**
 * Get selectable requirements (not running or queued)
 */
export function getSelectableRequirements(
  requirements: ProjectRequirement[]
): ProjectRequirement[] {
  return requirements.filter((req) => req.status.type !== 'running' && req.status.type !== 'queued');
}

/**
 * Count requirements by status
 */
export function countRequirementsByStatus(
  requirements: ProjectRequirement[]
): Record<TaskStatusType, number> {
  const counts: Record<TaskStatusType, number> = {
    idle: 0,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
  };

  requirements.forEach((req) => {
    counts[req.status.type]++;
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
  const labels: Record<TaskStatusType, string> = {
    idle: 'Idle',
    queued: 'Queued',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
  };
  return labels[status.type];
}

/**
 * Get status color class
 */
export function getStatusColorClass(status: ProjectRequirement['status']): string {
  const colors: Record<TaskStatusType, string> = {
    idle: 'text-gray-400',
    queued: 'text-amber-400',
    running: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  };
  return colors[status.type];
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
    typeof r.status === 'object' &&
    r.status !== null &&
    ['idle', 'queued', 'running', 'completed', 'failed'].includes(
      (r.status as Record<string, unknown>).type as string
    )
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
    },
    reset: () => (calls.length = 0),
    getCallsFor: (action: string) => calls.filter((c) => c.action === action),
    wasActionCalled: (action: string) => calls.some((c) => c.action === action),
  };
}
