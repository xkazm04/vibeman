/**
 * TaskRunner Testing Module
 *
 * Central export for all testing utilities, mock generators, and factory functions.
 * Import from this file for all testing needs.
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

  // Task State Generators
  createMockTaskState,
  createQueuedTask,
  createRunningTask,
  createCompletedTask,
  createFailedTask,

  // Complete Scenario Generators
  createTaskRunnerScenario,
  createEmptyScenario,

  // Types
  type MockRequirementOptions,
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

  // Status Utilities
  getStatusLabel,
  getStatusColorClass,

  // Selection Helpers
  toggleRequirementSelection,
  toggleProjectSelection,
  isProjectFullySelected,
  isProjectPartiallySelected,

  // Validation Helpers
  isValidRequirement,
  isValidTaskState,

  // Mock Actions
  createMockActions,
  createTrackingActions,
} from './testUtils';
