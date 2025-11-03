import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ProcessInfo, Project } from '@/types';
import { useProjectConfigStore } from './projectConfigStore';

interface ServerProjectStore {
  // State
  processes: Record<string, ProcessInfo>;
  
  // Actions
  setProcess: (projectId: string, info: ProcessInfo) => void;
  removeProcess: (projectId: string) => void;
  updateProcessStatus: (projectId: string, status: ProcessInfo['status']) => void;
  getProcess: (projectId: string) => ProcessInfo | undefined;
  getAllProcesses: () => Record<string, ProcessInfo>;
  
  // Project management (delegated to config store)
  getProjects: () => Project[];
  getProject: (projectId: string) => Project | undefined;
  
  // Server actions
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
        processes: {},
        
        // Process management
        setProcess: (projectId, info) => 
          set((state) => ({
            processes: {
              ...state.processes,
              [projectId]: info
            }
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
                  [projectId]: { ...process, status }
                }
              };
            }
            return state;
          }),
          
        getProcess: (projectId) => {
          const state = get();
          return state.processes[projectId];
        },
        
        getAllProcesses: () => {
          const state = get();
          return state.processes;
        },
        
        // Project management (delegated to config store)
        getProjects: () => {
          return useProjectConfigStore.getState().getAllProjects();
        },
        
        getProject: (projectId) => {
          return useProjectConfigStore.getState().getProject(projectId);
        },
        
        // Server actions
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

            // Don't immediately remove from store - let fetchStatuses handle cleanup
            // This prevents race conditions where the process is removed but still exists in process manager

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

            // Note: Removed forced re-render as it was causing unnecessary updates
            // The store will automatically notify subscribers when processes change
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              // Request timed out
            }
          }
        },
        
        fetchLogs: async (projectId) => {
          try {
            const res = await fetch(`/api/server/logs/${projectId}`);
            const data = await res.json();
            return data.logs || [];
          } catch (error) {
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
        name: 'server-store',
        // Don't persist anything as processes are runtime state and projects are in config store
        partialize: (state) => ({}),
      }
    )
  )
);

export default useServerProjectStore;