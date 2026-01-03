'use client';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { CONTEXT_GROUP_COLORS } from '@/lib/constants/contextColors';
import { contextAPI } from './context/contextAPI';
import type { Context, ContextGroup, ContextState, ContextStore } from './context/contextStoreTypes';
import {
  createLoadingState,
  createErrorState,
  createSuccessState,
  updateArrayItem,
  removeArrayItem,
  addArrayItem
} from './utils/storeHelpers';

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

interface ContextStoreState extends ContextState {
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
  flushPendingMoves: () => Promise<void>;

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
  loadProjectData: (projectId: string) => Promise<void>;
  clearAllContexts: () => void;
  deleteAllContexts: (projectId: string) => Promise<number>;
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

  // Load all project data (groups and contexts)
  loadProjectData: async (projectId: string) => {
    if (!projectId) return;

    set(createLoadingState());

    try {
      const { groups, contexts } = await contextAPI.getProjectData(projectId);

      set({
        groups,
        contexts,
        ...createSuccessState(),
        initialized: true,
      });
    } catch (error) {
      set(createErrorState(error, 'Failed to load contexts'));
    }
  },

  // Add a new context
  addContext: async (contextData) => {
    set(createLoadingState());

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

      set(state => ({
        contexts: addArrayItem(state.contexts, newContext, 'start'),
        ...createSuccessState(),
      }));
    } catch (error) {
      set(createErrorState(error, 'Failed to add context'));
      throw error;
    }
  },

  // Remove a context
  removeContext: async (contextId: string) => {
    set(createLoadingState());

    try {
      const success = await contextAPI.deleteContext(contextId);

      if (success) {
        set(state => ({
          contexts: removeArrayItem(state.contexts, contextId),
          ...createSuccessState(),
        }));
      } else {
        throw new Error('Context not found');
      }
    } catch (error) {
      set(createErrorState(error, 'Failed to remove context'));
      throw error;
    }
  },

  // Update a context
  updateContext: async (contextId: string, updates) => {
    set(createLoadingState());

    try {
      const updatedContext = await contextAPI.updateContext(contextId, updates);

      if (updatedContext) {
        set(state => ({
          contexts: updateArrayItem(state.contexts, contextId, updatedContext),
          ...createSuccessState(),
        }));
      } else {
        throw new Error('Context not found');
      }
    } catch (error) {
      set(createErrorState(error, 'Failed to update context'));
      throw error;
    }
  },

  // Move context to different group
  moveContext: async (contextId: string, newGroupId: string | null) => {
    set(createLoadingState());

    try {
      const updatedContext = await contextAPI.updateContext(contextId, { groupId: newGroupId });

      if (updatedContext) {
        set(state => ({
          contexts: updateArrayItem(state.contexts, contextId, updatedContext),
          ...createSuccessState(),
        }));
      } else {
        throw new Error('Context not found');
      }
    } catch (error) {
      set(createErrorState(error, 'Failed to move context'));
      throw error;
    }
  },

  // Flush pending moves (no-op for now, implements interface requirement)
  flushPendingMoves: async () => {
    // No pending moves to flush in this implementation
  },

  // Add a new group
  addGroup: async (groupData) => {
    set(createLoadingState());

    try {
      const newGroup = await contextAPI.createGroup(groupData);

      set(state => ({
        groups: [...state.groups, newGroup].sort((a, b) => a.position - b.position),
        ...createSuccessState(),
      }));
    } catch (error) {
      set(createErrorState(error, 'Failed to add group'));
      throw error;
    }
  },

  // Remove a group
  removeGroup: async (groupId: string) => {
    set(createLoadingState());

    try {
      const success = await contextAPI.deleteGroup(groupId);

      if (success) {
        set(state => ({
          groups: removeArrayItem(state.groups, groupId),
          contexts: state.contexts.filter(ctx => ctx.groupId !== groupId),
          ...createSuccessState(),
        }));
      } else {
        throw new Error('Group not found');
      }
    } catch (error) {
      set(createErrorState(error, 'Failed to remove group'));
      throw error;
    }
  },

  // Update a group
  updateGroup: async (groupId: string, updates) => {
    set(createLoadingState());

    try {
      const updatedGroup = await contextAPI.updateGroup(groupId, updates);

      if (updatedGroup) {
        set(state => ({
          groups: updateArrayItem(state.groups, groupId, updatedGroup)
            .sort((a, b) => a.position - b.position),
          ...createSuccessState(),
        }));
      } else {
        throw new Error('Group not found');
      }
    } catch (error) {
      set(createErrorState(error, 'Failed to update group'));
      throw error;
    }
  },

  // Clear all contexts (local state only)
  clearAllContexts: () => set({
    contexts: [],
    groups: [],
    initialized: false,
  }),

  // Delete all contexts for a project (database + state)
  deleteAllContexts: async (projectId: string) => {
    set(createLoadingState());

    try {
      const deletedCount = await contextAPI.deleteAllContexts(projectId);

      set(state => ({
        contexts: [],
        ...createSuccessState(),
      }));

      return deletedCount;
    } catch (error) {
      set(createErrorState(error, 'Failed to delete all contexts'));
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
