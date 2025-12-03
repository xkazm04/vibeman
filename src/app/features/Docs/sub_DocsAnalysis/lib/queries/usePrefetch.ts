/**
 * Prefetch hooks for DocsAnalysis
 * Enables predictive data loading on hover for smooth navigation
 */

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ContextGroup, Context } from '@/stores/contextStore';
import { docsAnalysisQueryKeys, prefetchQueryKeys } from './queryKeys';
import { fetchProjectContextData } from './apiClient';

// 5 minutes stale time as specified in requirements
const STALE_TIME = 5 * 60 * 1000;
// 10 minutes garbage collection time
const GC_TIME = 10 * 60 * 1000;

/**
 * Hook for prefetching Level 2 data (contexts for a specific group)
 * Triggers background fetch when user hovers over a group node in SystemMap
 * Uses stale-while-revalidate with 5-minute TTL
 */
export function usePrefetchGroupContexts(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const prefetchGroupContexts = useCallback(
    (groupId: string | null) => {
      if (!projectId || !groupId) return;

      // Check if we already have the project data cached
      const cachedData = queryClient.getQueryData<{
        groups: ContextGroup[];
        contexts: Context[];
      }>(docsAnalysisQueryKeys.projectData(projectId));

      // If data is already cached and fresh, no need to prefetch
      const queryState = queryClient.getQueryState(docsAnalysisQueryKeys.projectData(projectId));

      if (cachedData && queryState && !queryState.isInvalidated) {
        // Data is cached, just warm the cache for the specific group's contexts
        // This ensures the filtered view is ready instantly
        const groupContexts = cachedData.contexts.filter(c => c.groupId === groupId);

        // Pre-compute and cache the filtered result for instant access
        queryClient.setQueryData(prefetchQueryKeys.groupContexts(groupId), groupContexts);
        return;
      }

      // If not cached, prefetch the full project data
      queryClient.prefetchQuery({
        queryKey: docsAnalysisQueryKeys.projectData(projectId),
        queryFn: () => fetchProjectContextData(projectId),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    },
    [projectId, queryClient]
  );

  return { prefetchGroupContexts };
}

/**
 * Hook for prefetching Level 3 data (context description/documentation)
 * Triggers background preparation when user hovers over a context in ModuleExplorer
 * Since description is part of the context object, this ensures the context data
 * is warm in cache before user clicks to view documentation
 */
export function usePrefetchContextDocumentation(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const prefetchContextDocumentation = useCallback(
    (contextId: string | null) => {
      if (!projectId || !contextId) return;

      // Get cached project data
      const cachedData = queryClient.getQueryData<{
        groups: ContextGroup[];
        contexts: Context[];
      }>(docsAnalysisQueryKeys.projectData(projectId));

      if (cachedData) {
        // Find the specific context and pre-warm it
        const context = cachedData.contexts.find(c => c.id === contextId);
        if (context) {
          // Cache the individual context for instant access
          queryClient.setQueryData(prefetchQueryKeys.contextDescription(contextId), context);
        }
        return;
      }

      // If project data not cached, prefetch it
      queryClient.prefetchQuery({
        queryKey: docsAnalysisQueryKeys.projectData(projectId),
        queryFn: () => fetchProjectContextData(projectId),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    },
    [projectId, queryClient]
  );

  return { prefetchContextDocumentation };
}

/**
 * Combined prefetch hook for use in DocsAnalysisLayout
 * Provides both Level 2 and Level 3 prefetch capabilities
 */
export function useDocsAnalysisPrefetch(projectId: string | undefined) {
  const { prefetchGroupContexts } = usePrefetchGroupContexts(projectId);
  const { prefetchContextDocumentation } = usePrefetchContextDocumentation(projectId);

  return {
    prefetchGroupContexts,
    prefetchContextDocumentation,
  };
}
