import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ProcessInfo, Project } from '@/types';
import { useProjectConfigStore } from './projectConfigStore';

interface ServerProjectStore {
  // State
  processes: Map<string, ProcessInfo>;
  
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
}

export const useServerProjectStore = create<ServerProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        processes: new Map(),
        
        // Process management
        setProcess: (projectId, info) => 
          set((state) => {
            const newProcesses = new Map(state.processes);
            newProcesses.set(projectId, info);
            return { processes: newProcesses };
          }),
          
        removeProcess: (projectId) =>
          set((state) => {
            const newProcesses = new Map(state.processes);
            newProcesses.delete(projectId);
            return { processes: newProcesses };
          }),
          
        updateProcessStatus: (projectId, status) =>
          set((state) => {
            const process = state.processes.get(projectId);
            if (process) {
              const newProcesses = new Map(state.processes);
              newProcesses.set(projectId, { ...process, status });
              return { processes: newProcesses };
            }
            return state;
          }),
          
        getProcess: (projectId) => {
          const state = get();
          return state.processes.get(projectId);
        },
        
        getAllProcesses: () => {
          const state = get();
          const result: Record<string, ProcessInfo> = {};
          state.processes.forEach((value, key) => {
            result[key] = value;
          });
          return result;
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
            const res = await fetch('/api/server/stop', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId }),
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            // Remove process from store
            get().removeProcess(projectId);
          } catch (error) {
            console.error('Failed to stop server:', error);
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
            const { setProcess, removeProcess } = get();
            
            // Remove processes that are no longer running
            const currentProcessIds = new Set(Object.keys(statuses));
            get().processes.forEach((_, projectId) => {
              if (!currentProcessIds.has(projectId)) {
                console.log(`Removing process ${projectId} (no longer in status)`);
                removeProcess(projectId);
              }
            });
            
            // Update or add processes
            Object.entries(statuses).forEach(([projectId, status]) => {
              setProcess(projectId, status as ProcessInfo);
            });
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