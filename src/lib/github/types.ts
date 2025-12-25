/**
 * GitHub Projects V2 Integration Types
 * Types for syncing Goals with GitHub Projects roadmap
 */

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface GitHubProjectConfig {
  /** GitHub Personal Access Token with 'project' scope */
  token: string;
  /** GitHub Project ID (from project URL or GraphQL) */
  projectId: string;
  /** Project number (for display, e.g., "Project #5") */
  projectNumber?: number;
  /** Owner login (user or org) */
  owner: string;
  /** Field ID for Status column */
  statusFieldId?: string;
  /** Field ID for Target Date column (optional) */
  targetDateFieldId?: string;
  /** Mapping of goal status to GitHub status option IDs */
  statusMapping?: StatusMapping;
}

export interface StatusMapping {
  open?: string;       // Option ID for "Todo" status
  in_progress?: string; // Option ID for "In Progress" status
  done?: string;       // Option ID for "Done" status
}

// ============================================================================
// GRAPHQL RESPONSE TYPES
// ============================================================================

export interface GitHubProjectItem {
  id: string;
  content?: {
    __typename: string;
    title?: string;
    body?: string;
  } | null;
  fieldValues?: {
    nodes: Array<{
      __typename: string;
      field?: { name: string };
      name?: string;  // For SingleSelectFieldValue
      date?: string;  // For DateFieldValue
      text?: string;  // For TextFieldValue
    }>;
  };
}

export interface GitHubProject {
  id: string;
  title: string;
  number: number;
  url: string;
  fields: {
    nodes: Array<{
      id: string;
      name: string;
      dataType: string;
      options?: Array<{
        id: string;
        name: string;
      }>;
    }>;
  };
}

// ============================================================================
// SYNC TYPES
// ============================================================================

export interface GitHubSyncResult {
  success: boolean;
  operation: 'create' | 'update' | 'delete';
  goalId: string;
  githubItemId?: string;
  error?: string;
}

export interface GitHubBatchSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  results: GitHubSyncResult[];
}

// ============================================================================
// GOAL STATUS TO GITHUB STATUS MAPPING
// ============================================================================

export type GoalStatus = 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';

/** Default status names in GitHub Projects */
export const DEFAULT_STATUS_NAMES: Record<GoalStatus, string> = {
  open: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  rejected: 'Done',      // Map rejected to Done
  undecided: 'Todo',     // Map undecided to Todo
};
