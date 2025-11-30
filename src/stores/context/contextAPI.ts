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
  getProjectData: async (projectId: string): Promise<{ contexts: Context[]; groups: ContextGroup[] }> => {
    const response = await fetch(`/api/contexts?projectId=${projectId}`);
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
};
