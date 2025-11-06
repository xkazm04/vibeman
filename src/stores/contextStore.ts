'use client';
import { useState, useEffect } from 'react';
import { CONTEXT_GROUP_COLORS } from '@/lib/constants/contextColors';
import { contextAPI } from './context/contextAPI';
import type { ContextState, ContextStore } from './context/contextStoreTypes';
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
 * Zustand-like state management for contexts with database integration
 *
 * This store manages contexts and context groups for projects, providing:
 * - CRUD operations for contexts and groups
 * - Context selection for backlog generation
 * - Loading and error states
 * - Synchronized state updates across components
 */
export const useContextStore = (() => {
  let state: ContextState = {
    contexts: [],
    groups: [],
    loading: false,
    error: null,
    initialized: false,
    selectedContextIds: new Set(),
  };

  const listeners = new Set<(state: ContextState) => void>();

  const setState = (updater: ((prev: ContextState) => ContextState) | Partial<ContextState>) => {
    state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
    listeners.forEach(listener => listener(state));
  };

  const subscribe = (listener: (state: ContextState) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return (): ContextStore => {
    const [, forceUpdate] = useState({});

    useEffect(() => {
      const unsubscribe = subscribe(() => forceUpdate({}));
      return () => {
        unsubscribe();
      };
    }, []);

    return {
      ...state,

      // Load all project data (groups and contexts)
      loadProjectData: async (projectId: string) => {
        if (!projectId) return;

        setState(prev => ({ ...prev, ...createLoadingState() }));

        try {
          const { groups, contexts } = await contextAPI.getProjectData(projectId);

          setState(prev => ({
            ...prev,
            groups,
            contexts,
            ...createSuccessState(),
            initialized: true,
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            ...createErrorState(error, 'Failed to load contexts'),
          }));
        }
      },

      // Add a new context
      addContext: async (contextData) => {
        setState(prev => ({ ...prev, ...createLoadingState() }));

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

          setState(prev => ({
            ...prev,
            contexts: addArrayItem(prev.contexts, newContext, 'start'),
            ...createSuccessState(),
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            ...createErrorState(error, 'Failed to add context'),
          }));
          throw error;
        }
      },

      // Remove a context
      removeContext: async (contextId: string) => {
        setState(prev => ({ ...prev, ...createLoadingState() }));

        try {
          const success = await contextAPI.deleteContext(contextId);

          if (success) {
            setState(prev => ({
              ...prev,
              contexts: removeArrayItem(prev.contexts, contextId),
              ...createSuccessState(),
            }));
          } else {
            throw new Error('Context not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            ...createErrorState(error, 'Failed to remove context'),
          }));
          throw error;
        }
      },

      // Update a context
      updateContext: async (contextId: string, updates) => {
        setState(prev => ({ ...prev, ...createLoadingState() }));

        try {
          const updatedContext = await contextAPI.updateContext(contextId, updates);

          if (updatedContext) {
            setState(prev => ({
              ...prev,
              contexts: updateArrayItem(prev.contexts, contextId, updatedContext),
              ...createSuccessState(),
            }));
          } else {
            throw new Error('Context not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            ...createErrorState(error, 'Failed to update context'),
          }));
          throw error;
        }
      },

      // Move context to different group
      moveContext: async (contextId: string, newGroupId: string) => {
        setState(prev => ({ ...prev, ...createLoadingState() }));

        try {
          const updatedContext = await contextAPI.updateContext(contextId, { groupId: newGroupId });

          if (updatedContext) {
            setState(prev => ({
              ...prev,
              contexts: updateArrayItem(prev.contexts, contextId, updatedContext),
              ...createSuccessState(),
            }));
          } else {
            throw new Error('Context not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            ...createErrorState(error, 'Failed to move context'),
          }));
          throw error;
        }
      },

      // Add a new group
      addGroup: async (groupData) => {
        setState(prev => ({ ...prev, ...createLoadingState() }));

        try {
          const newGroup = await contextAPI.createGroup(groupData);

          setState(prev => ({
            ...prev,
            groups: [...prev.groups, newGroup].sort((a, b) => a.position - b.position),
            ...createSuccessState(),
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            ...createErrorState(error, 'Failed to add group'),
          }));
          throw error;
        }
      },

      // Remove a group
      removeGroup: async (groupId: string) => {
        setState(prev => ({ ...prev, ...createLoadingState() }));

        try {
          const success = await contextAPI.deleteGroup(groupId);

          if (success) {
            setState(prev => ({
              ...prev,
              groups: removeArrayItem(prev.groups, groupId),
              contexts: prev.contexts.filter(ctx => ctx.groupId !== groupId),
              ...createSuccessState(),
            }));
          } else {
            throw new Error('Group not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            ...createErrorState(error, 'Failed to remove group'),
          }));
          throw error;
        }
      },

      // Update a group
      updateGroup: async (groupId: string, updates) => {
        setState(prev => ({ ...prev, ...createLoadingState() }));

        try {
          const updatedGroup = await contextAPI.updateGroup(groupId, updates);

          if (updatedGroup) {
            setState(prev => ({
              ...prev,
              groups: updateArrayItem(prev.groups, groupId, updatedGroup)
                .sort((a, b) => a.position - b.position),
              ...createSuccessState(),
            }));
          } else {
            throw new Error('Group not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            ...createErrorState(error, 'Failed to update group'),
          }));
          throw error;
        }
      },

      // Clear all contexts (local state only)
      clearAllContexts: () => setState(prev => ({
        ...prev,
        contexts: [],
        groups: [],
        initialized: false,
      })),

      // Get a specific context
      getContext: (contextId: string) => {
        return state.contexts.find(ctx => ctx.id === contextId);
      },

      // Get a specific group
      getGroup: (groupId: string) => {
        return state.groups.find(group => group.id === groupId);
      },

      // Get contexts by group
      getContextsByGroup: (groupId: string) => {
        return state.contexts.filter(ctx => ctx.groupId === groupId);
      },

      // Context selection for backlog generation
      toggleContextSelection: (contextId: string) => {
        setState(prev => {
          const newSelectedContextIds = new Set(prev.selectedContextIds);
          if (newSelectedContextIds.has(contextId)) {
            newSelectedContextIds.delete(contextId);
          } else {
            newSelectedContextIds.add(contextId);
          }
          return { ...prev, selectedContextIds: newSelectedContextIds };
        });
      },

      setSelectedContext: (contextId: string) => {
        setState(prev => ({
          ...prev,
          selectedContextIds: new Set([contextId])
        }));
      },

      clearContextSelection: () => {
        setState(prev => ({ ...prev, selectedContextIds: new Set() }));
      },

      selectAllContexts: () => {
        setState(prev => ({
          ...prev,
          selectedContextIds: new Set(prev.contexts.map(ctx => ctx.id))
        }));
      },
    };
  };
})();
