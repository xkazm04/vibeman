/**
 * Offload Store
 * Manages task offloading state for cross-device execution
 */

import { create } from 'zustand';

export interface OffloadTask {
  id: string;
  requirementName: string;
  requirementContent: string;
  priority: number;
  status: 'pending' | 'synced' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  resultSummary?: string;
  errorMessage?: string;
}

interface OffloadState {
  // For Active device - tasks queued to offload
  pendingOffloads: OffloadTask[];

  // Remote task status (from passive device)
  remoteStatus: OffloadTask[];

  // For Passive device - incoming tasks
  incomingTasks: OffloadTask[];

  // Loading states
  isPushing: boolean;
  isPulling: boolean;
  isPolling: boolean;

  // Polling interval ID
  pollingIntervalId: NodeJS.Timeout | null;

  // Actions
  addPendingOffload: (task: Omit<OffloadTask, 'status'>) => void;
  removePendingOffload: (taskId: string) => void;
  clearPendingOffloads: () => void;

  setRemoteStatus: (tasks: OffloadTask[]) => void;
  updateRemoteTaskStatus: (taskId: string, updates: Partial<OffloadTask>) => void;

  setIncomingTasks: (tasks: OffloadTask[]) => void;
  addIncomingTask: (task: OffloadTask) => void;
  updateIncomingTaskStatus: (taskId: string, status: OffloadTask['status']) => void;
  removeIncomingTask: (taskId: string) => void;

  setIsPushing: (isPushing: boolean) => void;
  setIsPulling: (isPulling: boolean) => void;
  setIsPolling: (isPolling: boolean) => void;
  setPollingIntervalId: (id: NodeJS.Timeout | null) => void;

  reset: () => void;
}

export const useOffloadStore = create<OffloadState>((set) => ({
  // Initial state
  pendingOffloads: [],
  remoteStatus: [],
  incomingTasks: [],
  isPushing: false,
  isPulling: false,
  isPolling: false,
  pollingIntervalId: null,

  // Actions for Active device
  addPendingOffload: (task) => set((state) => ({
    pendingOffloads: [
      ...state.pendingOffloads,
      { ...task, status: 'pending' as const },
    ],
  })),

  removePendingOffload: (taskId) => set((state) => ({
    pendingOffloads: state.pendingOffloads.filter((t) => t.id !== taskId),
  })),

  clearPendingOffloads: () => set({ pendingOffloads: [] }),

  setRemoteStatus: (tasks) => set({ remoteStatus: tasks }),

  updateRemoteTaskStatus: (taskId, updates) => set((state) => ({
    remoteStatus: state.remoteStatus.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    ),
  })),

  // Actions for Passive device
  setIncomingTasks: (tasks) => set({ incomingTasks: tasks }),

  addIncomingTask: (task) => set((state) => ({
    incomingTasks: [...state.incomingTasks, task],
  })),

  updateIncomingTaskStatus: (taskId, status) => set((state) => ({
    incomingTasks: state.incomingTasks.map((t) =>
      t.id === taskId ? { ...t, status } : t
    ),
  })),

  removeIncomingTask: (taskId) => set((state) => ({
    incomingTasks: state.incomingTasks.filter((t) => t.id !== taskId),
  })),

  // Loading states
  setIsPushing: (isPushing) => set({ isPushing }),
  setIsPulling: (isPulling) => set({ isPulling }),
  setIsPolling: (isPolling) => set({ isPolling }),
  setPollingIntervalId: (id) => set({ pollingIntervalId: id }),

  reset: () => set({
    pendingOffloads: [],
    remoteStatus: [],
    incomingTasks: [],
    isPushing: false,
    isPulling: false,
    isPolling: false,
    pollingIntervalId: null,
  }),
}));
