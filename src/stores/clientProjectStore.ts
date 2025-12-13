import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Project, TreeNode } from '@/types';
import { Context } from '@/lib/queries/contextQueries';
import { getErrorMessage } from './utils/storeHelpers';
import { useServerProjectStore } from './serverProjectStore';

// Local storage key for backwards compatibility
const ACTIVE_PROJECT_KEY = 'vibeman-active-project';

/**
 * Client Project Store
 *
 * Consolidated store for all client-side project state including:
 * - Active project selection and context
 * - File structure for the active project
 * - Project filtering (all vs specific project)
 * - UI preferences (preview toggle)
 *
 * This store consolidates the former:
 * - activeProjectStore
 * - unifiedProjectStore
 *
 * It integrates with serverProjectStore to get the canonical project list.
 */

interface ClientProjectStore {
  // === Active Project State ===
  activeProject: Project | null;
  activeContext: Context | null;
  fileStructure: TreeNode | null;
  isLoading: boolean;
  error: string | null;

  // === UI State ===
  showPreview: boolean;

  // === Filter State (formerly unifiedProjectStore) ===
  /**
   * Selected project ID for filtering views
   * - 'all': Show data from all projects
   * - string: Specific project ID
   */
  selectedProjectId: string;

  // === Active Project Actions ===
  setActiveProject: (project: Project | null) => void;
  setActiveContext: (context: Context | null) => void;
  setFileStructure: (structure: TreeNode | null) => void;
  loadProjectFileStructure: (projectId: string) => Promise<void>;
  refreshFileStructure: () => Promise<void>;
  clearError: () => void;

  // === UI Actions ===
  setShowPreview: (show: boolean) => void;
  togglePreview: () => void;

  // === Filter Actions ===
  setSelectedProjectId: (projectId: string) => void;
  isAllProjectsSelected: () => boolean;
  resetToAll: () => void;

  // === Initialization ===
  initializeWithFirstProject: () => void;
  loadFromLocalStorage: () => void;

  // === Internal Helpers ===
  _setAndLoadProject: (project: Project) => void;
  _loadFirstAvailableProject: (delayMs?: number) => void;
  _verifyAndRestoreProject: (project: Project) => boolean;
}

/**
 * Helper to get projects from server store
 */
const getProjects = (): Project[] => {
  return useServerProjectStore.getState().getAllProjects();
};

/**
 * Helper to get a project by ID from server store
 */
const getProject = (projectId: string): Project | undefined => {
  return useServerProjectStore.getState().getProject(projectId);
};

export const useClientProjectStore = create<ClientProjectStore>()(
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
        selectedProjectId: 'all',

        // === Active Project Actions ===

        setActiveProject: (project) => {
          // Save to localStorage immediately for backwards compatibility
          if (typeof window !== 'undefined') {
            localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project));
          }
          set({ activeProject: project, activeContext: null, fileStructure: null, error: null });
        },

        setActiveContext: (context) => {
          set({ activeContext: context });
        },

        setFileStructure: (structure) => {
          set({ fileStructure: structure });
        },

        loadProjectFileStructure: async (projectId) => {
          const project = getProject(projectId);

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
              error: getErrorMessage(error, 'Failed to load project structure'),
            });
          }
        },

        refreshFileStructure: async () => {
          const { activeProject } = get();
          if (activeProject) {
            await get().loadProjectFileStructure(activeProject.id);
          }
        },

        clearError: () => {
          set({ error: null });
        },

        // === UI Actions ===

        setShowPreview: (show) => {
          set({ showPreview: show });
        },

        togglePreview: () => {
          set((state) => ({ showPreview: !state.showPreview }));
        },

        // === Filter Actions ===

        setSelectedProjectId: (projectId) => {
          set({ selectedProjectId: projectId });
        },

        isAllProjectsSelected: () => {
          return get().selectedProjectId === 'all';
        },

        resetToAll: () => {
          set({ selectedProjectId: 'all' });
        },

        // === Initialization ===

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

        loadFromLocalStorage: () => {
          if (typeof window === 'undefined') return;

          try {
            const storedProject = localStorage.getItem(ACTIVE_PROJECT_KEY);
            if (storedProject) {
              const project = JSON.parse(storedProject) as Project;
              get()._verifyAndRestoreProject(project);
            }
          } catch {
            // Clear invalid data from localStorage
            localStorage.removeItem(ACTIVE_PROJECT_KEY);
          }
        },

        // === Internal Helpers ===

        _setAndLoadProject: (project) => {
          get().setActiveProject(project);
          get().loadProjectFileStructure(project.id);
        },

        _loadFirstAvailableProject: (delayMs = 500) => {
          setTimeout(() => {
            const projects = getProjects();
            if (projects.length > 0) {
              get()._setAndLoadProject(projects[0]);
            }
          }, delayMs);
        },

        _verifyAndRestoreProject: (project) => {
          const existingProject = getProject(project.id);

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
      }),
      {
        name: 'client-project-store',
        version: 2,
        // Persist UI state and selection, not runtime data
        partialize: (state) => ({
          activeProject: state.activeProject,
          activeContext: state.activeContext,
          selectedProjectId: state.selectedProjectId,
          showPreview: state.showPreview,
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
    ),
    { name: 'ClientProjectStore' }
  )
);

// Backwards compatibility exports
export const useActiveProjectStore = useClientProjectStore;
export const useUnifiedProjectStore = useClientProjectStore;

export default useClientProjectStore;
