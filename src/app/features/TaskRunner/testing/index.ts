/**
 * TaskRunner Testing Module
 *
 * Central export for all testing utilities, mock generators, and factory functions.
 * Import from this file for all testing needs.
 *
 * @example
 * ```typescript
 * import {
 *   createMockRequirement,
 *   createRunningBatch,
 *   getRequirementId,
 *   createTrackingActions,
 * } from '@/app/features/TaskRunner/testing';
 * ```
 */

// Mock Data Generators
export {
  // ID Generators
  generateId,
  generateProjectId,
  generateRequirementId,

  // Requirement Generators
  createMockRequirement,
  createMockRequirementsForProject,
  createMockRequirementsByProject,
  createMixedStatusRequirements,
  createBatchExecutionScenario,

  // Batch State Generators
  createMockBatchState,
  createIdleBatch,
  createRunningBatch,
  createPausedBatch,
  createCompletedBatch,

  // Task State Generators
  createMockTaskState,
  createQueuedTask,
  createRunningTask,
  createCompletedTask,
  createFailedTask,

  // Complete Scenario Generators
  createTaskRunnerScenario,
  createEmptyScenario,
  createAllBatchesActiveScenario,

  // Types
  type MockRequirementOptions,
  type MockBatchOptions,
  type MockTaskOptions,
} from './mockGenerators';

// Test Utilities
export {
  // Requirement Helpers
  getRequirementId,
  groupRequirementsByProject,
  filterRequirementsByStatus,
  getSelectableRequirements,
  countRequirementsByStatus,

  // Batch Helpers
  getBatchProgress,
  canBatchStartTask,
  getNextQueuedTask,
  getActiveBatches,

  // Task Helpers
  getTasksForBatch,
  countBatchTasksByStatus,

  // Status Utilities
  getStatusLabel,
  getStatusColorClass,
  getBatchStatusLabel,

  // Selection Helpers
  toggleRequirementSelection,
  toggleProjectSelection,
  isProjectFullySelected,
  isProjectPartiallySelected,

  // Validation Helpers
  isValidRequirement,
  isValidBatchState,
  isValidTaskState,

  // Mock Actions
  createMockActions,
  createTrackingActions,
} from './testUtils';
