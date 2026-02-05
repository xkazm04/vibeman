/**
 * Context API Client
 * Handles all API communication for contexts and groups
 */

import { Context, ContextGroup } from './contextStoreTypes';

/**
 * Transform date strings to Date objects in API responses
 */
function transformDates<T extends Record<string, unknown>>(obj: T): T {
  return {
    ...obj,
    createdAt: new Date(obj.createdAt as string),
    updatedAt: new Date(obj.updatedAt as string),
  } as T;
}

/**
 * API client for context and group operations
 */
export const contextAPI = {
  /**
   * Get all contexts and groups for a project
   */
  getProjectData: async (projectId: string, signal?: AbortSignal): Promise<{ contexts: Context[]; groups: ContextGroup[] }> => {
    const response = await fetch(`/api/contexts?projectId=${projectId}`, { signal });
    if (!response.ok) {
      throw new Error('Failed to fetch project data');
    }
    const result = await response.json();

    const contexts = result.data.contexts.map((ctx: Record<string, unknown>) =>
      transformDates(ctx)
    );
    const groups = result.data.groups.map((group: Record<string, unknown>) =>
      transformDates(group)
    );

    return { contexts, groups };
  },

  /**
   * Create a new context
   */
  createContext: async (contextData: {
    projectId: string;
    groupId?: string | null;
    name: string;
    description?: string;
    filePaths: string[];
    hasContextFile?: boolean;
    contextFilePath?: string;
  }): Promise<Context> => {
    const response = await fetch('/api/contexts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contextData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create context');
    }

    const result = await response.json();
    return transformDates(result.data);
  },

  /**
   * Update a context
   */
  updateContext: async (contextId: string, updates: {
    name?: string;
    description?: string;
    filePaths?: string[];
    groupId?: string | null;
  }): Promise<Context> => {
    const response = await fetch('/api/contexts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextId, updates }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update context');
    }

    const result = await response.json();
    return transformDates(result.data);
  },

  /**
   * Delete a context
   */
  deleteContext: async (contextId: string): Promise<boolean> => {
    const response = await fetch(`/api/contexts?contextId=${contextId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete context');
    }

    return true;
  },

  /**
   * Delete all contexts for a project
   */
  deleteAllContexts: async (projectId: string): Promise<number> => {
    const response = await fetch(`/api/contexts?projectId=${projectId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete all contexts');
    }

    const result = await response.json();
    return result.deletedCount;
  },

  /**
   * Create a new group
   */
  createGroup: async (groupData: {
    projectId: string;
    name: string;
    color?: string;
    icon?: string;
  }): Promise<ContextGroup> => {
    const response = await fetch('/api/context-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create group');
    }

    const result = await response.json();
    return transformDates(result.data);
  },

  /**
   * Update a group
   */
  updateGroup: async (groupId: string, updates: {
    name?: string;
    color?: string;
    icon?: string;
    type?: 'pages' | 'client' | 'server' | 'external' | null;
  }): Promise<ContextGroup> => {
    const response = await fetch('/api/context-groups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, updates }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update group');
    }

    const result = await response.json();
    return transformDates(result.data);
  },

  /**
   * Delete a group
   */
  deleteGroup: async (groupId: string): Promise<boolean> => {
    const response = await fetch(`/api/context-groups?groupId=${groupId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete group');
    }

    return true;
  },

  /**
   * Delete all groups for a project
   */
  deleteAllGroups: async (projectId: string): Promise<number> => {
    const response = await fetch(`/api/context-groups?projectId=${projectId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete all groups');
    }

    const data = await response.json();
    return data.deletedCount || 0;
  },

  /**
   * Batch move multiple contexts to new groups in a single API call
   * Reduces O(n) API calls to O(1) for drag-drop operations
   */
  batchMoveContexts: async (moves: Array<{ contextId: string; newGroupId: string | null }>): Promise<Context[]> => {
    const response = await fetch('/api/contexts/batch-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moves }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to batch move contexts');
    }

    const result = await response.json();
    return result.data.map((ctx: Record<string, unknown>) => transformDates(ctx));
  },
};
