/**
 * Contexts Queries
 * TanStack Query hooks for fetching and caching contexts data
 *
 * This module provides optimized caching for the frequently-accessed /api/contexts endpoint.
 * Data is cached per project with a 1-hour stale time to minimize redundant API calls.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export interface Context {
  id: string;
  project_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  file_paths: string; // JSON string
  has_context_file: number;
  context_file_path: string | null;
  preview: string | null;
  test_scenario: string | null;
  test_updated: string | null;
  target: string | null;
  target_fulfillment: string | null;
  target_rating: number | null;
  implemented_tasks: number;
  created_at: string;
  updated_at: string;
}

export interface ContextGroup {
  id: string;
  project_id: string;
  name: string;
  color: string;
  accent_color: string | null;
  position: number;
  type: 'pages' | 'client' | 'server' | 'external' | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectContextsData {
  contexts: Context[];
  groups: ContextGroup[];
}

export interface ContextsResponse {
  success: boolean;
  data: ProjectContextsData;
}

export interface CreateContextInput {
  projectId: string;
  groupId?: string | null;
  name: string;
  description?: string;
  filePaths: string[];
  testScenario?: string;
}

export interface UpdateContextInput {
  contextId: string;
  updates: {
    name?: string;
    description?: string;
    filePaths?: string[];
    groupId?: string | null;
    testScenario?: string;
    preview?: string | null;
    target?: string | null;
    target_fulfillment?: string | null;
    target_rating?: number | null;
  };
}

// ============================================================================
// Query Keys
// ============================================================================

export const contextsKeys = {
  all: ['contexts'] as const,
  byProject: (projectId: string) => ['contexts', 'project', projectId] as const,
  byGroup: (groupId: string) => ['contexts', 'group', groupId] as const,
  detail: (contextId: string) => ['contexts', 'detail', contextId] as const,
};

// ============================================================================
// API Functions
// ============================================================================

export const contextsApi = {
  /**
   * Fetch all contexts and groups for a project
   */
  getProjectContexts: async (projectId: string): Promise<ProjectContextsData> => {
    const response = await fetch(`/api/contexts?projectId=${encodeURIComponent(projectId)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch contexts');
    }

    const data: ContextsResponse = await response.json();
    return data.data;
  },

  /**
   * Fetch contexts for a specific group
   */
  getGroupContexts: async (groupId: string): Promise<Context[]> => {
    const response = await fetch(`/api/contexts?groupId=${encodeURIComponent(groupId)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch group contexts');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Create a new context
   */
  createContext: async (input: CreateContextInput): Promise<Context> => {
    const response = await fetch('/api/contexts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: input.projectId,
        groupId: input.groupId,
        name: input.name,
        description: input.description,
        filePaths: input.filePaths,
        testScenario: input.testScenario,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create context');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Update an existing context
   */
  updateContext: async (input: UpdateContextInput): Promise<Context> => {
    const response = await fetch('/api/contexts', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update context');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Delete a context
   */
  deleteContext: async (contextId: string): Promise<void> => {
    const response = await fetch('/api/contexts', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contextId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete context');
    }
  },
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch all contexts and groups for a project
 *
 * Features:
 * - 1-hour cache (staleTime)
 * - Automatic refetch on mount
 * - Shared cache across all components
 *
 * @param projectId - The project ID to fetch contexts for
 * @param options - Additional query options
 */
export function useProjectContexts(
  projectId: string | null,
  options?: Omit<UseQueryOptions<ProjectContextsData, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectId ? contextsKeys.byProject(projectId) : ['contexts', 'none'],
    queryFn: () => contextsApi.getProjectContexts(projectId!),
    enabled: !!projectId && (options?.enabled !== false),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 65 * 60 * 1000, // 65 minutes (5 minutes longer than staleTime)
    retry: 2,
    ...options,
  });
}

/**
 * Hook to fetch contexts for a specific group
 */
export function useGroupContexts(
  groupId: string | null,
  options?: Omit<UseQueryOptions<Context[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: groupId ? contextsKeys.byGroup(groupId) : ['contexts', 'group', 'none'],
    queryFn: () => contextsApi.getGroupContexts(groupId!),
    enabled: !!groupId && (options?.enabled !== false),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 65 * 60 * 1000,
    retry: 2,
    ...options,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new context
 * Automatically invalidates the project's contexts cache
 */
export function useCreateContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contextsApi.createContext,
    onSuccess: (newContext) => {
      // Invalidate the project's contexts cache to refetch
      queryClient.invalidateQueries({
        queryKey: contextsKeys.byProject(newContext.project_id),
      });

      // Also invalidate the group's contexts if the context belongs to a group
      if (newContext.group_id) {
        queryClient.invalidateQueries({
          queryKey: contextsKeys.byGroup(newContext.group_id),
        });
      }
    },
  });
}

/**
 * Hook to update a context
 * Automatically invalidates the project's contexts cache
 */
export function useUpdateContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contextsApi.updateContext,
    onMutate: async (variables) => {
      // Optimistic update: immediately update the cache
      const queryKey = contextsKeys.byProject(variables.contextId.split('-')[0]); // Simplified - should use actual project ID

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ProjectContextsData>(queryKey);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<ProjectContextsData>(queryKey, (old) => {
          if (!old) return old;

          return {
            ...old,
            contexts: old.contexts.map((ctx) =>
              ctx.id === variables.contextId
                ? { ...ctx, ...variables.updates }
                : ctx
            ),
          };
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        const queryKey = contextsKeys.byProject(variables.contextId.split('-')[0]);
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSuccess: (updatedContext) => {
      // Invalidate and refetch to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: contextsKeys.byProject(updatedContext.project_id),
      });

      if (updatedContext.group_id) {
        queryClient.invalidateQueries({
          queryKey: contextsKeys.byGroup(updatedContext.group_id),
        });
      }
    },
  });
}

/**
 * Hook to delete a context
 * Automatically invalidates the project's contexts cache
 */
export function useDeleteContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contextsApi.deleteContext,
    onSuccess: (_, contextId) => {
      // Invalidate all contexts queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: contextsKeys.all,
      });
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to manually invalidate contexts cache
 * Useful for triggering refetch after external changes
 */
export function useInvalidateContexts() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidate contexts for a specific project
     */
    invalidateProject: (projectId: string) => {
      queryClient.invalidateQueries({
        queryKey: contextsKeys.byProject(projectId),
      });
    },
    /**
     * Invalidate contexts for a specific group
     */
    invalidateGroup: (groupId: string) => {
      queryClient.invalidateQueries({
        queryKey: contextsKeys.byGroup(groupId),
      });
    },
    /**
     * Invalidate all contexts caches
     */
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: contextsKeys.all,
      });
    },
  };
}

/**
 * Hook to prefetch contexts for a project
 * Useful for preloading data before navigation
 */
export function usePrefetchProjectContexts() {
  const queryClient = useQueryClient();

  return {
    prefetch: async (projectId: string) => {
      await queryClient.prefetchQuery({
        queryKey: contextsKeys.byProject(projectId),
        queryFn: () => contextsApi.getProjectContexts(projectId),
        staleTime: 60 * 60 * 1000,
      });
    },
  };
}
