import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { DbScan } from '@/app/db';

// Query key factory for consistent cache keys
export const scanQueryKeys = {
  all: ['scans'] as const,
  lists: () => [...scanQueryKeys.all, 'list'] as const,
  history: (projectId: string) => [...scanQueryKeys.lists(), 'history', projectId] as const,
  detail: (id: string) => [...scanQueryKeys.all, 'detail', id] as const,
};

export interface ScanHistoryPage {
  scans: DbScan[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

// API function for fetching paginated scan history
async function fetchScanHistory(
  projectId: string,
  pageParam: number = 0,
  limit: number = 10
): Promise<ScanHistoryPage> {
  const params = new URLSearchParams({
    projectId,
    offset: pageParam.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`/api/scans?${params.toString()}`, {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch scan history');
  }

  return response.json();
}

/**
 * Hook for fetching paginated scan history with infinite scroll support
 * Uses React Query's useInfiniteQuery for efficient lazy-loading
 */
export function useScanHistory(projectId: string, pageSize: number = 10) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: scanQueryKeys.history(projectId),
    queryFn: ({ pageParam }) => fetchScanHistory(projectId, pageParam, pageSize),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.hasMore) return undefined;
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
    enabled: !!projectId && projectId !== 'all',
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });

  // Flatten all pages into a single array
  const scans = query.data?.pages.flatMap((page) => page.scans) ?? [];

  // Get total count from the first page
  const totalCount = query.data?.pages[0]?.pagination.total ?? 0;

  // Invalidate and refetch
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: scanQueryKeys.history(projectId) });
  }, [queryClient, projectId]);

  return {
    scans,
    totalCount,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error?.message,
    refetch,
  };
}

/**
 * Hook to invalidate all scan queries
 */
export function useInvalidateScans() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: scanQueryKeys.all });
  }, [queryClient]);
}
