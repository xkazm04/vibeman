/**
 * Zen Layout Store
 * Minimal state management for the holiday monitoring view
 *
 * NOTE: Cross-device offload pairing migrated to Supabase Realtime.
 * Supabase connection state will be added in Phase 5.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';

export interface ActivityItem {
  id: string;
  timestamp: Date;
  title: string;
  status: 'completed' | 'failed' | 'running';
  batchId: string;
  error?: string;
}

export interface ZenStats {
  completed: number;
  pending: number;
  failed: number;
  sessionStart: Date;
}

export type ZenMode = 'offline' | 'online' | 'emulator';

interface ZenState {
  // Mode: offline (monitoring) or online (accepting tasks)
  mode: ZenMode;

  // Selected batch to monitor
  selectedBatchId: BatchId | null;

  // Connection state (SSE/Supabase)
  isConnected: boolean;

  // Current running task
  currentTask: {
    id: string;
    title: string;
    progress: number;
  } | null;

  // Recent activity log
  recentActivity: ActivityItem[];

  // Session statistics
  stats: ZenStats;

  // Actions
  setMode: (mode: ZenMode) => void;
  selectBatch: (batchId: BatchId | null) => void;
  setConnected: (connected: boolean) => void;
  setCurrentTask: (task: { id: string; title: string; progress: number } | null) => void;
  addActivity: (item: Omit<ActivityItem, 'id'>) => void;
  updateStats: (updates: Partial<ZenStats>) => void;
  incrementCompleted: () => void;
  incrementFailed: () => void;
  decrementPending: () => void;
  resetSession: () => void;
}

export const useZenStore = create<ZenState>()(
  persist(
    (set) => ({
      // Initial state
      mode: 'offline',
      selectedBatchId: null,
      isConnected: false,
      currentTask: null,
      recentActivity: [],
      stats: {
        completed: 0,
        pending: 0,
        failed: 0,
        sessionStart: new Date(),
      },

      // Actions
      setMode: (mode) => set({ mode }),

      selectBatch: (batchId) => set({ selectedBatchId: batchId }),

      setConnected: (connected) => set({ isConnected: connected }),

      setCurrentTask: (task) => set({ currentTask: task }),

      addActivity: (item) => set((state) => ({
        recentActivity: [
          { ...item, id: `${Date.now()}-${Math.random()}` },
          ...state.recentActivity.slice(0, 49), // Keep last 50 items
        ],
      })),

      updateStats: (updates) => set((state) => ({
        stats: { ...state.stats, ...updates },
      })),

      incrementCompleted: () => set((state) => ({
        stats: { ...state.stats, completed: state.stats.completed + 1 },
      })),

      incrementFailed: () => set((state) => ({
        stats: { ...state.stats, failed: state.stats.failed + 1 },
      })),

      decrementPending: () => set((state) => ({
        stats: { ...state.stats, pending: Math.max(0, state.stats.pending - 1) },
      })),

      resetSession: () => set({
        recentActivity: [],
        stats: {
          completed: 0,
          pending: 0,
          failed: 0,
          sessionStart: new Date(),
        },
        currentTask: null,
      }),
    }),
    {
      name: 'zen-store',
      partialize: (state) => ({
        mode: state.mode,
      }),
    }
  )
);
