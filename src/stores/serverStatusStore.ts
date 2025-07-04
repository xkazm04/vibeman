import { create } from 'zustand';
import { ProcessInfo } from '@/types';

interface ServerStatusStore {
  statuses: Record<string, ProcessInfo>;
  logs: Record<string, string[]>;
  isPolling: boolean;
  
  // Actions
  setStatus: (projectId: string, status: ProcessInfo | null) => void;
  removeStatus: (projectId: string) => void;
  updateLogs: (projectId: string, logs: string[]) => void;
  appendLog: (projectId: string, log: string) => void;
  clearLogs: (projectId: string) => void;
  setPolling: (polling: boolean) => void;
  
  // Batch operations
  setAllStatuses: (statuses: Record<string, ProcessInfo>) => void;
  clearAll: () => void;
  
  // Getters
  getStatus: (projectId: string) => ProcessInfo | null;
  getRunningCount: () => number;
  isRunning: (projectId: string) => boolean;
}

export const useServerStatusStore = create<ServerStatusStore>((set, get) => ({
  statuses: {},
  logs: {},
  isPolling: false,
  
  setStatus: (projectId, status) => set(state => {
    if (status === null) {
      const { [projectId]: _, ...rest } = state.statuses;
      return { statuses: rest };
    }
    return {
      statuses: {
        ...state.statuses,
        [projectId]: status
      }
    };
  }),
  
  removeStatus: (projectId) => set(state => {
    const { [projectId]: _, ...restStatuses } = state.statuses;
    const { [projectId]: __, ...restLogs } = state.logs;
    return {
      statuses: restStatuses,
      logs: restLogs
    };
  }),
  
  updateLogs: (projectId, logs) => set(state => ({
    logs: {
      ...state.logs,
      [projectId]: logs
    }
  })),
  
  appendLog: (projectId, log) => set(state => {
    const currentLogs = state.logs[projectId] || [];
    const newLogs = [...currentLogs, log];
    // Keep only last 100 logs
    if (newLogs.length > 100) {
      newLogs.splice(0, newLogs.length - 100);
    }
    return {
      logs: {
        ...state.logs,
        [projectId]: newLogs
      }
    };
  }),
  
  clearLogs: (projectId) => set(state => ({
    logs: {
      ...state.logs,
      [projectId]: []
    }
  })),
  
  setPolling: (polling) => set({ isPolling: polling }),
  
  setAllStatuses: (statuses) => set({ statuses }),
  
  clearAll: () => set({ statuses: {}, logs: {} }),
  
  getStatus: (projectId) => get().statuses[projectId] || null,
  
  getRunningCount: () => {
    const statuses = get().statuses;
    return Object.values(statuses).filter(s => s.status === 'running').length;
  },
  
  isRunning: (projectId) => {
    const status = get().statuses[projectId];
    return status?.status === 'running';
  }
}));