import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Unified Project Selection Store
 *
 * Global store for project selection across all app modules.
 * Supports both "all projects" and specific project selection.
 * Persisted to localStorage for session continuity.
 */

interface UnifiedProjectStore {
  /**
   * Selected project ID
   * - 'all': Show data from all projects
   * - string: Specific project ID
   */
  selectedProjectId: string;

  /**
   * Set the selected project ID
   */
  setSelectedProjectId: (projectId: string) => void;

  /**
   * Check if "all projects" is selected
   */
  isAllProjectsSelected: () => boolean;

  /**
   * Reset to "all projects"
   */
  resetToAll: () => void;
}

export const useUnifiedProjectStore = create<UnifiedProjectStore>()(
  persist(
    (set, get) => ({
      // Initial state: "all" projects
      selectedProjectId: 'all',

      // Set selected project ID
      setSelectedProjectId: (projectId) => {
        set({ selectedProjectId: projectId });
      },

      // Check if "all projects" is selected
      isAllProjectsSelected: () => {
        return get().selectedProjectId === 'all';
      },

      // Reset to "all projects"
      resetToAll: () => {
        set({ selectedProjectId: 'all' });
      },
    }),
    {
      name: 'unified-project-store',
      version: 1,
    }
  )
);

export default useUnifiedProjectStore;
