/**
 * Context Metadata Cache Store
 *
 * A centralized in-memory cache layer for context metadata (name, description, files, group).
 * Reduces redundant API calls and keeps UI in sync across modals, file previews, and target popup.
 *
 * Features:
 * - Keyed by context ID for O(1) access
 * - Optimistic updates for form submissions
 * - Invalidation on PUT/DELETE operations
 * - TTL-based stale detection
 * - Persistence for session continuity
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Context, ContextGroup } from './contextStoreTypes';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Cached context metadata entry
 */
export interface CachedContextMetadata {
  context: Context;
  cachedAt: number;
  isStale: boolean;
}

/**
 * Cached group metadata entry
 */
export interface CachedGroupMetadata {
  group: ContextGroup;
  cachedAt: number;
  isStale: boolean;
}

/**
 * Pending optimistic update
 */
export interface OptimisticUpdate {
  contextId: string;
  previousData: Context;
  pendingData: Partial<Context>;
  timestamp: number;
}

/**
 * Context metadata cache state
 */
interface ContextMetadataCacheState {
  // Context cache keyed by ID
  contextCache: Map<string, CachedContextMetadata>;

  // Group cache keyed by ID
  groupCache: Map<string, CachedGroupMetadata>;

  // Pending optimistic updates
  pendingUpdates: Map<string, OptimisticUpdate>;

  // Project-specific cache index
  projectContextIds: Map<string, Set<string>>;
  projectGroupIds: Map<string, Set<string>>;

  // Cache version for invalidation
  cacheVersion: number;
}

/**
 * Context metadata cache actions
 */
interface ContextMetadataCacheActions {
  // === Context Operations ===

  /**
   * Get a context from cache by ID
   */
  getContext: (contextId: string) => Context | undefined;

  /**
   * Get a context with stale check
   */
  getContextWithStaleCheck: (contextId: string) => { context: Context | undefined; isStale: boolean };

  /**
   * Set a context in cache
   */
  setContext: (context: Context) => void;

  /**
   * Batch set multiple contexts
   */
  setContexts: (contexts: Context[]) => void;

  /**
   * Get all contexts for a project
   */
  getContextsByProject: (projectId: string) => Context[];

  /**
   * Invalidate a context cache entry
   */
  invalidateContext: (contextId: string) => void;

  /**
   * Remove a context from cache (on delete)
   */
  removeContext: (contextId: string) => void;

  // === Group Operations ===

  /**
   * Get a group from cache by ID
   */
  getGroup: (groupId: string) => ContextGroup | undefined;

  /**
   * Set a group in cache
   */
  setGroup: (group: ContextGroup) => void;

  /**
   * Batch set multiple groups
   */
  setGroups: (groups: ContextGroup[]) => void;

  /**
   * Get all groups for a project
   */
  getGroupsByProject: (projectId: string) => ContextGroup[];

  /**
   * Invalidate a group cache entry
   */
  invalidateGroup: (groupId: string) => void;

  /**
   * Remove a group from cache
   */
  removeGroup: (groupId: string) => void;

  // === Optimistic Updates ===

  /**
   * Apply an optimistic update
   */
  applyOptimisticUpdate: (contextId: string, updates: Partial<Context>) => void;

  /**
   * Confirm an optimistic update (on API success)
   */
  confirmOptimisticUpdate: (contextId: string, confirmedContext: Context) => void;

  /**
   * Rollback an optimistic update (on API failure)
   */
  rollbackOptimisticUpdate: (contextId: string) => void;

  /**
   * Check if there's a pending update for a context
   */
  hasPendingUpdate: (contextId: string) => boolean;

  // === Cache Management ===

  /**
   * Invalidate all cache entries for a project
   */
  invalidateProject: (projectId: string) => void;

  /**
   * Clear entire cache
   */
  clearCache: () => void;

  /**
   * Check if a context needs refresh
   */
  needsRefresh: (contextId: string) => boolean;

  /**
   * Mark context as stale
   */
  markContextStale: (contextId: string) => void;

  /**
   * Get cache statistics
   */
  getCacheStats: () => {
    contextCount: number;
    groupCount: number;
    pendingUpdates: number;
    cacheVersion: number;
  };
}

type ContextMetadataCacheStore = ContextMetadataCacheState & ContextMetadataCacheActions;

/**
 * Check if a cache entry is stale based on TTL
 */
function isEntryStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > CACHE_TTL;
}

/**
 * Create initial state
 */
function createInitialState(): ContextMetadataCacheState {
  return {
    contextCache: new Map(),
    groupCache: new Map(),
    pendingUpdates: new Map(),
    projectContextIds: new Map(),
    projectGroupIds: new Map(),
    cacheVersion: 0,
  };
}

/**
 * Custom storage that handles Map serialization
 */
const mapStorage = createJSONStorage<ContextMetadataCacheState>(() => ({
  getItem: (name: string): string | null => {
    const item = sessionStorage.getItem(name);
    if (!item) return null;

    try {
      const parsed = JSON.parse(item);

      // Convert arrays back to Maps
      if (parsed.state) {
        if (Array.isArray(parsed.state.contextCache)) {
          parsed.state.contextCache = new Map(parsed.state.contextCache);
        }
        if (Array.isArray(parsed.state.groupCache)) {
          parsed.state.groupCache = new Map(parsed.state.groupCache);
        }
        if (Array.isArray(parsed.state.pendingUpdates)) {
          parsed.state.pendingUpdates = new Map(parsed.state.pendingUpdates);
        }
        if (Array.isArray(parsed.state.projectContextIds)) {
          parsed.state.projectContextIds = new Map(
            parsed.state.projectContextIds.map(([k, v]: [string, string[]]) => [k, new Set(v)])
          );
        }
        if (Array.isArray(parsed.state.projectGroupIds)) {
          parsed.state.projectGroupIds = new Map(
            parsed.state.projectGroupIds.map(([k, v]: [string, string[]]) => [k, new Set(v)])
          );
        }
      }

      return JSON.stringify(parsed);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      const parsed = JSON.parse(value);

      // Convert Maps to arrays for serialization
      if (parsed.state) {
        if (parsed.state.contextCache instanceof Map) {
          parsed.state.contextCache = Array.from(parsed.state.contextCache.entries());
        }
        if (parsed.state.groupCache instanceof Map) {
          parsed.state.groupCache = Array.from(parsed.state.groupCache.entries());
        }
        if (parsed.state.pendingUpdates instanceof Map) {
          parsed.state.pendingUpdates = Array.from(parsed.state.pendingUpdates.entries());
        }
        if (parsed.state.projectContextIds instanceof Map) {
          parsed.state.projectContextIds = Array.from(
            parsed.state.projectContextIds.entries() as Iterable<[string, Set<string>]>
          ).map(([k, v]) => [k, Array.from(v)]);
        }
        if (parsed.state.projectGroupIds instanceof Map) {
          parsed.state.projectGroupIds = Array.from(
            parsed.state.projectGroupIds.entries() as Iterable<[string, Set<string>]>
          ).map(([k, v]) => [k, Array.from(v)]);
        }
      }

      sessionStorage.setItem(name, JSON.stringify(parsed));
    } catch (error) {
      console.warn('[ContextMetadataCache] Failed to persist cache:', error);
    }
  },
  removeItem: (name: string): void => {
    sessionStorage.removeItem(name);
  },
}));

/**
 * Context Metadata Cache Store
 *
 * Provides centralized caching for context metadata with optimistic updates
 */
export const useContextMetadataCache = create<ContextMetadataCacheStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      // === Context Operations ===

      getContext: (contextId: string) => {
        const state = get();
        const cached = state.contextCache.get(contextId);

        if (!cached) return undefined;

        // Check for pending optimistic update
        const pending = state.pendingUpdates.get(contextId);
        if (pending) {
          return { ...cached.context, ...pending.pendingData };
        }

        return cached.context;
      },

      getContextWithStaleCheck: (contextId: string) => {
        const state = get();
        const cached = state.contextCache.get(contextId);

        if (!cached) {
          return { context: undefined, isStale: true };
        }

        const isStale = cached.isStale || isEntryStale(cached.cachedAt);

        // Apply pending updates if any
        const pending = state.pendingUpdates.get(contextId);
        const context = pending
          ? { ...cached.context, ...pending.pendingData }
          : cached.context;

        return { context, isStale };
      },

      setContext: (context: Context) => {
        set((state) => {
          const newContextCache = new Map(state.contextCache);
          newContextCache.set(context.id, {
            context,
            cachedAt: Date.now(),
            isStale: false,
          });

          // Update project index
          const newProjectContextIds = new Map(state.projectContextIds);
          const projectSet = newProjectContextIds.get(context.projectId) || new Set();
          projectSet.add(context.id);
          newProjectContextIds.set(context.projectId, projectSet);

          return {
            contextCache: newContextCache,
            projectContextIds: newProjectContextIds,
          };
        });
      },

      setContexts: (contexts: Context[]) => {
        // Defensive check: ensure contexts is an iterable array
        if (!Array.isArray(contexts)) {
          console.warn('[ContextMetadataCache] setContexts called with non-array:', contexts);
          return;
        }

        set((state) => {
          const newContextCache = new Map(state.contextCache);
          const newProjectContextIds = new Map(state.projectContextIds);
          const now = Date.now();

          for (const context of contexts) {
            newContextCache.set(context.id, {
              context,
              cachedAt: now,
              isStale: false,
            });

            // Update project index
            const projectSet = newProjectContextIds.get(context.projectId) || new Set();
            projectSet.add(context.id);
            newProjectContextIds.set(context.projectId, projectSet);
          }

          return {
            contextCache: newContextCache,
            projectContextIds: newProjectContextIds,
          };
        });
      },

      getContextsByProject: (projectId: string) => {
        const state = get();
        const contextIds = state.projectContextIds.get(projectId);

        if (!contextIds) return [];

        const contexts: Context[] = [];
        for (const contextId of contextIds) {
          const context = state.getContext(contextId);
          if (context) {
            contexts.push(context);
          }
        }

        return contexts;
      },

      invalidateContext: (contextId: string) => {
        set((state) => {
          const cached = state.contextCache.get(contextId);
          if (!cached) return state;

          const newContextCache = new Map(state.contextCache);
          newContextCache.set(contextId, {
            ...cached,
            isStale: true,
          });

          return {
            contextCache: newContextCache,
            cacheVersion: state.cacheVersion + 1,
          };
        });
      },

      removeContext: (contextId: string) => {
        set((state) => {
          const cached = state.contextCache.get(contextId);
          if (!cached) return state;

          const newContextCache = new Map(state.contextCache);
          newContextCache.delete(contextId);

          // Remove from project index
          const newProjectContextIds = new Map(state.projectContextIds);
          const projectSet = newProjectContextIds.get(cached.context.projectId);
          if (projectSet) {
            projectSet.delete(contextId);
          }

          // Remove any pending updates
          const newPendingUpdates = new Map(state.pendingUpdates);
          newPendingUpdates.delete(contextId);

          return {
            contextCache: newContextCache,
            projectContextIds: newProjectContextIds,
            pendingUpdates: newPendingUpdates,
            cacheVersion: state.cacheVersion + 1,
          };
        });
      },

      // === Group Operations ===

      getGroup: (groupId: string) => {
        const cached = get().groupCache.get(groupId);
        return cached?.group;
      },

      setGroup: (group: ContextGroup) => {
        set((state) => {
          const newGroupCache = new Map(state.groupCache);
          newGroupCache.set(group.id, {
            group,
            cachedAt: Date.now(),
            isStale: false,
          });

          // Update project index
          const newProjectGroupIds = new Map(state.projectGroupIds);
          const projectSet = newProjectGroupIds.get(group.projectId) || new Set();
          projectSet.add(group.id);
          newProjectGroupIds.set(group.projectId, projectSet);

          return {
            groupCache: newGroupCache,
            projectGroupIds: newProjectGroupIds,
          };
        });
      },

      setGroups: (groups: ContextGroup[]) => {
        // Defensive check: ensure groups is an iterable array
        if (!Array.isArray(groups)) {
          console.warn('[ContextMetadataCache] setGroups called with non-array:', groups);
          return;
        }

        set((state) => {
          const newGroupCache = new Map(state.groupCache);
          const newProjectGroupIds = new Map(state.projectGroupIds);
          const now = Date.now();

          for (const group of groups) {
            newGroupCache.set(group.id, {
              group,
              cachedAt: now,
              isStale: false,
            });

            // Update project index
            const projectSet = newProjectGroupIds.get(group.projectId) || new Set();
            projectSet.add(group.id);
            newProjectGroupIds.set(group.projectId, projectSet);
          }

          return {
            groupCache: newGroupCache,
            projectGroupIds: newProjectGroupIds,
          };
        });
      },

      getGroupsByProject: (projectId: string) => {
        const state = get();
        const groupIds = state.projectGroupIds.get(projectId);

        if (!groupIds) return [];

        const groups: ContextGroup[] = [];
        for (const groupId of groupIds) {
          const group = state.getGroup(groupId);
          if (group) {
            groups.push(group);
          }
        }

        return groups.sort((a, b) => a.position - b.position);
      },

      invalidateGroup: (groupId: string) => {
        set((state) => {
          const cached = state.groupCache.get(groupId);
          if (!cached) return state;

          const newGroupCache = new Map(state.groupCache);
          newGroupCache.set(groupId, {
            ...cached,
            isStale: true,
          });

          return {
            groupCache: newGroupCache,
            cacheVersion: state.cacheVersion + 1,
          };
        });
      },

      removeGroup: (groupId: string) => {
        set((state) => {
          const cached = state.groupCache.get(groupId);
          if (!cached) return state;

          const newGroupCache = new Map(state.groupCache);
          newGroupCache.delete(groupId);

          // Remove from project index
          const newProjectGroupIds = new Map(state.projectGroupIds);
          const projectSet = newProjectGroupIds.get(cached.group.projectId);
          if (projectSet) {
            projectSet.delete(groupId);
          }

          return {
            groupCache: newGroupCache,
            projectGroupIds: newProjectGroupIds,
            cacheVersion: state.cacheVersion + 1,
          };
        });
      },

      // === Optimistic Updates ===

      applyOptimisticUpdate: (contextId: string, updates: Partial<Context>) => {
        set((state) => {
          const cached = state.contextCache.get(contextId);
          if (!cached) return state;

          const newPendingUpdates = new Map(state.pendingUpdates);
          newPendingUpdates.set(contextId, {
            contextId,
            previousData: cached.context,
            pendingData: updates,
            timestamp: Date.now(),
          });

          return { pendingUpdates: newPendingUpdates };
        });
      },

      confirmOptimisticUpdate: (contextId: string, confirmedContext: Context) => {
        set((state) => {
          // Remove pending update
          const newPendingUpdates = new Map(state.pendingUpdates);
          newPendingUpdates.delete(contextId);

          // Update cache with confirmed data
          const newContextCache = new Map(state.contextCache);
          newContextCache.set(contextId, {
            context: confirmedContext,
            cachedAt: Date.now(),
            isStale: false,
          });

          return {
            pendingUpdates: newPendingUpdates,
            contextCache: newContextCache,
          };
        });
      },

      rollbackOptimisticUpdate: (contextId: string) => {
        set((state) => {
          const pending = state.pendingUpdates.get(contextId);
          if (!pending) return state;

          // Restore previous data
          const newContextCache = new Map(state.contextCache);
          newContextCache.set(contextId, {
            context: pending.previousData,
            cachedAt: Date.now(),
            isStale: false,
          });

          // Remove pending update
          const newPendingUpdates = new Map(state.pendingUpdates);
          newPendingUpdates.delete(contextId);

          return {
            pendingUpdates: newPendingUpdates,
            contextCache: newContextCache,
          };
        });
      },

      hasPendingUpdate: (contextId: string) => {
        return get().pendingUpdates.has(contextId);
      },

      // === Cache Management ===

      invalidateProject: (projectId: string) => {
        set((state) => {
          // Invalidate all contexts for project
          const contextIds = state.projectContextIds.get(projectId);
          const newContextCache = new Map(state.contextCache);
          if (contextIds) {
            for (const contextId of contextIds) {
              const cached = newContextCache.get(contextId);
              if (cached) {
                newContextCache.set(contextId, { ...cached, isStale: true });
              }
            }
          }

          // Invalidate all groups for project
          const groupIds = state.projectGroupIds.get(projectId);
          const newGroupCache = new Map(state.groupCache);
          if (groupIds) {
            for (const groupId of groupIds) {
              const cached = newGroupCache.get(groupId);
              if (cached) {
                newGroupCache.set(groupId, { ...cached, isStale: true });
              }
            }
          }

          return {
            contextCache: newContextCache,
            groupCache: newGroupCache,
            cacheVersion: state.cacheVersion + 1,
          };
        });
      },

      clearCache: () => {
        set(createInitialState());
      },

      needsRefresh: (contextId: string) => {
        const state = get();
        const cached = state.contextCache.get(contextId);

        if (!cached) return true;
        if (cached.isStale) return true;
        if (isEntryStale(cached.cachedAt)) return true;

        return false;
      },

      markContextStale: (contextId: string) => {
        set((state) => {
          const cached = state.contextCache.get(contextId);
          if (!cached) return state;

          const newContextCache = new Map(state.contextCache);
          newContextCache.set(contextId, { ...cached, isStale: true });

          return { contextCache: newContextCache };
        });
      },

      getCacheStats: () => {
        const state = get();
        return {
          contextCount: state.contextCache.size,
          groupCount: state.groupCache.size,
          pendingUpdates: state.pendingUpdates.size,
          cacheVersion: state.cacheVersion,
        };
      },
    }),
    {
      name: 'context-metadata-cache',
      storage: mapStorage,
      partialize: (state) => ({
        contextCache: state.contextCache,
        groupCache: state.groupCache,
        projectContextIds: state.projectContextIds,
        projectGroupIds: state.projectGroupIds,
        cacheVersion: state.cacheVersion,
        // Don't persist pending updates - they should be resolved
        pendingUpdates: new Map(),
      }),
    }
  )
);

/**
 * Hook to get a single context with cache
 */
export function useCachedContext(contextId: string | null): Context | undefined {
  const getContext = useContextMetadataCache((state) => state.getContext);
  return contextId ? getContext(contextId) : undefined;
}

/**
 * Hook to get contexts by project with cache
 */
export function useCachedContextsByProject(projectId: string | null): Context[] {
  const getContextsByProject = useContextMetadataCache((state) => state.getContextsByProject);
  return projectId ? getContextsByProject(projectId) : [];
}

/**
 * Hook to get a single group with cache
 */
export function useCachedGroup(groupId: string | null): ContextGroup | undefined {
  const getGroup = useContextMetadataCache((state) => state.getGroup);
  return groupId ? getGroup(groupId) : undefined;
}

/**
 * Hook to get groups by project with cache
 */
export function useCachedGroupsByProject(projectId: string | null): ContextGroup[] {
  const getGroupsByProject = useContextMetadataCache((state) => state.getGroupsByProject);
  return projectId ? getGroupsByProject(projectId) : [];
}
