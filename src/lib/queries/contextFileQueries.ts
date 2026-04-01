/**
 * Context File Queries
 * TanStack Query hooks for batch loading and caching context file contents
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

// Query Keys
export const contextFileKeys = {
  all: ['context-files'] as const,
  file: (contextId: string) => ['context-files', contextId] as const,
};

// API Functions
export const contextFileApi = {
  /**
   * Load a single context file content
   */
  loadContextFile: async (contextId: string): Promise<string> => {
    const response = await fetch(`/api/context-files/${encodeURIComponent(contextId)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to load context file');
    }

    return response.text();
  },
};

/**
 * Hook to load a single context file content with caching
 */
export function useContextFileContent(contextId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: contextId ? contextFileKeys.file(contextId) : ['context-files', 'none'],
    queryFn: () => contextFileApi.loadContextFile(contextId!),
    enabled: !!contextId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes - context files don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 1,
  });
}

/**
 * Hook to invalidate context file cache
 * Call this after saving a context file
 */
export function useInvalidateContextFileCache() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidate a single context file cache
     */
    invalidateFile: (contextId: string) => {
      queryClient.invalidateQueries({ queryKey: contextFileKeys.file(contextId) });
    },
    /**
     * Invalidate multiple context file caches
     */
    invalidateFiles: (contextIds: string[]) => {
      contextIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: contextFileKeys.file(id) });
      });
    },
    /**
     * Invalidate all context file caches
     */
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: contextFileKeys.all });
    },
  };
}
