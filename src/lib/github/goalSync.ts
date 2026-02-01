/**
 * GitHub Goal Sync Service
 * Syncs Goals to GitHub Projects V2 as roadmap items
 */

import { createLogger } from '@/lib/utils/logger';
import { goalDb } from '@/app/db';
import {
  isGitHubConfigured,
  getGitHubToken,
  addDraftItem,
  updateSingleSelectField,
  updateDateField,
  deleteItem,
} from './client';
import {
  getCachedProject,
  getCachedProjectByNumber,
  invalidateProjectItemCache,
} from './cachedClient';
import type {
  GitHubProjectConfig,
  GitHubSyncResult,
  GitHubBatchSyncResult,
  GoalStatus,
  StatusMapping,
  DEFAULT_STATUS_NAMES,
} from './types';
import type { DbGoal } from '@/app/db/models/types';

const logger = createLogger('GitHubGoalSync');

// Re-export for convenience
export { isGitHubConfigured };

// ============================================================================
// ERROR DIAGNOSTICS
// ============================================================================

/**
 * GitHub sync error codes for structured error handling
 */
export type GitHubSyncErrorCode =
  | 'NOT_CONFIGURED'
  | 'TOKEN_MISSING'
  | 'TOKEN_INVALID'
  | 'PROJECT_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'GRAPHQL_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Structured GitHub sync error with actionable guidance
 */
export interface GitHubSyncErrorInfo {
  code: GitHubSyncErrorCode;
  message: string;
  action: string;
  goalId: string;
  details?: string;
}

/**
 * Diagnose GitHub error and provide actionable guidance
 */
function diagnoseGitHubError(error: unknown, goalId: string): GitHubSyncErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  // Check for missing token
  if (errorLower.includes('token') && (errorLower.includes('missing') || errorLower.includes('not configured') || errorLower.includes('undefined'))) {
    return {
      code: 'TOKEN_MISSING',
      message: `GitHub token missing for goal ${goalId}`,
      action: 'Set GITHUB_TOKEN in .env.local - create a token at https://github.com/settings/tokens with "project" scope',
      goalId,
      details: errorMessage,
    };
  }

  // Check for invalid/expired token
  if (errorLower.includes('bad credentials') || errorLower.includes('401') || errorLower.includes('unauthorized')) {
    return {
      code: 'TOKEN_INVALID',
      message: `GitHub token invalid or expired for goal ${goalId}`,
      action: 'Generate a new GitHub token at https://github.com/settings/tokens - ensure it has "project" scope for GitHub Projects V2',
      goalId,
      details: errorMessage,
    };
  }

  // Check for permission issues
  if (errorLower.includes('403') || errorLower.includes('forbidden') || errorLower.includes('permission') || errorLower.includes('scope')) {
    return {
      code: 'PERMISSION_DENIED',
      message: `GitHub permission denied for goal ${goalId}`,
      action: 'Ensure your GitHub token has "project" scope - regenerate at https://github.com/settings/tokens with correct permissions',
      goalId,
      details: errorMessage,
    };
  }

  // Check for rate limiting
  if (errorLower.includes('rate limit') || errorLower.includes('429') || errorLower.includes('too many requests')) {
    return {
      code: 'RATE_LIMITED',
      message: `GitHub API rate limited for goal ${goalId}`,
      action: 'Wait a few minutes and try again - or check https://docs.github.com/en/rest/rate-limit for rate limit status',
      goalId,
      details: errorMessage,
    };
  }

  // Check for project not found
  if (errorLower.includes('not found') || errorLower.includes('404') || errorLower.includes('could not resolve')) {
    return {
      code: 'PROJECT_NOT_FOUND',
      message: `GitHub project not found for goal ${goalId}`,
      action: 'Check GITHUB_PROJECT_ID and GITHUB_PROJECT_OWNER in .env.local - verify the project exists and you have access',
      goalId,
      details: errorMessage,
    };
  }

  // Check for network errors
  if (errorLower.includes('fetch') || errorLower.includes('network') || errorLower.includes('econnrefused') || errorLower.includes('timeout')) {
    return {
      code: 'NETWORK_ERROR',
      message: `Network error syncing goal ${goalId} to GitHub`,
      action: 'Check your internet connection and verify GitHub API is accessible (https://www.githubstatus.com/)',
      goalId,
      details: errorMessage,
    };
  }

  // Check for GraphQL-specific errors
  if (errorLower.includes('graphql') || errorLower.includes('mutation') || errorLower.includes('query')) {
    return {
      code: 'GRAPHQL_ERROR',
      message: `GitHub GraphQL error for goal ${goalId}`,
      action: 'Check GitHub Project field IDs in .env.local - use /api/github/discover to find correct field IDs',
      goalId,
      details: errorMessage,
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN_ERROR',
    message: `Unexpected error syncing goal ${goalId} to GitHub`,
    action: 'Check GitHub status (https://www.githubstatus.com/) and review error details',
    goalId,
    details: errorMessage,
  };
}

/**
 * Log structured GitHub sync error with actionable guidance
 */
function logGitHubSyncError(syncError: GitHubSyncErrorInfo, operation: string): void {
  logger.warn(
    `[${syncError.code}] ${syncError.message}\n` +
    `  Operation: ${operation}\n` +
    `  Action: ${syncError.action}` +
    (syncError.details ? `\n  Details: ${syncError.details}` : '')
  );
}

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Get GitHub Project configuration from environment or project settings
 * For now, uses environment variables. Can be extended to use project-level settings.
 */
export function getGitHubProjectConfig(): GitHubProjectConfig | null {
  const token = getGitHubToken();
  const projectId = process.env.GITHUB_PROJECT_ID;
  const owner = process.env.GITHUB_PROJECT_OWNER;

  if (!token || !projectId || !owner) {
    return null;
  }

  return {
    token,
    projectId,
    owner,
    projectNumber: process.env.GITHUB_PROJECT_NUMBER
      ? parseInt(process.env.GITHUB_PROJECT_NUMBER, 10)
      : undefined,
    statusFieldId: process.env.GITHUB_STATUS_FIELD_ID,
    targetDateFieldId: process.env.GITHUB_TARGET_DATE_FIELD_ID,
    statusMapping: {
      open: process.env.GITHUB_STATUS_TODO_ID,
      in_progress: process.env.GITHUB_STATUS_IN_PROGRESS_ID,
      done: process.env.GITHUB_STATUS_DONE_ID,
    },
  };
}

/**
 * Check if GitHub Project sync is fully configured
 */
export function isGitHubProjectConfigured(): boolean {
  const config = getGitHubProjectConfig();
  return !!(config?.token && config?.projectId);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Map goal status to GitHub status option ID
 */
function getStatusOptionId(
  status: GoalStatus,
  statusMapping?: StatusMapping
): string | null {
  if (!statusMapping) return null;

  switch (status) {
    case 'open':
    case 'undecided':
      return statusMapping.open || null;
    case 'in_progress':
      return statusMapping.in_progress || null;
    case 'done':
    case 'rejected':
      return statusMapping.done || null;
    default:
      return null;
  }
}

/**
 * Format date for GitHub (YYYY-MM-DD)
 */
function formatDateForGitHub(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync a goal to GitHub Projects
 * Creates new item or updates existing one
 */
export async function syncGoalToGitHub(goal: DbGoal): Promise<GitHubSyncResult> {
  const config = getGitHubProjectConfig();

  if (!config) {
    return { success: true, operation: 'update', goalId: goal.id }; // No-op if not configured
  }

  try {
    let githubItemId = goal.github_item_id;
    let operation: 'create' | 'update' = 'update';

    // Create new item if none exists
    if (!githubItemId) {
      operation = 'create';
      githubItemId = await addDraftItem(
        config.projectId,
        goal.title,
        goal.description || undefined,
        config.token
      );

      // Store the GitHub item ID in the goal
      goalDb.updateGoal(goal.id, { github_item_id: githubItemId } as any);

      logger.info(`Created GitHub item ${githubItemId} for goal ${goal.id}`);
    }

    // Update status field if configured
    if (config.statusFieldId && config.statusMapping) {
      const statusOptionId = getStatusOptionId(goal.status, config.statusMapping);
      if (statusOptionId) {
        await updateSingleSelectField(
          config.projectId,
          githubItemId,
          config.statusFieldId,
          statusOptionId,
          config.token
        );
        logger.info(`Updated GitHub item ${githubItemId} status to ${goal.status}`);
      }
    }

    // Update target date if configured and goal has target date
    if (config.targetDateFieldId && goal.target_date) {
      const formattedDate = formatDateForGitHub(goal.target_date);
      if (formattedDate) {
        await updateDateField(
          config.projectId,
          githubItemId,
          config.targetDateFieldId,
          formattedDate,
          config.token
        );
      }
    }

    return {
      success: true,
      operation,
      goalId: goal.id,
      githubItemId,
    };

  } catch (error) {
    const syncError = diagnoseGitHubError(error, goal.id);
    logGitHubSyncError(syncError, `sync goal "${goal.title}"`);
    return {
      success: false,
      operation: 'update',
      goalId: goal.id,
      error: syncError.message,
    };
  }
}

/**
 * Delete a goal from GitHub Projects
 */
export async function deleteGoalFromGitHub(
  goalId: string,
  githubItemId: string | null
): Promise<GitHubSyncResult> {
  const config = getGitHubProjectConfig();

  if (!config || !githubItemId) {
    return { success: true, operation: 'delete', goalId }; // No-op
  }

  try {
    await deleteItem(config.projectId, githubItemId, config.token);
    logger.info(`Deleted GitHub item ${githubItemId} for goal ${goalId}`);

    return {
      success: true,
      operation: 'delete',
      goalId,
      githubItemId,
    };

  } catch (error) {
    const syncError = diagnoseGitHubError(error, goalId);
    logGitHubSyncError(syncError, `delete goal ${goalId}`);
    return {
      success: false,
      operation: 'delete',
      goalId,
      error: syncError.message,
    };
  }
}

/**
 * Batch sync all goals for a project to GitHub
 */
export async function batchSyncGoalsToGitHub(
  projectId: string
): Promise<GitHubBatchSyncResult> {
  const config = getGitHubProjectConfig();

  if (!config) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['GitHub Project not configured'],
      results: [],
    };
  }

  const goals = goalDb.getGoalsByProject(projectId);
  const results: GitHubSyncResult[] = [];
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const goal of goals) {
    const result = await syncGoalToGitHub(goal);
    results.push(result);

    if (result.success) {
      synced++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`Goal ${goal.id}: ${result.error}`);
      }
    }
  }

  return {
    success: failed === 0,
    synced,
    failed,
    errors,
    results,
  };
}

// ============================================================================
// FIRE-AND-FORGET WRAPPER
// ============================================================================

/**
 * Fire-and-forget wrapper for non-blocking GitHub sync
 * Logs structured errors with actionable guidance on failure
 */
export function fireAndForgetGitHubSync<T>(
  syncFn: () => Promise<T>,
  context: string
): void {
  Promise.resolve().then(async () => {
    try {
      await syncFn();
    } catch (error) {
      // Extract goal ID from context if possible (format: "Create goal <id> in GitHub")
      const goalIdMatch = context.match(/goal\s+([a-f0-9-]+)/i);
      const goalId = goalIdMatch ? goalIdMatch[1] : 'unknown';

      const syncError = diagnoseGitHubError(error, goalId);
      logGitHubSyncError(syncError, context);
    }
  });
}

// ============================================================================
// PROJECT DISCOVERY
// ============================================================================

/**
 * Discover and validate GitHub Project configuration
 * Returns project details with field mappings
 */
export async function discoverProjectConfig(
  owner: string,
  projectNumber: number,
  token?: string
): Promise<{
  success: boolean;
  project?: {
    id: string;
    title: string;
    number: number;
    url: string;
    statusField?: { id: string; name: string; options: Array<{ id: string; name: string }> };
    targetDateField?: { id: string; name: string };
  };
  error?: string;
}> {
  try {
    const authToken = token || getGitHubToken();
    if (!authToken) {
      return { success: false, error: 'GitHub token not configured' };
    }

    const project = await getCachedProjectByNumber(owner, projectNumber, authToken);

    if (!project) {
      return { success: false, error: `Project #${projectNumber} not found for ${owner}` };
    }

    // Find Status field (SingleSelect)
    const statusField = project.fields.nodes.find(
      f => f.name.toLowerCase() === 'status' && f.dataType === 'SINGLE_SELECT'
    );

    // Find Target Date field (Date)
    const targetDateField = project.fields.nodes.find(
      f => (f.name.toLowerCase().includes('target') || f.name.toLowerCase().includes('date'))
        && f.dataType === 'DATE'
    );

    return {
      success: true,
      project: {
        id: project.id,
        title: project.title,
        number: project.number,
        url: project.url,
        statusField: statusField ? {
          id: statusField.id,
          name: statusField.name,
          options: statusField.options || [],
        } : undefined,
        targetDateField: targetDateField ? {
          id: targetDateField.id,
          name: targetDateField.name,
        } : undefined,
      },
    };

  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}
