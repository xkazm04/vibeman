/**
 * Task Runner Store - Main Export
 */

export * from './taskRunnerStore';
export * from './useTaskRunnerHooks';
export * from './remoteBatchStore';

// Re-export discriminated union types and utilities from types.ts
export type {
  TaskStatusUnion,
  TaskStatusQueued,
  TaskStatusRunning,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusType,
  BatchStatusUnion,
  BatchStatusIdle,
  BatchStatusRunning,
  BatchStatusPaused,
  BatchStatusCompleted,
  BatchStatusType,
  RequirementStatusString,
} from '../lib/types';

export {
  // Task status helpers (for internal store TaskState)
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
  createIdleBatchStatus,
  createRunningBatchStatus,
  createPausedBatchStatus,
  createCompletedBatchStatus,
  isTaskQueued,
  isTaskRunning,
  isTaskCompleted,
  isTaskFailed,
  isBatchIdle,
  isBatchRunning,
  isBatchPaused,
  isBatchCompleted,
  legacyToTaskStatus,
  taskStatusToLegacy,
  legacyToBatchStatus,
  batchStatusToLegacy,
  // ProjectRequirement status helpers (for UI components)
  isRequirementQueued,
  isRequirementRunning,
  isRequirementCompleted,
  isRequirementFailed,
  isRequirementIdle,
  categorizeRequirementsByStatus,
  getRequirementStatusLabel,
} from '../lib/types';
