import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Project } from '@/types';

interface ProjectConfigStore {
  // State
  projects: Project[];
  initialized: boolean;
  loading: boolean;

  // Actions
  initializeProjects: () => Promise<void>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  getProject: (projectId: string) => Project | undefined;
  getAllProjects: () => Project[];
  syncWithServer: () => Promise<void>;
}

export const useProjectConfigStore = create<ProjectConfigStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      projects: [],
      initialized: false,
      loading: false,

      // Sync with server
      syncWithServer: async () => {
        try {
          const response = await fetch('/api/projects');
          if (response.ok) {
            const data = await response.json();
            set({ projects: data.projects || [] });
            return data.projects || [];
          }
        } catch (error) {
          // Error syncing with server
        }
        set({ projects: [] });
        return [];
      },

      // Initialize projects from server
      initializeProjects: async () => {
        const state = get();
        if (state.initialized) return;

        set({ loading: true });
        try {
          await get().syncWithServer();
          set({ initialized: true });
        } finally {
          set({ loading: false });
        }
      },

      // Update a specific project
      updateProject: async (projectId, updates) => {
        try {
          const response = await fetch('/api/projects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, updates }),
          });

          if (response.ok) {
            // Update local state
            set((state) => ({
              projects: state.projects.map((project) =>
                project.id === projectId ? { ...project, ...updates } : project
              ),
            }));
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update project');
          }
        } catch (error) {
          throw error;
        }
      },

      // Add a new project
      addProject: async (project) => {
        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project),
          });

          if (response.ok) {
            // Update local state
            set((state) => ({
              projects: [...state.projects, project],
            }));
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add project');
          }
        } catch (error) {
          throw error;
        }
      },

      // Remove a project
      removeProject: async (projectId) => {
        try {
          const response = await fetch('/api/projects', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
          });

          if (response.ok) {
            // Update local state
            set((state) => ({
              projects: state.projects.filter((project) => project.id !== projectId),
            }));
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove project');
          }
        } catch (error) {
          throw error;
        }
      },

      // Reset to default configuration
      resetToDefaults: async () => {
        try {
          // This would need a separate API endpoint
          await get().syncWithServer();
        } catch (error) {
          throw error;
        }
      },

      // Get a specific project
      getProject: (projectId) => {
        const state = get();
        return state.projects.find((project) => project.id === projectId);
      },

      // Get all projects
      getAllProjects: () => {
        const state = get();
        return state.projects || [];
      },
    })
  )
);

export default useProjectConfigStore; 