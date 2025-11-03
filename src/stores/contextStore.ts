'use client';
import { useState, useEffect } from 'react';
import { CONTEXT_GROUP_COLORS } from '@/lib/constants/contextColors';

// Re-export for backward compatibility
export { CONTEXT_GROUP_COLORS };

// Context Types (moved from queries to avoid server-side imports)
export interface ContextGroup {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Context {
  id: string;
  projectId: string;
  groupId: string | null; // Optional group assignment
  name: string;
  description?: string;
  filePaths: string[];
  createdAt: Date;
  updatedAt: Date;
  // Context file configuration
  hasContextFile?: boolean;
  contextFilePath?: string;
  // Preview image configuration
  preview?: string | null;
  // Testing configuration
  testScenario?: string | null;
  testUpdated?: string | null;
  // Additional fields from JOIN queries
  groupName?: string;
  groupColor?: string;
}

// API client functions
const contextAPI = {
  // Get all contexts and groups for a project
  getProjectData: async (projectId: string): Promise<{ contexts: Context[]; groups: ContextGroup[] }> => {
    const response = await fetch(`/api/contexts?projectId=${projectId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch project data');
    }
    const result = await response.json();

    // Convert date strings back to Date objects
    const contexts = result.data.contexts.map((ctx: Record<string, unknown>) => ({
      ...ctx,
      createdAt: new Date(ctx.createdAt as string),
      updatedAt: new Date(ctx.updatedAt as string),
    }));

    const groups = result.data.groups.map((group: Record<string, unknown>) => ({
      ...group,
      createdAt: new Date(group.createdAt as string),
      updatedAt: new Date(group.updatedAt as string),
    }));

    return { contexts, groups };
  },

  // Create a new context
  createContext: async (contextData: {
    projectId: string;
    groupId?: string | null;
    name: string;
    description?: string;
    filePaths: string[];
    hasContextFile?: boolean;
    contextFilePath?: string;
  }): Promise<Context> => {
    const response = await fetch('/api/contexts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contextData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create context');
    }
    
    const result = await response.json();
    return {
      ...result.data,
      createdAt: new Date(result.data.createdAt),
      updatedAt: new Date(result.data.updatedAt),
    };
  },

  // Update a context
  updateContext: async (contextId: string, updates: {
    name?: string;
    description?: string;
    filePaths?: string[];
    groupId?: string;
  }): Promise<Context> => {
    const response = await fetch('/api/contexts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextId, updates }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update context');
    }
    
    const result = await response.json();
    return {
      ...result.data,
      createdAt: new Date(result.data.createdAt),
      updatedAt: new Date(result.data.updatedAt),
    };
  },

  // Delete a context
  deleteContext: async (contextId: string): Promise<boolean> => {
    const response = await fetch(`/api/contexts?contextId=${contextId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete context');
    }
    
    return true;
  },

  // Create a new group
  createGroup: async (groupData: {
    projectId: string;
    name: string;
    color?: string;
  }): Promise<ContextGroup> => {
    const response = await fetch('/api/context-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create group');
    }
    
    const result = await response.json();
    return {
      ...result.data,
      createdAt: new Date(result.data.createdAt),
      updatedAt: new Date(result.data.updatedAt),
    };
  },

  // Update a group
  updateGroup: async (groupId: string, updates: {
    name?: string;
    color?: string;
  }): Promise<ContextGroup> => {
    const response = await fetch('/api/context-groups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, updates }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update group');
    }
    
    const result = await response.json();
    return {
      ...result.data,
      createdAt: new Date(result.data.createdAt),
      updatedAt: new Date(result.data.updatedAt),
    };
  },

  // Delete a group
  deleteGroup: async (groupId: string): Promise<boolean> => {
    const response = await fetch(`/api/context-groups?groupId=${groupId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete group');
    }
    
    return true;
  },
};

interface ContextState {
  contexts: Context[];
  groups: ContextGroup[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  selectedContextIds: Set<string>; // For backlog task generation
}

interface ContextStore extends ContextState {
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
    groupId?: string;
  }) => Promise<void>;
  moveContext: (contextId: string, newGroupId: string) => Promise<void>;
  
  // Group operations
  addGroup: (groupData: {
    projectId: string;
    name: string;
    color?: string;
  }) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, updates: {
    name?: string;
    color?: string;
  }) => Promise<void>;
  
  // Context selection for backlog generation
  toggleContextSelection: (contextId: string) => void;
  setSelectedContext: (contextId: string) => void;
  clearContextSelection: () => void;
  selectAllContexts: () => void;
  
  // Data loading
  loadProjectData: (projectId: string) => Promise<void>;
  clearAllContexts: () => void;
  getContext: (contextId: string) => Context | undefined;
  getGroup: (groupId: string) => ContextGroup | undefined;
  getContextsByGroup: (groupId: string) => Context[];
}

// Zustand-like state management for contexts with database integration
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

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
          const { groups, contexts } = await contextAPI.getProjectData(projectId);

          setState(prev => ({
            ...prev,
            groups,
            contexts,
            loading: false,
            initialized: true,
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load contexts',
          }));
        }
      },
      
      // Add a new context
      addContext: async (contextData) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

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
            contexts: [newContext, ...prev.contexts],
            loading: false,
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to add context',
          }));
          throw error;
        }
      },
      
      // Remove a context
      removeContext: async (contextId: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
          const success = await contextAPI.deleteContext(contextId);

          if (success) {
            setState(prev => ({
              ...prev,
              contexts: prev.contexts.filter(ctx => ctx.id !== contextId),
              loading: false,
            }));
          } else {
            throw new Error('Context not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to remove context',
          }));
          throw error;
        }
      },
      
      // Update a context
      updateContext: async (contextId: string, updates) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
          const updatedContext = await contextAPI.updateContext(contextId, updates);

          if (updatedContext) {
            setState(prev => ({
              ...prev,
              contexts: prev.contexts.map(ctx =>
                ctx.id === contextId ? updatedContext : ctx
              ),
              loading: false,
            }));
          } else {
            throw new Error('Context not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to update context',
          }));
          throw error;
        }
      },
      
      // Move context to different group
      moveContext: async (contextId: string, newGroupId: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
          const updatedContext = await contextAPI.updateContext(contextId, { groupId: newGroupId });

          if (updatedContext) {
            setState(prev => ({
              ...prev,
              contexts: prev.contexts.map(ctx =>
                ctx.id === contextId ? updatedContext : ctx
              ),
              loading: false,
            }));
          } else {
            throw new Error('Context not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to move context',
          }));
          throw error;
        }
      },
      
      // Add a new group
      addGroup: async (groupData) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
          const newGroup = await contextAPI.createGroup(groupData);

          setState(prev => ({
            ...prev,
            groups: [...prev.groups, newGroup].sort((a, b) => a.position - b.position),
            loading: false,
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to add group',
          }));
          throw error;
        }
      },
      
      // Remove a group
      removeGroup: async (groupId: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
          const success = await contextAPI.deleteGroup(groupId);

          if (success) {
            setState(prev => ({
              ...prev,
              groups: prev.groups.filter(group => group.id !== groupId),
              contexts: prev.contexts.filter(ctx => ctx.groupId !== groupId),
              loading: false,
            }));
          } else {
            throw new Error('Group not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to remove group',
          }));
          throw error;
        }
      },
      
      // Update a group
      updateGroup: async (groupId: string, updates) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
          const updatedGroup = await contextAPI.updateGroup(groupId, updates);

          if (updatedGroup) {
            setState(prev => ({
              ...prev,
              groups: prev.groups.map(group =>
                group.id === groupId ? updatedGroup : group
              ).sort((a, b) => a.position - b.position),
              loading: false,
            }));
          } else {
            throw new Error('Group not found');
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to update group',
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