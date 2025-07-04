import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Project } from '@/types';
import { getAllProjects as getDefaultProjects } from '@/lib/config';

interface ProjectConfigStore {
  // State
  projects: Project[];
  initialized: boolean;
  
  // Actions
  initializeProjects: () => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  resetToDefaults: () => void;
  getProject: (projectId: string) => Project | undefined;
  getAllProjects: () => Project[];
}

export const useProjectConfigStore = create<ProjectConfigStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        projects: [],
        initialized: false,
        
        // Initialize projects from default config if not already done
        initializeProjects: () => {
          const state = get();
          if (state.initialized) return;
          
          // If no projects in localStorage, load defaults
          if (state.projects.length === 0) {
            const defaultProjects = getDefaultProjects();
            set({ 
              projects: defaultProjects,
              initialized: true 
            });
          } else {
            set({ initialized: true });
          }
        },
        
        // Update a specific project
        updateProject: (projectId, updates) => {
          set((state) => ({
            projects: state.projects.map((project) =>
              project.id === projectId ? { ...project, ...updates } : project
            ),
          }));
        },
        
        // Add a new project
        addProject: (project) => {
          set((state) => ({
            projects: [...state.projects, project],
          }));
        },
        
        // Remove a project
        removeProject: (projectId) => {
          set((state) => ({
            projects: state.projects.filter((project) => project.id !== projectId),
          }));
        },
        
        // Reset to default configuration
        resetToDefaults: () => {
          const defaultProjects = getDefaultProjects();
          set({ 
            projects: defaultProjects,
            initialized: true 
          });
        },
        
        // Get a specific project
        getProject: (projectId) => {
          const state = get();
          return state.projects.find((project) => project.id === projectId);
        },
        
        // Get all projects
        getAllProjects: () => {
          const state = get();
          // Initialize if not already done
          if (!state.initialized) {
            state.initializeProjects();
          }
          return get().projects;
        },
      }),
      {
        name: 'project-config-store',
        version: 1,
        // Custom storage to handle initialization
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Ensure initialization happens after rehydration
            setTimeout(() => {
              state.initializeProjects();
            }, 0);
          }
        },
      }
    )
  )
);

export default useProjectConfigStore; 