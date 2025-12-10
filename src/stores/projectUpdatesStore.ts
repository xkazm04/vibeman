import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * ProjectUpdatesStore - Lightweight store for communicating project list changes
 * between components (ProjectsLayout → UnifiedProjectSelector)
 */

export type ProjectUpdateType = 'add' | 'delete' | 'update';

export interface ProjectUpdate {
  type: ProjectUpdateType;
  projectId: string;
  timestamp: number;
}

interface ProjectUpdatesStore {
  // State
  lastUpdate: ProjectUpdate | null;
  updateCount: number;

  // Actions
  notifyProjectAdded: (projectId: string) => void;
  notifyProjectDeleted: (projectId: string) => void;
  notifyProjectUpdated: (projectId: string) => void;
  clearLastUpdate: () => void;
}

export const useProjectUpdatesStore = create<ProjectUpdatesStore>()(
  devtools(
    (set) => ({
      // Initial state
      lastUpdate: null,
      updateCount: 0,

      // Notify that a project was added
      notifyProjectAdded: (projectId: string) => {
        set((state) => ({
          lastUpdate: {
            type: 'add',
            projectId,
            timestamp: Date.now(),
          },
          updateCount: state.updateCount + 1,
        }));
      },

      // Notify that a project was deleted
      notifyProjectDeleted: (projectId: string) => {
        set((state) => ({
          lastUpdate: {
            type: 'delete',
            projectId,
            timestamp: Date.now(),
          },
          updateCount: state.updateCount + 1,
        }));
      },

      // Notify that a project was updated
      notifyProjectUpdated: (projectId: string) => {
        set((state) => ({
          lastUpdate: {
            type: 'update',
            projectId,
            timestamp: Date.now(),
          },
          updateCount: state.updateCount + 1,
        }));
      },

      // Clear the last update (optional cleanup)
      clearLastUpdate: () => {
        set({ lastUpdate: null });
      },
    }),
    { name: 'project-updates-store' }
  )
);

export default useProjectUpdatesStore;

