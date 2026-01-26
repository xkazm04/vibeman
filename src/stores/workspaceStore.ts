import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig } from './utils/persistence';
import type { DbWorkspace } from '@/app/db/models/types';

interface WorkspaceState {
  // === State ===
  workspaces: DbWorkspace[];
  activeWorkspaceId: string | null; // null = all, 'default' = unassigned, ws_xxx = named
  workspaceProjectMap: Record<string, string[]>; // workspaceId -> projectIds
  initialized: boolean;
  loading: boolean;

  // === Actions ===
  syncWithServer: () => Promise<void>;
  setActiveWorkspace: (id: string | null) => void;
  createWorkspace: (data: { name: string; description?: string; color?: string; icon?: string; basePath?: string; projectIds?: string[] }) => Promise<DbWorkspace | null>;
  updateWorkspace: (id: string, updates: { name?: string; description?: string; color?: string; icon?: string; base_path?: string }) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setWorkspaceProjects: (workspaceId: string, projectIds: string[]) => Promise<void>;
  addProjectToWorkspace: (workspaceId: string, projectId: string) => Promise<void>;
  removeProjectFromWorkspace: (workspaceId: string, projectId: string) => Promise<void>;

  // === Computed helpers ===
  getActiveWorkspaceName: () => string;
  getActiveWorkspaceProjectIds: () => string[];
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // === Initial State ===
      workspaces: [],
      activeWorkspaceId: 'default',
      workspaceProjectMap: {},
      initialized: false,
      loading: false,

      // === Actions ===

      syncWithServer: async () => {
        if (get().loading) return;
        set({ loading: true });

        try {
          const response = await fetch('/api/workspaces');
          if (!response.ok) throw new Error('Failed to fetch workspaces');

          const data = await response.json();
          const workspaces: DbWorkspace[] = data.workspaces || [];

          // Build project map from response
          const workspaceProjectMap: Record<string, string[]> = {};
          for (const ws of workspaces) {
            workspaceProjectMap[ws.id] = (ws as DbWorkspace & { projectIds?: string[] }).projectIds || [];
          }

          set({ workspaces, workspaceProjectMap, initialized: true, loading: false });
        } catch (error) {
          console.error('[WorkspaceStore] sync failed:', error);
          set({ loading: false, initialized: true });
        }
      },

      setActiveWorkspace: (id: string | null) => {
        set({ activeWorkspaceId: id });
      },

      createWorkspace: async (data) => {
        try {
          const response = await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) throw new Error('Failed to create workspace');

          const result = await response.json();
          const workspace = result.workspace;

          // Update local state
          set(state => ({
            workspaces: [...state.workspaces, workspace],
            workspaceProjectMap: {
              ...state.workspaceProjectMap,
              [workspace.id]: workspace.projectIds || [],
            },
          }));

          return workspace;
        } catch (error) {
          console.error('[WorkspaceStore] create failed:', error);
          return null;
        }
      },

      updateWorkspace: async (id, updates) => {
        try {
          const response = await fetch('/api/workspaces', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId: id, ...updates }),
          });

          if (!response.ok) throw new Error('Failed to update workspace');

          const result = await response.json();
          const updated = result.workspace;

          set(state => ({
            workspaces: state.workspaces.map(ws => ws.id === id ? { ...ws, ...updated } : ws),
          }));
        } catch (error) {
          console.error('[WorkspaceStore] update failed:', error);
        }
      },

      deleteWorkspace: async (id) => {
        try {
          const response = await fetch(`/api/workspaces?workspaceId=${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('Failed to delete workspace');

          set(state => {
            const { [id]: _, ...remainingMap } = state.workspaceProjectMap;
            return {
              workspaces: state.workspaces.filter(ws => ws.id !== id),
              workspaceProjectMap: remainingMap,
              // If deleted workspace was active, reset to default
              activeWorkspaceId: state.activeWorkspaceId === id ? 'default' : state.activeWorkspaceId,
            };
          });
        } catch (error) {
          console.error('[WorkspaceStore] delete failed:', error);
        }
      },

      setWorkspaceProjects: async (workspaceId, projectIds) => {
        try {
          const response = await fetch('/api/workspaces/projects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, projectIds }),
          });

          if (!response.ok) throw new Error('Failed to set workspace projects');

          // Re-sync to get accurate state (since one-per-project may remove from others)
          await get().syncWithServer();
        } catch (error) {
          console.error('[WorkspaceStore] setProjects failed:', error);
        }
      },

      addProjectToWorkspace: async (workspaceId, projectId) => {
        try {
          const response = await fetch('/api/workspaces/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, projectId }),
          });

          if (!response.ok) throw new Error('Failed to add project');

          // Re-sync (project may have been removed from another workspace)
          await get().syncWithServer();
        } catch (error) {
          console.error('[WorkspaceStore] addProject failed:', error);
        }
      },

      removeProjectFromWorkspace: async (workspaceId, projectId) => {
        try {
          const response = await fetch(`/api/workspaces/projects?workspaceId=${workspaceId}&projectId=${projectId}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('Failed to remove project');

          set(state => ({
            workspaceProjectMap: {
              ...state.workspaceProjectMap,
              [workspaceId]: (state.workspaceProjectMap[workspaceId] || []).filter(id => id !== projectId),
            },
          }));
        } catch (error) {
          console.error('[WorkspaceStore] removeProject failed:', error);
        }
      },

      // === Computed helpers ===

      getActiveWorkspaceName: () => {
        const { activeWorkspaceId, workspaces } = get();
        if (!activeWorkspaceId || activeWorkspaceId === 'default') return 'Unassigned';
        const ws = workspaces.find(w => w.id === activeWorkspaceId);
        return ws?.name || 'Unassigned';
      },

      getActiveWorkspaceProjectIds: () => {
        const { activeWorkspaceId, workspaceProjectMap } = get();
        if (!activeWorkspaceId || activeWorkspaceId === 'default') return []; // unassigned: computed dynamically
        return workspaceProjectMap[activeWorkspaceId] || [];
      },
    }),
    createPersistConfig('workspace', {
      category: 'user_preference',
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        workspaces: state.workspaces,
        workspaceProjectMap: state.workspaceProjectMap,
      }),
    })
  )
);
