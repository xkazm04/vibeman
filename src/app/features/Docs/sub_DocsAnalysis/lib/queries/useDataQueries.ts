/**
 * Data fetching hooks for DocsAnalysis
 * Uses React Query for caching with 5-minute stale-while-revalidate TTL
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { docsAnalysisQueryKeys } from './queryKeys';
import { fetchProjectContextData, fetchRelationships } from './apiClient';

// 5 minutes stale time as specified in requirements
const STALE_TIME = 5 * 60 * 1000;
// 10 minutes garbage collection time
const GC_TIME = 10 * 60 * 1000;

/**
 * Hook for fetching project contexts and groups with React Query caching
 * Uses stale-while-revalidate pattern with 5-minute TTL
 */
export function useProjectContextData(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: docsAnalysisQueryKeys.projectData(projectId ?? ''),
    queryFn: () => fetchProjectContextData(projectId!),
    enabled: !!projectId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always check for fresh data on mount, but use stale if available
  });

  const invalidate = useCallback(() => {
    if (projectId) {
      queryClient.invalidateQueries({
        queryKey: docsAnalysisQueryKeys.projectData(projectId),
      });
    }
  }, [queryClient, projectId]);

  return {
    groups: query.data?.groups ?? [],
    contexts: query.data?.contexts ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error?.message,
    invalidate,
    refetch: query.refetch,
  };
}

/**
 * Hook for fetching context group relationships with React Query caching
 * Uses stale-while-revalidate pattern with 5-minute TTL
 */
export function useRelationships(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: docsAnalysisQueryKeys.relationshipsByProject(projectId ?? ''),
    queryFn: () => fetchRelationships(projectId!),
    enabled: !!projectId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });

  const invalidate = useCallback(() => {
    if (projectId) {
      queryClient.invalidateQueries({
        queryKey: docsAnalysisQueryKeys.relationshipsByProject(projectId),
      });
    }
  }, [queryClient, projectId]);

  return {
    relationships: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error?.message,
    invalidate,
    refetch: query.refetch,
  };
}

/**
 * Hook to invalidate all docs analysis queries for a project
 */
export function useInvalidateDocsAnalysis() {
  const queryClient = useQueryClient();

  return useCallback(
    (projectId?: string) => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: docsAnalysisQueryKeys.projectData(projectId),
        });
        queryClient.invalidateQueries({
          queryKey: docsAnalysisQueryKeys.relationshipsByProject(projectId),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: docsAnalysisQueryKeys.all,
        });
      }
    },
    [queryClient]
  );
}
