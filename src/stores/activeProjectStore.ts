import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Project, TreeNode } from '@/types';
import { Context } from '@/lib/queries/contextQueries';
import { useProjectConfigStore } from './projectConfigStore';

// Local storage keys
const ACTIVE_PROJECT_KEY = 'vibeman-active-project';

interface ActiveProjectStore {
  // State
  activeProject: Project | null;
  activeContext: Context | null;
  fileStructure: TreeNode | null;
  isLoading: boolean;
  error: string | null;
  showPreview: boolean;

  // Actions
  setActiveProject: (project: Project) => void;
  setActiveContext: (context: Context | null) => void;
  setFileStructure: (structure: TreeNode | null) => void;
  loadProjectFileStructure: (projectId: string) => Promise<void>;
  refreshFileStructure: () => Promise<void>;
  clearError: () => void;
  _setAndLoadProject: (project: Project) => void;
  _loadFirstAvailableProject: (delayMs?: number) => void;
  _verifyAndRestoreProject: (project: Project) => boolean;
  initializeWithFirstProject: () => void;
  setShowPreview: (show: boolean) => void;
  togglePreview: () => void;
  loadFromLocalStorage: () => void;
}

export const useActiveProjectStore = create<ActiveProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activeProject: null,
        activeContext: null,
        fileStructure: null,
        isLoading: false,
        error: null,
        showPreview: false,
        
        // Set active project
        setActiveProject: (project) => {
          // Save to localStorage immediately
          if (typeof window !== 'undefined') {
            localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project));
          }
          set({ activeProject: project, activeContext: null, fileStructure: null, error: null });
        },
        
        // Set active context
        setActiveContext: (context) => {
          set({ activeContext: context });
        },
        
        // Set file structure
        setFileStructure: (structure) => {
          set({ fileStructure: structure });
        },
        
        // Load project file structure
        loadProjectFileStructure: async (projectId) => {
          const projectConfigStore = useProjectConfigStore.getState();
          const project = projectConfigStore.getProject(projectId);
          
          if (!project) {
            set({ error: 'Project not found', isLoading: false });
            return;
          }
          
          set({ isLoading: true, error: null });
          
          try {
            const response = await fetch('/api/project/structure', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ projectPath: project.path }),
            });
            
            if (!response.ok) {
              throw new Error(`Failed to load project structure: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            set({
              activeProject: project,
              fileStructure: data.structure,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load project structure',
            });
          }
        },
        
        // Refresh current project's file structure
        refreshFileStructure: async () => {
          const { activeProject } = get();
          if (activeProject) {
            await get().loadProjectFileStructure(activeProject.id);
          }
        },
        
        // Clear error
        clearError: () => {
          set({ error: null });
        },
        
        // Helper to set and load a project
        _setAndLoadProject: (project: Project) => {
          get().setActiveProject(project);
          get().loadProjectFileStructure(project.id);
        },

        // Load first available project with delay
        _loadFirstAvailableProject: (delayMs: number = 500) => {
          setTimeout(() => {
            const projectConfigStore = useProjectConfigStore.getState();
            const projects = projectConfigStore.getAllProjects();

            if (projects.length > 0) {
              get()._setAndLoadProject(projects[0]);
            }
          }, delayMs);
        },

        // Initialize with first project from config
        initializeWithFirstProject: () => {
          const { activeProject } = get();
          if (activeProject) return; // Already initialized

          // First try to load from localStorage
          get().loadFromLocalStorage();

          // If still no active project, load first available project
          const currentActiveProject = get().activeProject;
          if (!currentActiveProject) {
            get()._loadFirstAvailableProject(500);
          }
        },

        // Verify and restore project from config
        _verifyAndRestoreProject: (project: Project): boolean => {
          const projectConfigStore = useProjectConfigStore.getState();
          const existingProject = projectConfigStore.getProject(project.id);

          if (existingProject) {
            // Set without triggering localStorage save to avoid recursion
            set({ activeProject: existingProject });
            // Load file structure for the restored project
            get().loadProjectFileStructure(existingProject.id);
            return true;
          } else {
            // Project no longer exists, clear localStorage
            localStorage.removeItem(ACTIVE_PROJECT_KEY);
            return false;
          }
        },

        // Load active project from localStorage
        loadFromLocalStorage: () => {
          if (typeof window === 'undefined') return;

          try {
            const storedProject = localStorage.getItem(ACTIVE_PROJECT_KEY);
            if (storedProject) {
              const project = JSON.parse(storedProject) as Project;
              get()._verifyAndRestoreProject(project);
            }
          } catch (error) {
            // Clear invalid data from localStorage
            localStorage.removeItem(ACTIVE_PROJECT_KEY);
          }
        },
        
        // Preview control
        setShowPreview: (show) => {
          set({ showPreview: show });
        },
        
        togglePreview: () => {
          set((state) => ({ showPreview: !state.showPreview }));
        },
      }),
      {
        name: 'active-project-store',
        version: 1,
        // Only persist the active project ID and context ID, not the file structure
        partialize: (state) => ({
          activeProject: state.activeProject,
          activeContext: state.activeContext,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;

          // First try to load from localStorage
          state.loadFromLocalStorage();

          // Use a single timeout to handle both cases
          setTimeout(() => {
            if (!state.activeProject) {
              // No active project, initialize with first available
              state.initializeWithFirstProject();
            } else {
              // Reload file structure for the existing active project
              state.loadProjectFileStructure(state.activeProject.id);
            }
          }, 100);
        },
      }
    )
  )
);

export default useActiveProjectStore; 