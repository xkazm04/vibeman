import { RequirementId, type RequirementIdString, type ParsedRequirementId } from './requirementId';

// Re-export RequirementId for consumers
export { RequirementId, type RequirementIdString, type ParsedRequirementId };

// ============================================================================
// Discriminated Union Types for Task Status
// ============================================================================

/**
 * Task is idle (not yet queued for execution)
 */
export interface TaskStatusIdle {
  type: 'idle';
}

/**
 * Task is waiting in queue to be executed
 */
export interface TaskStatusQueued {
  type: 'queued';
}

/**
 * Task is currently being executed
 *
 * Progress is tracked by the unified ProgressTracker (see lib/progressTracker.ts)
 * which derives activity, checkpoints, and percentage from CLI stdout.
 */
export interface TaskStatusRunning {
  type: 'running';
  startedAt: number;
  progress?: number; // Optional progress percentage (0-100)
}

/**
 * Task completed successfully
 */
export interface TaskStatusCompleted {
  type: 'completed';
  completedAt: number;
  duration?: number; // Duration in ms
}

/**
 * Task failed with an error
 */
export interface TaskStatusFailed {
  type: 'failed';
  error: string;
  completedAt: number;
  isSessionLimit?: boolean; // True if failed due to session limit
}

/**
 * Discriminated union type for all possible task statuses.
 * This is the canonical status type used across all layers.
 *
 * Using discriminated unions ensures:
 * 1. You can only access status-specific properties after checking the type
 * 2. TypeScript enforces exhaustive handling of all status types
 * 3. Invalid state combinations are prevented at compile time
 *
 * @example
 * ```typescript
 * function handleTaskStatus(status: TaskStatusUnion) {
 *   switch (status.type) {
 *     case 'idle':
 *       // Task not yet queued
 *       break;
 *     case 'queued':
 *       // No additional properties available
 *       break;
 *     case 'running':
 *       // status.startedAt is available
 *       // status.progress is optionally available
 *       break;
 *     case 'completed':
 *       // status.completedAt and status.duration are available
 *       break;
 *     case 'failed':
 *       // status.error and status.completedAt are available
 *       // status.isSessionLimit is optionally available
 *       break;
 *   }
 * }
 * ```
 */
export type TaskStatusUnion =
  | TaskStatusIdle
  | TaskStatusQueued
  | TaskStatusRunning
  | TaskStatusCompleted
  | TaskStatusFailed;

/**
 * Simple string literal type for backward compatibility
 * Maps to the discriminated union's type field
 */
export type TaskStatusType = TaskStatusUnion['type'];

// ============================================================================
// Helper Functions for Status Operations
// ============================================================================

/**
 * Create an idle task status
 */
export function createIdleStatus(): TaskStatusIdle {
  return { type: 'idle' };
}

/**
 * Create a queued task status
 */
export function createQueuedStatus(): TaskStatusQueued {
  return { type: 'queued' };
}

/**
 * Create a running task status
 */
export function createRunningStatus(startedAt: number = Date.now(), progress?: number): TaskStatusRunning {
  return { type: 'running', startedAt, progress };
}

/**
 * Create a completed task status
 */
export function createCompletedStatus(completedAt: number = Date.now(), duration?: number): TaskStatusCompleted {
  return { type: 'completed', completedAt, duration };
}

/**
 * Create a failed task status
 */
export function createFailedStatus(error: string, completedAt: number = Date.now(), isSessionLimit?: boolean): TaskStatusFailed {
  return { type: 'failed', error, completedAt, isSessionLimit };
}

/**
 * Type guard to check if task status is idle
 */
export function isTaskIdle(status: TaskStatusUnion | undefined): status is TaskStatusIdle {
  return status?.type === 'idle';
}

/**
 * Type guard to check if task status is queued
 */
export function isTaskQueued(status: TaskStatusUnion | undefined): status is TaskStatusQueued {
  return status?.type === 'queued';
}

/**
 * Type guard to check if task status is running
 */
export function isTaskRunning(status: TaskStatusUnion | undefined): status is TaskStatusRunning {
  return status?.type === 'running';
}

/**
 * Type guard to check if task status is completed
 */
export function isTaskCompleted(status: TaskStatusUnion | undefined): status is TaskStatusCompleted {
  return status?.type === 'completed';
}

/**
 * Type guard to check if task status is failed
 */
export function isTaskFailed(status: TaskStatusUnion | undefined): status is TaskStatusFailed {
  return status?.type === 'failed';
}

/**
 * Convert a legacy string status to TaskStatusUnion.
 * Handles all known status strings from the Requirement API, DB layer,
 * QueuedTask, and ExecutionStatus types.
 *
 * - 'idle'          → TaskStatusIdle
 * - 'pending'       → TaskStatusQueued (semantically identical to queued)
 * - 'queued'        → TaskStatusQueued
 * - 'running'       → TaskStatusRunning
 * - 'completed'     → TaskStatusCompleted
 * - 'failed'        → TaskStatusFailed
 * - 'session-limit' → TaskStatusFailed with isSessionLimit: true
 */
export function legacyToTaskStatus(
  status: string,
  options?: {
    startedAt?: number;
    completedAt?: number;
    error?: string;
    isSessionLimit?: boolean;
  }
): TaskStatusUnion {
  switch (status) {
    case 'idle':
      return createIdleStatus();
    case 'pending':
    case 'queued':
      return createQueuedStatus();
    case 'running':
      return createRunningStatus(options?.startedAt);
    case 'completed':
      return createCompletedStatus(options?.completedAt);
    case 'session-limit':
      return createFailedStatus(
        options?.error || 'Session limit reached',
        options?.completedAt,
        true
      );
    case 'failed':
    default:
      return createFailedStatus(
        options?.error || 'Unknown error',
        options?.completedAt,
        options?.isSessionLimit
      );
  }
}

/**
 * Convert TaskStatusUnion to a DB-compatible string status.
 * Used at the SQLite boundary for persistence.
 */
export function taskStatusToDbString(status: TaskStatusUnion): string {
  if (status.type === 'failed' && status.isSessionLimit) {
    return 'session-limit';
  }
  return status.type;
}

// ============================================================================
// Status Display Helpers
// ============================================================================

/**
 * Get display label for a task status
 */
export function getStatusLabel(status: TaskStatusUnion): string {
  switch (status.type) {
    case 'running':
      return 'Running';
    case 'completed':
      return 'Done';
    case 'failed':
      return status.isSessionLimit ? 'Limit' : 'Failed';
    case 'queued':
      return 'Queued';
    case 'idle':
      return 'Idle';
  }
}

/**
 * Categorize items by their TaskStatusUnion status
 */
export function categorizeByStatus<T extends { status: TaskStatusUnion }>(
  items: T[]
): {
  idle: T[];
  queued: T[];
  running: T[];
  completed: T[];
  failed: T[];
} {
  return {
    idle: items.filter(r => isTaskIdle(r.status)),
    queued: items.filter(r => isTaskQueued(r.status)),
    running: items.filter(r => isTaskRunning(r.status)),
    completed: items.filter(r => isTaskCompleted(r.status)),
    failed: items.filter(r => isTaskFailed(r.status)),
  };
}

// Backward-compatible aliases — these operate on TaskStatusUnion directly
// since ProjectRequirement.status is now TaskStatusUnion
/** @deprecated Use isTaskQueued instead */
export const isRequirementQueued = isTaskQueued;
/** @deprecated Use isTaskRunning instead */
export const isRequirementRunning = isTaskRunning;
/** @deprecated Use isTaskCompleted instead */
export const isRequirementCompleted = isTaskCompleted;
/** @deprecated Use isTaskFailed instead */
export const isRequirementFailed = isTaskFailed;
/** @deprecated Use isTaskIdle instead */
export const isRequirementIdle = isTaskIdle;

/** @deprecated Use getStatusLabel instead */
export function getRequirementStatusLabel(status: TaskStatusUnion): string {
  return getStatusLabel(status);
}

/** @deprecated Use categorizeByStatus instead */
export function categorizeRequirementsByStatus<T extends { status: TaskStatusUnion }>(
  requirements: T[]
): {
  idle: T[];
  queued: T[];
  running: T[];
  completed: T[];
  failed: T[];
} {
  return categorizeByStatus(requirements);
}

/** @deprecated Use TaskStatusType instead */
export type RequirementStatusString = TaskStatusType;

// ============================================================================
// Original Types (kept for backward compatibility)
// ============================================================================

export interface ProjectRequirement {
  projectId: string;
  projectName: string;
  projectPath: string;
  requirementName: string;
  status: TaskStatusUnion;
  taskId?: string;
}

/**
 * Get the composite requirement ID for a ProjectRequirement
 *
 * Uses the RequirementId value object for consistent ID formatting.
 *
 * @param requirement - The project requirement
 * @returns The composite requirement ID string
 *
 * @example
 * ```typescript
 * const req: ProjectRequirement = { projectId: 'proj-123', requirementName: 'fix-bug', ... };
 * const id = getRequirementId(req); // "proj-123:fix-bug"
 * ```
 */
export function getRequirementId(requirement: Pick<ProjectRequirement, 'projectId' | 'requirementName'>): RequirementIdString {
  return RequirementId.fromRequirement(requirement);
}

export interface TaskRunnerState {
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  isLoading: boolean;
  isRunning: boolean;
  processedCount: number;
  error?: string;
}

export interface TaskRunnerActions {
  setRequirements: React.Dispatch<React.SetStateAction<ProjectRequirement[]>>;
  setSelectedRequirements: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  setProcessedCount: React.Dispatch<React.SetStateAction<number>>;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
}