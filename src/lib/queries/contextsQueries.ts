/**
 * Contexts Queries
 * TanStack Query hooks for fetching and caching contexts data
 *
 * This module provides optimized caching for the frequently-accessed /api/contexts endpoint.
 * Data is cached per project with a 1-hour stale time to minimize redundant API calls.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';

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

