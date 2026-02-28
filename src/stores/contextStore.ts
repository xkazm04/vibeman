'use client';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { CONTEXT_GROUP_COLORS } from '@/lib/constants/contextColors';
import { contextAPI } from './context/contextAPI';
import type { Context, ContextGroup, ContextState, ContextStore } from './context/contextStoreTypes';
import {
  createErrorState,
  createSuccessState,
  updateArrayItem,
  removeArrayItem,
  addArrayItem,
  createDebouncedLoadingManager,
  type DebouncedLoadingManager
} from './utils/storeHelpers';
import { toast } from './messageStore';

// Singleton debounced loading manager for the context store
// Initialized lazily to avoid issues with SSR
let loadingManager: DebouncedLoadingManager | null = null;

function getLoadingManager(set: (state: Partial<ContextStoreState>) => void): DebouncedLoadingManager {
  if (!loadingManager) {
    loadingManager = createDebouncedLoadingManager(
      (loading) => set({ loading, error: null }),
      150 // 150ms delay before showing loading spinner
    );
  }
  return loadingManager;
}

// Re-export for backward compatibility
export { CONTEXT_GROUP_COLORS };
export type { Context, ContextGroup } from './context/contextStoreTypes';

/**
 * Zustand state management for contexts with database integration
 *
 * This store manages contexts and context groups for projects, providing:
 * - CRUD operations for contexts and groups
 * - Context selection for backlog generation
 * - Loading and error states
 * - Synchronized state updates across components
 *
 * PERFORMANCE: Use selectors to subscribe to specific state slices:
 * const contexts = useContextStore(state => state.contexts);
 * const { addContext, removeContext } = useContextStore(useShallow(state => ({ addContext: state.addContext, removeContext: state.removeContext })));
 */

// Pending move operation for batch processing
interface PendingMove {
  contextId: string;
  newGroupId: string | null;
}

interface ContextStoreState extends ContextState {
  // Pending moves for batch processing during drag-drop
  pendingMoves: PendingMove[];

  // Context operations
  addContext: (contextData: {
    projectId: string;
    groupId?: string | null;
    name: string;
    description?: string;
    filePaths: string[];
    hasContextFile?: boolean;
    contextFilePath?: string;
  }) => Promise<void>;
  removeContext: (contextId: string) => Promise<void>;
  updateContext: (contextId: string, updates: {
    name?: string;
    description?: string;
    filePaths?: string[];
    groupId?: string | null;
    target?: string | null;
    target_fulfillment?: string | null;
  }) => Promise<void>;
  moveContext: (contextId: string, newGroupId: string | null) => Promise<void>;

  // Batch move operations for drag-drop sessions
  queueMove: (contextId: string, newGroupId: string | null) => void;
  flushPendingMoves: () => Promise<void>;
  clearPendingMoves: () => void;

  // Group operations
  addGroup: (groupData: {
    projectId: string;
    name: string;
    color?: string;
    icon?: string;
  }) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, updates: {
    name?: string;
    color?: string;
    type?: 'pages' | 'client' | 'server' | 'external' | null;
    icon?: string;
  }) => Promise<void>;

  // Context selection for backlog generation
  toggleContextSelection: (contextId: string) => void;
  setSelectedContext: (contextId: string) => void;
  clearContextSelection: () => void;
  selectAllContexts: () => void;

  // Data loading
  loadProjectData: (projectId: string, signal?: AbortSignal) => Promise<void>;
  clearAllContexts: () => void;
  deleteAllContexts: (projectId: string) => Promise<number>;
  removeAllGroups: (projectId: string) => Promise<number>;
  getContext: (contextId: string) => Context | undefined;
  getGroup: (groupId: string) => ContextGroup | undefined;
  getContextsByGroup: (groupId: string) => Context[];
}

const useContextStoreBase = create<ContextStoreState>()((set, get) => ({
  // Initial state
  contexts: [],
  groups: [],
  loading: false,
  error: null,
  initialized: false,
  selectedContextIds: new Set<string>(),
  pendingMoves: [],

  // Load all project data (groups and contexts)
  loadProjectData: async (projectId: string, signal?: AbortSignal) => {
    if (!projectId) return;

    const manager = getLoadingManager(set);
    // Force loading for initial data fetch (user expects to see loading)
    manager.forceLoading();

    try {
      const { groups, contexts } = await contextAPI.getProjectData(projectId, signal);

      if (signal?.aborted) {
        manager.reset();
        return;
      }

      manager.reset();
      set({
        groups,
        contexts,
        ...createSuccessState(),
        initialized: true,
      });
    } catch (error) {
      manager.reset();
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      set(createErrorState(error, 'Failed to load contexts'));
    }
  },

  // Add a new context (optimistic with temp ID, replaced on server response)
  addContext: async (contextData) => {
    // Create optimistic context with temporary ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticContext: Context = {
      id: tempId,
      projectId: contextData.projectId,
      groupId: contextData.groupId || null,
      name: contextData.name,
      description: contextData.description || '',
      filePaths: contextData.filePaths,
      hasContextFile: contextData.hasContextFile || false,
      contextFilePath: contextData.contextFilePath || undefined,
      target: null,
      target_fulfillment: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Optimistically add to UI immediately
    set(state => ({
      contexts: addArrayItem(state.contexts, optimisticContext, 'start'),
    }));

    try {
      // Use the new generate-context API endpoint
      const response = await fetch('/api/kiro/generate-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextName: contextData.name,
          description: contextData.description,
          filePaths: contextData.filePaths,
          groupId: contextData.groupId,
          projectId: contextData.projectId,
          generateFile: false // Don't generate file by default
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create context');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create context');
      }

      const newContext = result.context;

      // Replace optimistic context with server response (real ID)
      set(state => ({
        contexts: state.contexts.map(ctx =>
          ctx.id === tempId ? newContext : ctx
        ),
      }));
    } catch (error) {
      // Rollback on error - remove optimistic context
      set(state => ({
        contexts: state.contexts.filter(ctx => ctx.id !== tempId),
      }));
      toast.error('Failed to create context', contextData.name);
      throw error;
    }
  },

  // Remove a context (optimistic update)
  removeContext: async (contextId: string) => {
    // Store previous state for rollback
    const previousContexts = get().contexts;
    const removedContext = previousContexts.find(c => c.id === contextId);

    // Optimistically update UI immediately
    set(state => ({
      contexts: removeArrayItem(state.contexts, contextId),
    }));

    try {
      const success = await contextAPI.deleteContext(contextId);

      if (!success) {
        throw new Error('Context not found');
      }
      // Success - state already updated optimistically
    } catch (error) {
      // Rollback on error
      set({ contexts: previousContexts });
      toast.error('Failed to delete context', removedContext?.name || 'Unknown context');
      throw error;
    }
  },

  // Update a context (optimistic update)
  updateContext: async (contextId: string, updates) => {
    // Store previous state for rollback
    const previousContexts = get().contexts;
    const existingContext = previousContexts.find(c => c.id === contextId);

    if (!existingContext) {
      toast.error('Failed to update context', 'Context not found');
      throw new Error('Context not found');
    }

    // Optimistically update UI immediately
    const optimisticContext = { ...existingContext, ...updates, updatedAt: new Date() };
    set(state => ({
      contexts: updateArrayItem(state.contexts, contextId, optimisticContext),
    }));

    try {
      const updatedContext = await contextAPI.updateContext(contextId, updates);

      if (updatedContext) {
        // Sync with server response (may have additional changes)
        set(state => ({
          contexts: updateArrayItem(state.contexts, contextId, updatedContext),
        }));
      } else {
        throw new Error('Context not found');
      }
    } catch (error) {
      // Rollback on error
      set({ contexts: previousContexts });
      toast.error('Failed to update context', existingContext.name);
      throw error;
    }
  },

  // Move context to different group (optimistic update)
  moveContext: async (contextId: string, newGroupId: string | null) => {
    // Store previous state for rollback
    const previousContexts = get().contexts;
    const existingContext = previousContexts.find(c => c.id === contextId);

    if (!existingContext) {
      toast.error('Failed to move context', 'Context not found');
      throw new Error('Context not found');
    }

    // Optimistically update UI immediately
    const optimisticContext = { ...existingContext, groupId: newGroupId, updatedAt: new Date() };
    set(state => ({
      contexts: updateArrayItem(state.contexts, contextId, optimisticContext),
    }));

    try {
      const updatedContext = await contextAPI.updateContext(contextId, { groupId: newGroupId });

      if (updatedContext) {
        // Sync with server response
        set(state => ({
          contexts: updateArrayItem(state.contexts, contextId, updatedContext),
        }));
      } else {
        throw new Error('Context not found');
      }
    } catch (error) {
      // Rollback on error
      set({ contexts: previousContexts });
      toast.error('Failed to move context', existingContext.name);
      throw error;
    }
  },

  // Add a new group (optimistic with temp ID, replaced on server response)
  addGroup: async (groupData) => {
    // Create optimistic group with temporary ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const currentGroups = get().groups;
    const maxPosition = currentGroups.length > 0
      ? Math.max(...currentGroups.map(g => g.position))
      : 0;

    const optimisticGroup: ContextGroup = {
      id: tempId,
      projectId: groupData.projectId,
      name: groupData.name,
      color: groupData.color || '#6366f1',
      icon: groupData.icon || null,
      type: null,
      position: maxPosition + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Optimistically add to UI immediately
    set(state => ({
      groups: [...state.groups, optimisticGroup].sort((a, b) => a.position - b.position),
    }));

    try {
      const newGroup = await contextAPI.createGroup(groupData);

      // Replace optimistic group with server response (real ID)
      set(state => ({
        groups: state.groups.map(g =>
          g.id === tempId ? newGroup : g
        ).sort((a, b) => a.position - b.position),
      }));
    } catch (error) {
      // Rollback on error - remove optimistic group
      set(state => ({
        groups: state.groups.filter(g => g.id !== tempId),
      }));
      toast.error('Failed to create group', groupData.name);
      throw error;
    }
  },

  // Remove a group (optimistic update)
  removeGroup: async (groupId: string) => {
    // Store previous state for rollback
    const previousGroups = get().groups;
    const previousContexts = get().contexts;
    const removedGroup = previousGroups.find(g => g.id === groupId);

    // Optimistically update UI immediately
    set(state => ({
      groups: removeArrayItem(state.groups, groupId),
      contexts: state.contexts.map(ctx =>
        ctx.groupId === groupId ? { ...ctx, groupId: null } : ctx
      ),
    }));

    try {
      const success = await contextAPI.deleteGroup(groupId);

      if (!success) {
        throw new Error('Group not found');
      }
      // Success - state already updated optimistically
    } catch (error) {
      // Rollback on error
      set({ groups: previousGroups, contexts: previousContexts });
      toast.error('Failed to delete group', removedGroup?.name || 'Unknown group');
      throw error;
    }
  },

  // Update a group (optimistic update)
  updateGroup: async (groupId: string, updates) => {
    // Store previous state for rollback
    const previousGroups = get().groups;
    const existingGroup = previousGroups.find(g => g.id === groupId);

    if (!existingGroup) {
      toast.error('Failed to update group', 'Group not found');
      throw new Error('Group not found');
    }

    // Optimistically update UI immediately
    const optimisticGroup = { ...existingGroup, ...updates, updatedAt: new Date() };
    set(state => ({
      groups: updateArrayItem(state.groups, groupId, optimisticGroup)
        .sort((a, b) => a.position - b.position),
    }));

    try {
      const updatedGroup = await contextAPI.updateGroup(groupId, updates);

      if (updatedGroup) {
        // Sync with server response
        set(state => ({
          groups: updateArrayItem(state.groups, groupId, updatedGroup)
            .sort((a, b) => a.position - b.position),
        }));
      } else {
        throw new Error('Group not found');
      }
    } catch (error) {
      // Rollback on error
      set({ groups: previousGroups });
      toast.error('Failed to update group', existingGroup.name);
      throw error;
    }
  },

  // Clear all contexts (local state only)
  clearAllContexts: () => set({
    contexts: [],
    groups: [],
    initialized: false,
  }),

  // Delete all contexts and groups for a project (database + state)
  deleteAllContexts: async (projectId: string) => {
    const manager = getLoadingManager(set);
    // Force loading for bulk delete (user expects feedback)
    manager.forceLoading();

    try {
      // Delete all contexts first
      const deletedCount = await contextAPI.deleteAllContexts(projectId);
      // Then delete all groups
      await contextAPI.deleteAllGroups(projectId);

      manager.reset();
      set(() => ({
        contexts: [],
        groups: [],
        ...createSuccessState(),
      }));

      return deletedCount;
    } catch (error) {
      manager.reset();
      set(createErrorState(error, 'Failed to delete all contexts'));
      throw error;
    }
  },

  // Delete all groups for a project (database + state)
  removeAllGroups: async (projectId: string) => {
    const manager = getLoadingManager(set);
    manager.forceLoading();

    try {
      const deletedCount = await contextAPI.deleteAllGroups(projectId);

      manager.reset();
      set(state => ({
        groups: [],
        // Ungroup all contexts in state
        contexts: state.contexts.map(ctx => ({ ...ctx, groupId: null })),
        ...createSuccessState(),
      }));

      return deletedCount;
    } catch (error) {
      manager.reset();
      set(createErrorState(error, 'Failed to delete all groups'));
      throw error;
    }
  },

  // Get a specific context
  getContext: (contextId: string) => {
    return get().contexts.find(ctx => ctx.id === contextId);
  },

  // Get a specific group
  getGroup: (groupId: string) => {
    return get().groups.find(group => group.id === groupId);
  },

  // Get contexts by group
  getContextsByGroup: (groupId: string) => {
    return get().contexts.filter(ctx => ctx.groupId === groupId);
  },

  // Context selection for backlog generation
  toggleContextSelection: (contextId: string) => {
    set(state => {
      const newSelectedContextIds = new Set(state.selectedContextIds);
      if (newSelectedContextIds.has(contextId)) {
        newSelectedContextIds.delete(contextId);
      } else {
        newSelectedContextIds.add(contextId);
      }
      return { selectedContextIds: newSelectedContextIds };
    });
  },

  setSelectedContext: (contextId: string) => {
    set({ selectedContextIds: new Set([contextId]) });
  },

  clearContextSelection: () => {
    set({ selectedContextIds: new Set() });
  },

  selectAllContexts: () => {
    set(state => ({
      selectedContextIds: new Set(state.contexts.map(ctx => ctx.id))
    }));
  },

  // Queue a context move for batch processing
  // Optimistically updates local state immediately for responsive UI
  queueMove: (contextId: string, newGroupId: string | null) => {
    set(state => {
      // Check if there's already a pending move for this context
      const existingIndex = state.pendingMoves.findIndex(m => m.contextId === contextId);
      const newPendingMoves = [...state.pendingMoves];

      if (existingIndex >= 0) {
        // Update existing pending move
        newPendingMoves[existingIndex] = { contextId, newGroupId };
      } else {
        // Add new pending move
        newPendingMoves.push({ contextId, newGroupId });
      }

      // Optimistically update local state for immediate UI feedback
      const updatedContexts = updateArrayItem(
        state.contexts,
        contextId,
        { ...state.contexts.find(c => c.id === contextId)!, groupId: newGroupId }
      );

      return {
        pendingMoves: newPendingMoves,
        contexts: updatedContexts,
      };
    });
  },

  // Flush all pending moves to the server in a single batch API call
  // Note: queueMove already applies optimistic updates, this just syncs with server
  flushPendingMoves: async () => {
    const { pendingMoves, contexts } = get();
    if (pendingMoves.length === 0) return;

    // Store snapshot for potential rollback (queueMove already optimistically updated)
    const previousContexts = contexts;
    const moveCount = pendingMoves.length;

    try {
      const updatedContexts = await contextAPI.batchMoveContexts(pendingMoves);

      set(state => ({
        // Sync contexts with server response
        contexts: state.contexts.map(ctx => {
          const updated = updatedContexts.find(u => u.id === ctx.id);
          return updated || ctx;
        }),
        pendingMoves: [],
      }));
    } catch (error) {
      // Rollback optimistic updates on failure
      set({
        contexts: previousContexts,
        pendingMoves: [],
      });
      toast.error('Failed to move contexts', `${moveCount} context${moveCount > 1 ? 's' : ''} could not be moved`);
      throw error;
    }
  },

  // Clear pending moves without flushing (e.g., on drag cancel)
  clearPendingMoves: () => {
    set({ pendingMoves: [] });
  },
}));

/**
 * Hook to use the context store with proper selector support
 *
 * Usage examples:
 * // Subscribe to specific state (recommended for performance)
 * const contexts = useContextStore(state => state.contexts);
 * const loading = useContextStore(state => state.loading);
 *
 * // Subscribe to multiple values with shallow comparison
 * const { contexts, groups } = useContextStore(useShallow(state => ({ contexts: state.contexts, groups: state.groups })));
 *
 * // Get actions (stable references, won't cause re-renders)
 * const addContext = useContextStore(state => state.addContext);
 */
export const useContextStore = useContextStoreBase;

// Export shallow for convenience
export { useShallow };

// Re-export ContextEntity for domain-driven context operations
export { ContextEntity } from './context/ContextEntity';
export type { HealthLevel, ContextHealth, NameValidationResult, ContextValidationResult } from './context/ContextEntity';
