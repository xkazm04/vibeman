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
import { useZenNavigation, getModeFromPath } from './zenNavigationStore';
import type { ZenMode } from './zenNavigationStore';

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

export type { ZenMode };

interface ZenState {
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

  /**
   * @deprecated Read mode from useZenNavigation() or useZenMode() instead.
   * Kept for backward compatibility — derives from navigation store.
   */
  mode: ZenMode;

  /**
   * @deprecated Use useZenNavigation().navigate() instead.
   * Kept for backward compatibility — delegates to navigation store.
   */
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
      // Mode is derived from zenNavigationStore (getter computed on read via subscribe below)
      mode: getModeFromPath(useZenNavigation.getState().viewPath),
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
      setMode: (mode) => {
        // Delegate to navigation store (source of truth)
        useZenNavigation.getState().navigate(mode);
      },

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
      partialize: () => ({}), // mode now persisted via zen-navigation store
    }
  )
);

// Sync mode from navigation store → zen store for backward compat
useZenNavigation.subscribe((navState) => {
  const derivedMode = getModeFromPath(navState.viewPath);
  if (useZenStore.getState().mode !== derivedMode) {
    useZenStore.setState({ mode: derivedMode });
  }
});
