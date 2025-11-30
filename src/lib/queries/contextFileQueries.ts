/**
 * Context File Queries
 * TanStack Query hooks for batch loading and caching context file contents
 */

import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';

// Query Keys
export const contextFileKeys = {
  all: ['context-files'] as const,
  file: (contextId: string) => ['context-files', contextId] as const,
  batch: (contextIds: string[]) => ['context-files', 'batch', ...contextIds.sort()] as const,
};

// Types
export interface ContextFileContent {
  contextId: string;
  content: string;
  isLoading: boolean;
  error: string | null;
}

export interface BatchContextFileResult {
  contextId: string;
  success: boolean;
  content?: string;
  error?: string;
}

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

  /**
   * Batch load multiple context file contents
   */
  batchLoadContextFiles: async (contextIds: string[]): Promise<BatchContextFileResult[]> => {
    if (contextIds.length === 0) {
      return [];
    }

    const response = await fetch('/api/context-files/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contextIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to batch load context files');
    }

    const data = await response.json();
    return data.results;
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
 * Hook to batch load multiple context file contents with individual caching
 * Each file is cached separately for maximum reuse
 */
export function useContextFilesBatch(contextIds: string[]) {
  // Use useQueries to get individual queries for each context file
  const queries = useQueries({
    queries: contextIds.map((contextId) => ({
      queryKey: contextFileKeys.file(contextId),
      queryFn: () => contextFileApi.loadContextFile(contextId),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    })),
  });

  // Transform results into a more usable format
  const results: Map<string, ContextFileContent> = new Map();

  contextIds.forEach((contextId, index) => {
    const query = queries[index];
    results.set(contextId, {
      contextId,
      content: query.data || '',
      isLoading: query.isLoading,
      error: query.error ? (query.error as Error).message : null,
    });
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  return {
    results,
    isLoading,
    isError,
    // Helper to get a single file's content
    getContent: (contextId: string): string | undefined => results.get(contextId)?.content,
    // Helper to check if a single file is loading
    isFileLoading: (contextId: string): boolean => results.get(contextId)?.isLoading ?? false,
  };
}

/**
 * Hook to prefetch context file contents
 * Useful when you know files will be needed soon
 */
export function usePrefetchContextFiles() {
  const queryClient = useQueryClient();

  return {
    prefetch: async (contextIds: string[]) => {
      // Filter out already cached files
      const uncachedIds = contextIds.filter((id) => {
        const cached = queryClient.getQueryData(contextFileKeys.file(id));
        return cached === undefined;
      });

      if (uncachedIds.length === 0) return;

      // Batch fetch uncached files
      try {
        const results = await contextFileApi.batchLoadContextFiles(uncachedIds);

        // Populate individual caches
        results.forEach((result) => {
          if (result.success && result.content) {
            queryClient.setQueryData(contextFileKeys.file(result.contextId), result.content);
          }
        });
      } catch (error) {
        console.warn('[contextFileQueries] Prefetch failed:', error);
      }
    },
    prefetchSingle: (contextId: string) => {
      return queryClient.prefetchQuery({
        queryKey: contextFileKeys.file(contextId),
        queryFn: () => contextFileApi.loadContextFile(contextId),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
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

/**
 * Hook to directly get/set context file content in cache
 * Useful for optimistic updates
 */
export function useContextFileCache() {
  const queryClient = useQueryClient();

  return {
    /**
     * Get cached content for a context file
     */
    getContent: (contextId: string): string | undefined => {
      return queryClient.getQueryData<string>(contextFileKeys.file(contextId));
    },
    /**
     * Set content in cache (for optimistic updates)
     */
    setContent: (contextId: string, content: string) => {
      queryClient.setQueryData(contextFileKeys.file(contextId), content);
    },
    /**
     * Check if a file is cached
     */
    isCached: (contextId: string): boolean => {
      return queryClient.getQueryData(contextFileKeys.file(contextId)) !== undefined;
    },
  };
}
