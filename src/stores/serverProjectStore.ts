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
            console.error('Failed to start server:', error);
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
            console.log('stopServer: Process stop requested, waiting for status sync...');
            
            // Trigger an immediate status fetch to update the UI
            setTimeout(() => {
              get().fetchStatuses();
            }, 1000);
          } catch (error) {
            console.error('Failed to stop server:', error);
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
            console.log('fetchStatuses called');
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
            console.log('fetchStatuses: received statuses from API:', statuses);
            
            // Get current projects from config store
            const currentProjects = useProjectConfigStore.getState().getAllProjects();
            console.log('fetchStatuses: current projects in config store:', currentProjects.map(p => ({ id: p.id, name: p.name, port: p.port })));
            
            const { setProcess, removeProcess } = get();
            
            // Remove processes that are no longer running
            const currentProcessIds = new Set(Object.keys(statuses));
            console.log('fetchStatuses: process IDs from API:', Array.from(currentProcessIds));
            
            Object.keys(get().processes).forEach((projectId) => {
              if (!currentProcessIds.has(projectId)) {
                console.log(`Removing process ${projectId} (no longer in status)`);
                removeProcess(projectId);
              }
            });
            
            // Update or add processes
            Object.entries(statuses).forEach(([projectId, status]) => {
              console.log(`Setting process ${projectId} with status:`, status);
              setProcess(projectId, status as ProcessInfo);
            });
            
            // Log final state
            const finalProcesses = get().getAllProcesses();
            console.log('fetchStatuses: final processes in store:', Object.keys(finalProcesses));
            
            // Force a re-render by updating the store
            set(state => ({ ...state }));
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              console.warn('Request timed out');
            } else {
              console.error('Failed to fetch statuses:', error);
            }
          }
        },
        
        fetchLogs: async (projectId) => {
          try {
            const res = await fetch(`/api/server/logs/${projectId}`);
            const data = await res.json();
            return data.logs || [];
          } catch (error) {
            console.error('Failed to fetch logs:', error);
            return [];
          }
        },

        forceRefresh: async () => {
          console.log('forceRefresh called - clearing store and fetching fresh data');
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