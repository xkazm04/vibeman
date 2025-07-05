import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Project, TreeNode } from '@/types';
import { useProjectConfigStore } from './projectConfigStore';

interface ActiveProjectStore {
  // State
  activeProject: Project | null;
  fileStructure: TreeNode | null;
  isLoading: boolean;
  error: string | null;
  showPreview: boolean;
  
  // Actions
  setActiveProject: (project: Project) => void;
  setFileStructure: (structure: TreeNode | null) => void;
  loadProjectFileStructure: (projectId: string) => Promise<void>;
  refreshFileStructure: () => Promise<void>;
  clearError: () => void;
  initializeWithFirstProject: () => void;
  setShowPreview: (show: boolean) => void;
  togglePreview: () => void;
}

export const useActiveProjectStore = create<ActiveProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activeProject: null,
        fileStructure: null,
        isLoading: false,
        error: null,
        showPreview: false,
        
        // Set active project
        setActiveProject: (project) => {
          set({ activeProject: project, fileStructure: null, error: null });
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
            set({ error: 'Project not found' });
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
        
        // Initialize with first project from config
        initializeWithFirstProject: () => {
          const { activeProject } = get();
          if (activeProject) return; // Already initialized
          
          const projectConfigStore = useProjectConfigStore.getState();
          const projects = projectConfigStore.getAllProjects();
          
          if (projects.length > 0) {
            const firstProject = projects[0];
            get().loadProjectFileStructure(firstProject.id);
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
        // Only persist the active project ID, not the file structure
        partialize: (state) => ({
          activeProject: state.activeProject,
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.activeProject) {
            // Reload file structure after rehydration
            setTimeout(() => {
              state.loadProjectFileStructure(state.activeProject!.id);
            }, 100);
          } else {
            // Initialize with first project if no active project
            setTimeout(() => {
              state?.initializeWithFirstProject();
            }, 100);
          }
        },
      }
    )
  )
);

export default useActiveProjectStore; 