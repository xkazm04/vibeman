import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ProcessInfo, Project } from '@/types';

/**
 * Server Project Store
 *
 * Canonical store for server-synced project data including:
 * - Project list (CRUD with server sync)
 * - Dev server process states
 * - Server management actions
 *
 * This store consolidates the former:
 * - projectConfigStore (project CRUD)
 * - serverProjectStore (process management)
 */

interface ServerProjectStore {
  // === Project State (canonical list from server) ===
  projects: Project[];
  initialized: boolean;
  loading: boolean;

  // === Process State (runtime dev server states) ===
  processes: Record<string, ProcessInfo>;

  // === Project CRUD Actions ===
  initializeProjects: () => Promise<void>;
  syncWithServer: () => Promise<Project[]>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;

  // === Project Query Actions ===
  getProject: (projectId: string) => Project | undefined;
  getAllProjects: () => Project[];

  // === Process Management Actions ===
  setProcess: (projectId: string, info: ProcessInfo) => void;
  removeProcess: (projectId: string) => void;
  updateProcessStatus: (projectId: string, status: ProcessInfo['status']) => void;
  getProcess: (projectId: string) => ProcessInfo | undefined;
  getAllProcesses: () => Record<string, ProcessInfo>;

  // === Server Actions ===
  startServer: (projectId: string) => Promise<void>;
  stopServer: (projectId: string) => Promise<void>;
  fetchStatuses: () => Promise<void>;
  fetchLogs: (projectId: string) => Promise<string[]>;
  forceRefresh: () => Promise<void>;
}

export const useServerProjectStore = create<ServerProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        projects: [],
        initialized: false,
        loading: false,
        processes: {},

        // === Project CRUD Actions ===

        syncWithServer: async () => {
          try {
            const response = await fetch('/api/projects');
            if (response.ok) {
              const data = await response.json();
              const projects = data.projects || [];
              set({ projects });
              return projects;
            }
          } catch {
            // Error syncing with server - silent fail
          }
          set({ projects: [] });
          return [];
        },

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

        addProject: async (project) => {
          try {
            const response = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(project),
            });

            if (response.ok) {
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

        updateProject: async (projectId, updates) => {
          try {
            const response = await fetch('/api/projects', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, updates }),
            });

            if (response.ok) {
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

        removeProject: async (projectId) => {
          try {
            const response = await fetch('/api/projects', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId }),
            });

            if (response.ok) {
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

        resetToDefaults: async () => {
          try {
            await get().syncWithServer();
          } catch (error) {
            throw error;
          }
        },

        // === Project Query Actions ===

        getProject: (projectId) => {
          return get().projects.find((project) => project.id === projectId);
        },

        getAllProjects: () => {
          return get().projects || [];
        },

        // === Process Management Actions ===

        setProcess: (projectId, info) =>
          set((state) => ({
            processes: {
              ...state.processes,
              [projectId]: info,
            },
          })),

        removeProcess: (projectId) =>
          set((state) => {
            const { [projectId]: _, ...rest } = state.processes;
            return { processes: rest };
          }),

        updateProcessStatus: (projectId, status) =>
          set((state) => {
            const process = state.processes[projectId];
            if (process) {
              return {
                processes: {
                  ...state.processes,
                  [projectId]: { ...process, status },
                },
              };
            }
            return state;
          }),

        getProcess: (projectId) => {
          return get().processes[projectId];
        },

        getAllProcesses: () => {
          return get().processes;
        },

        // === Server Actions ===

        startServer: async (projectId) => {
          try {
            const res = await fetch('/api/server/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Fetch updated status
            await get().fetchStatuses();
          } catch (error) {
            throw error;
          }
        },

        stopServer: async (projectId) => {
          try {
            // Immediately update UI to show stopping state
            const currentProcess = get().processes[projectId];
            if (currentProcess) {
              get().setProcess(projectId, { ...currentProcess, status: 'stopping' });
            }

            const res = await fetch('/api/server/stop', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Trigger an immediate status fetch to update the UI
            setTimeout(() => {
              get().fetchStatuses();
            }, 1000);
          } catch (error) {
            // Revert the status if stopping failed
            const currentProcess = get().processes[projectId];
            if (currentProcess && currentProcess.status === 'stopping') {
              get().setProcess(projectId, { ...currentProcess, status: 'running' });
            }
            throw error;
          }
        },

        fetchStatuses: async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch('/api/server/status', {
              signal: controller.signal,
              headers: { 'Cache-Control': 'no-cache' },
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            const statuses = data.statuses || {};

            const { setProcess, removeProcess } = get();

            // Remove processes that are no longer running
            const currentProcessIds = new Set(Object.keys(statuses));

            Object.keys(get().processes).forEach((projectId) => {
              if (!currentProcessIds.has(projectId)) {
                removeProcess(projectId);
              }
            });

            // Update or add processes
            Object.entries(statuses).forEach(([projectId, status]) => {
              setProcess(projectId, status as ProcessInfo);
            });
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              // Request timed out - silent
            }
          }
        },

        fetchLogs: async (projectId) => {
          try {
            const res = await fetch(`/api/server/logs/${projectId}`);
            const data = await res.json();
            return data.logs || [];
          } catch {
            return [];
          }
        },

        forceRefresh: async () => {
          // Clear current processes
          set({ processes: {} });
          // Fetch fresh data
          await get().fetchStatuses();
        },
      }),
      {
        name: 'server-project-store',
        version: 3,
        // Only persist projects list, not runtime process state
        // NOTE: Do NOT persist 'initialized' - we want fresh fetch on each page load
        partialize: (state) => ({
          projects: state.projects,
        }),
        // Handle migration from older versions
        migrate: (persistedState: unknown, version: number) => {
          const state = persistedState as { projects?: unknown[] };
          // Version 1-2 -> 3: Just ensure projects array exists
          if (version < 3) {
            return {
              projects: Array.isArray(state?.projects) ? state.projects : [],
            };
          }
          return state;
        },
      }
    ),
    { name: 'ServerProjectStore' }
  )
);

// Backwards compatibility export
export const useProjectConfigStore = useServerProjectStore;

export default useServerProjectStore;
