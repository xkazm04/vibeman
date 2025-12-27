/**
 * GitHub Integration Entry Point
 * Provides access to GitHub Projects sync utilities
 */

export {
  isGitHubConfigured,
  getGitHubToken,
  graphqlRequest,
  getProject,
  findProjectByNumber,
  addDraftItem,
  updateSingleSelectField,
  updateDateField,
  deleteItem,
  getProjectItem,
} from './client';

export {
  isGitHubProjectConfigured,
  getGitHubProjectConfig,
  syncGoalToGitHub,
  deleteGoalFromGitHub,
  batchSyncGoalsToGitHub,
  fireAndForgetGitHubSync,
  discoverProjectConfig,
} from './goalSync';

export type {
  GitHubProjectConfig,
  GitHubProject,
  GitHubProjectItem,
  GitHubSyncResult,
  GitHubBatchSyncResult,
  GoalStatus,
  StatusMapping,
} from './types';
