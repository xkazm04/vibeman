/**
 * Task Runner Store - Main Export
 *
 * CLI session system (src/components/cli/) is the sole execution mode.
 */

export * from './taskRunnerStore';

// Re-export discriminated union types and utilities from types.ts
export type {
  TaskStatusUnion,
  TaskStatusIdle,
  TaskStatusQueued,
  TaskStatusRunning,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusType,
} from '../lib/types';

export {
  // Task status factories
  createIdleStatus,
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
  // Task status type guards
  isTaskIdle,
  isTaskQueued,
  isTaskRunning,
  isTaskCompleted,
  isTaskFailed,
  // Boundary adapters
  legacyToTaskStatus,
  taskStatusToDbString,
  // Display helpers
  getStatusLabel,
  categorizeByStatus,
  // Backward-compatible aliases (deprecated)
  isRequirementQueued,
  isRequirementRunning,
  isRequirementCompleted,
  isRequirementFailed,
  isRequirementIdle,
  categorizeRequirementsByStatus,
  getRequirementStatusLabel,
} from '../lib/types';
