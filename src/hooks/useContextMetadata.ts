/**
 * useContextMetadata Hook
 *
 * Provides cache-first access to context metadata with automatic revalidation.
 * This hook integrates with the centralized context metadata cache to reduce
 * API calls and keep UI in sync across components.
 *
 * Features:
 * - Cache-first data access
 * - Automatic stale detection
 * - Optimistic update support
 * - Subscription to cache changes
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  useContextMetadataCache,
  useCachedContext,
  useCachedContextsByProject,
  useCachedGroup,
  useCachedGroupsByProject,
} from '@/stores/context/contextMetadataCache';
import type { Context, ContextGroup } from '@/stores/context/contextStoreTypes';

/**
 * Options for the useContextMetadata hook
 */
export interface UseContextMetadataOptions {
  /** Whether to automatically refetch stale data */
  autoRefresh?: boolean;
  /** Callback when context is updated */
  onUpdate?: (context: Context) => void;
}

/**
 * Hook to get a single context with cache-first strategy
 */
export function useContextWithCache(
  contextId: string | null,
  options: UseContextMetadataOptions = {}
) {
  const cache = useContextMetadataCache();
  const cachedContext = useCachedContext(contextId);
  const [isStale, setIsStale] = useState(false);

  // Check staleness on mount and when context changes
  useEffect(() => {
    if (contextId) {
      const { isStale: stale } = cache.getContextWithStaleCheck(contextId);
      setIsStale(stale);
    }
  }, [contextId, cache, cache.cacheVersion]);

  // Notify on updates
  useEffect(() => {
    if (cachedContext && options.onUpdate) {
      options.onUpdate(cachedContext);
    }
  }, [cachedContext, options.onUpdate]);

  return {
    context: cachedContext,
    isStale,
    hasPendingUpdate: contextId ? cache.hasPendingUpdate(contextId) : false,
    invalidate: useCallback(() => {
      if (contextId) {
        cache.invalidateContext(contextId);
      }
    }, [contextId, cache]),
  };
}

/**
 * Hook to get a single group with cache-first strategy
 */
export function useGroupWithCache(groupId: string | null) {
  const cache = useContextMetadataCache();
  const cachedGroup = useCachedGroup(groupId);

  return {
    group: cachedGroup,
    invalidate: useCallback(() => {
      if (groupId) {
        cache.invalidateGroup(groupId);
      }
    }, [groupId, cache]),
  };
}

/**
 * Hook to get all contexts for a project with cache-first strategy
 */
export function useProjectContextsWithCache(projectId: string | null) {
  const cache = useContextMetadataCache();
  const cachedContexts = useCachedContextsByProject(projectId);

  return {
    contexts: cachedContexts,
    invalidateAll: useCallback(() => {
      if (projectId) {
        cache.invalidateProject(projectId);
      }
    }, [projectId, cache]),
  };
}

/**
 * Hook to get all groups for a project with cache-first strategy
 */
export function useProjectGroupsWithCache(projectId: string | null) {
  const cachedGroups = useCachedGroupsByProject(projectId);

  return {
    groups: cachedGroups,
  };
}

/**
 * Hook to perform optimistic context updates
 */
export function useOptimisticContextUpdate() {
  const cache = useContextMetadataCache();

  const applyUpdate = useCallback(
    (contextId: string, updates: Partial<Context>) => {
      cache.applyOptimisticUpdate(contextId, updates);
    },
    [cache]
  );

  const confirmUpdate = useCallback(
    (contextId: string, confirmedContext: Context) => {
      cache.confirmOptimisticUpdate(contextId, confirmedContext);
    },
    [cache]
  );

  const rollbackUpdate = useCallback(
    (contextId: string) => {
      cache.rollbackOptimisticUpdate(contextId);
    },
    [cache]
  );

  return {
    applyUpdate,
    confirmUpdate,
    rollbackUpdate,
  };
}

/**
 * Hook to get cache statistics for debugging/monitoring
 */
export function useContextCacheStats() {
  const cache = useContextMetadataCache();
  return cache.getCacheStats();
}

/**
 * Hook to check if context data needs refresh
 */
export function useContextNeedsRefresh(contextId: string | null): boolean {
  const cache = useContextMetadataCache();
  return contextId ? cache.needsRefresh(contextId) : true;
}

/**
 * Hook to get context with its group information
 */
export function useContextWithGroup(contextId: string | null) {
  const { context } = useContextWithCache(contextId);
  const { group } = useGroupWithCache(context?.groupId ?? null);

  return useMemo(
    () => ({
      context,
      group,
      groupName: group?.name ?? context?.groupName,
      groupColor: group?.color ?? context?.groupColor,
    }),
    [context, group]
  );
}

/**
 * Hook to manage the cache lifecycle
 */
export function useContextCacheManager() {
  const cache = useContextMetadataCache();

  return {
    clearCache: cache.clearCache,
    invalidateProject: cache.invalidateProject,
    getCacheStats: cache.getCacheStats,
  };
}

// Re-export types
export type { Context, ContextGroup };
