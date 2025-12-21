/**
 * Remote Batch Store
 * Manages state for batches delegated to remote devices
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RemoteBatchId, RemoteBatchState, RemoteTask } from '../components/RemoteBatchDisplay';

interface RemoteBatchStoreState {
  // Remote batches (max 4)
  remoteBatches: Record<RemoteBatchId, RemoteBatchState | null>;

  // Actions
  createRemoteBatch: (
    batchId: RemoteBatchId,
    deviceName: string,
    tasks: Array<{ id: string; requirementName: string }>
  ) => void;
  updateRemoteBatchTasks: (batchId: RemoteBatchId, tasks: RemoteTask[]) => void;
  clearRemoteBatch: (batchId: RemoteBatchId) => void;
  clearAllRemoteBatches: () => void;

  // Helpers
  getNextAvailableRemoteBatchId: () => RemoteBatchId | null;
  getActiveRemoteBatches: () => RemoteBatchId[];
}

export const useRemoteBatchStore = create<RemoteBatchStoreState>()(
  persist(
    (set, get) => ({
      remoteBatches: {
        remoteBatch1: null,
        remoteBatch2: null,
        remoteBatch3: null,
        remoteBatch4: null,
      },

      createRemoteBatch: (batchId, deviceName, tasks) => {
        set((state) => ({
          remoteBatches: {
            ...state.remoteBatches,
            [batchId]: {
              id: `remote_${Date.now()}`,
              name: `Remote Batch`,
              deviceName,
              tasks: tasks.map(t => ({
                id: t.id,
                requirementName: t.requirementName,
                status: 'pending' as const,
              })),
              createdAt: Date.now(),
            },
          },
        }));
      },

      updateRemoteBatchTasks: (batchId, tasks) => {
        set((state) => {
          const batch = state.remoteBatches[batchId];
          if (!batch) return state;

          return {
            remoteBatches: {
              ...state.remoteBatches,
              [batchId]: {
                ...batch,
                tasks,
              },
            },
          };
        });
      },

      clearRemoteBatch: (batchId) => {
        set((state) => ({
          remoteBatches: {
            ...state.remoteBatches,
            [batchId]: null,
          },
        }));
      },

      clearAllRemoteBatches: () => {
        set({
          remoteBatches: {
            remoteBatch1: null,
            remoteBatch2: null,
            remoteBatch3: null,
            remoteBatch4: null,
          },
        });
      },

      getNextAvailableRemoteBatchId: () => {
        const state = get();
        const batchIds: RemoteBatchId[] = ['remoteBatch1', 'remoteBatch2', 'remoteBatch3', 'remoteBatch4'];

        for (const id of batchIds) {
          if (!state.remoteBatches[id]) {
            return id;
          }
        }
        return null;
      },

      getActiveRemoteBatches: () => {
        const state = get();
        const batchIds: RemoteBatchId[] = ['remoteBatch1', 'remoteBatch2', 'remoteBatch3', 'remoteBatch4'];

        return batchIds.filter(id => state.remoteBatches[id] !== null);
      },
    }),
    {
      name: 'remote-batch-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selector hooks
export function useRemoteBatch(batchId: RemoteBatchId): RemoteBatchState | null {
  return useRemoteBatchStore((state) => state.remoteBatches[batchId]);
}

export function useAllRemoteBatches(): Record<RemoteBatchId, RemoteBatchState | null> {
  return useRemoteBatchStore((state) => state.remoteBatches);
}
