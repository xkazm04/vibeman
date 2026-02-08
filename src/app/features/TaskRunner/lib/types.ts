import type { Requirement } from '@/app/Claude/lib/requirementApi';
import type { BatchId } from './batchStorage';
import { RequirementId, type RequirementIdString, type ParsedRequirementId } from './requirementId';

// Re-export RequirementId for consumers
export { RequirementId, type RequirementIdString, type ParsedRequirementId };

// Re-export ProgressEmitter types for progress tracking
// See @/lib/progress for the unified progress interface
export type { ProgressSnapshot, ProgressEmitter } from '@/lib/progress';

// ============================================================================
// Discriminated Union Types for Task Status
// ============================================================================

/**
 * Task is waiting in queue to be executed
 */
export interface TaskStatusQueued {
  type: 'queued';
}

/**
 * Task is currently being executed
 *
 * Progress is tracked via the progressLines metric in the store's taskProgress map.
 * progressLines (0-100) serves as a normalized proxy for execution progress,
 * implementing the ProgressEmitter pattern. See @/lib/progress for details.
 *
 * The progress field here is optional and may differ from progressLines -
 * use taskProgress[taskId] from the store for the canonical progressLines value.
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
 * Using discriminated unions ensures:
 * 1. You can only access status-specific properties after checking the type
 * 2. TypeScript enforces exhaustive handling of all status types
 * 3. Invalid state combinations are prevented at compile time
 *
 * @example
 * ```typescript
 * function handleTaskStatus(status: TaskStatusUnion) {
 *   switch (status.type) {
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
// Discriminated Union Types for Batch Status
// ============================================================================

/**
 * Batch is idle (not started)
 */
export interface BatchStatusIdle {
  type: 'idle';
}

/**
 * Batch is currently running
 */
export interface BatchStatusRunning {
  type: 'running';
  startedAt: number;
  currentTaskId?: string; // ID of the currently running task
}

/**
 * Batch is paused
 */
export interface BatchStatusPaused {
  type: 'paused';
  startedAt: number;
  pausedAt: number;
}

/**
 * Batch completed (all tasks processed)
 */
export interface BatchStatusCompleted {
  type: 'completed';
  startedAt: number;
  completedAt: number;
  totalDuration: number; // Total duration in ms
}

/**
 * Discriminated union type for all possible batch statuses
 */
export type BatchStatusUnion =
  | BatchStatusIdle
  | BatchStatusRunning
  | BatchStatusPaused
  | BatchStatusCompleted;

/**
 * Simple string literal type for backward compatibility
 */
export type BatchStatusType = BatchStatusUnion['type'];

// ============================================================================
// Helper Functions for Status Operations
// ============================================================================

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
 * Create an idle batch status
 */
export function createIdleBatchStatus(): BatchStatusIdle {
  return { type: 'idle' };
}

/**
 * Create a running batch status
 */
export function createRunningBatchStatus(startedAt: number = Date.now(), currentTaskId?: string): BatchStatusRunning {
  return { type: 'running', startedAt, currentTaskId };
}

/**
 * Create a paused batch status
 */
export function createPausedBatchStatus(startedAt: number, pausedAt: number = Date.now()): BatchStatusPaused {
  return { type: 'paused', startedAt, pausedAt };
}

/**
 * Create a completed batch status
 */
export function createCompletedBatchStatus(startedAt: number, completedAt: number = Date.now()): BatchStatusCompleted {
  return {
    type: 'completed',
    startedAt,
    completedAt,
    totalDuration: completedAt - startedAt,
  };
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
 * Type guard to check if batch status is idle
 */
export function isBatchIdle(status: BatchStatusUnion | undefined): status is BatchStatusIdle {
  return status?.type === 'idle';
}

/**
 * Type guard to check if batch status is running
 */
export function isBatchRunning(status: BatchStatusUnion | undefined): status is BatchStatusRunning {
  return status?.type === 'running';
}

/**
 * Type guard to check if batch status is paused
 */
export function isBatchPaused(status: BatchStatusUnion | undefined): status is BatchStatusPaused {
  return status?.type === 'paused';
}

/**
 * Type guard to check if batch status is completed
 */
export function isBatchCompleted(status: BatchStatusUnion | undefined): status is BatchStatusCompleted {
  return status?.type === 'completed';
}

/**
 * Convert legacy string status to TaskStatusUnion
 * Used for backward compatibility during migration
 */
export function legacyToTaskStatus(
  status: 'queued' | 'running' | 'completed' | 'failed',
  options?: {
    startedAt?: number;
    completedAt?: number;
    error?: string;
    isSessionLimit?: boolean;
  }
): TaskStatusUnion {
  switch (status) {
    case 'queued':
      return createQueuedStatus();
    case 'running':
      return createRunningStatus(options?.startedAt);
    case 'completed':
      return createCompletedStatus(options?.completedAt);
    case 'failed':
      return createFailedStatus(
        options?.error || 'Unknown error',
        options?.completedAt,
        options?.isSessionLimit
      );
  }
}

/**
 * Convert TaskStatusUnion to legacy string status
 * Used for serialization and backward compatibility
 */
export function taskStatusToLegacy(status: TaskStatusUnion): 'queued' | 'running' | 'completed' | 'failed' {
  return status.type;
}

/**
 * Convert legacy string status to BatchStatusUnion
 */
export function legacyToBatchStatus(
  status: 'idle' | 'running' | 'paused' | 'completed',
  options?: {
    startedAt?: number;
    completedAt?: number;
    pausedAt?: number;
    currentTaskId?: string;
  }
): BatchStatusUnion {
  switch (status) {
    case 'idle':
      return createIdleBatchStatus();
    case 'running':
      return createRunningBatchStatus(options?.startedAt, options?.currentTaskId);
    case 'paused':
      return createPausedBatchStatus(options?.startedAt || Date.now(), options?.pausedAt);
    case 'completed':
      return createCompletedBatchStatus(options?.startedAt || Date.now(), options?.completedAt);
  }
}

/**
 * Convert BatchStatusUnion to legacy string status
 */
export function batchStatusToLegacy(status: BatchStatusUnion): 'idle' | 'running' | 'paused' | 'completed' {
  return status.type;
}

// ============================================================================
// ProjectRequirement Status Helpers (for API/UI layer)
// ============================================================================

/**
 * ProjectRequirement uses legacy string status from the API.
 * These helpers provide type-safe status checking for UI components.
 */

/**
 * Type alias for the legacy string status values used in ProjectRequirement
 */
export type RequirementStatusString = Requirement['status'];

/**
 * Check if requirement status is 'queued'
 */
export function isRequirementQueued(status: RequirementStatusString): boolean {
  return status === 'queued';
}

/**
 * Check if requirement status is 'running'
 */
export function isRequirementRunning(status: RequirementStatusString): boolean {
  return status === 'running';
}

/**
 * Check if requirement status is 'completed'
 */
export function isRequirementCompleted(status: RequirementStatusString): boolean {
  return status === 'completed';
}

/**
 * Check if requirement status is 'failed' (includes session-limit)
 */
export function isRequirementFailed(status: RequirementStatusString): boolean {
  return status === 'failed' || status === 'session-limit';
}

/**
 * Check if requirement status is 'idle'
 */
export function isRequirementIdle(status: RequirementStatusString): boolean {
  return status === 'idle';
}

/**
 * Categorize requirements by status
 * Returns a discriminated object with arrays for each status category
 */
export function categorizeRequirementsByStatus<T extends { status: RequirementStatusString }>(
  requirements: T[]
): {
  idle: T[];
  queued: T[];
  running: T[];
  completed: T[];
  failed: T[];
} {
  return {
    idle: requirements.filter(r => isRequirementIdle(r.status)),
    queued: requirements.filter(r => isRequirementQueued(r.status)),
    running: requirements.filter(r => isRequirementRunning(r.status)),
    completed: requirements.filter(r => isRequirementCompleted(r.status)),
    failed: requirements.filter(r => isRequirementFailed(r.status)),
  };
}

/**
 * Get display label for requirement status
 */
export function getRequirementStatusLabel(status: RequirementStatusString): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'completed':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'session-limit':
      return 'Limit';
    case 'queued':
      return 'Queued';
    case 'idle':
    default:
      return 'Idle';
  }
}

// ============================================================================
// Original Types (kept for backward compatibility)
// ============================================================================

export interface ProjectRequirement {
  projectId: string;
  projectName: string;
  projectPath: string;
  requirementName: string;
  status: Requirement['status'];
  taskId?: string;
  batchId?: BatchId | null; // Track which batch this requirement belongs to (up to 4 batches)
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