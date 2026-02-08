/**
 * Batch Management Actions
 * CRUD operations for batch lifecycle: create, start, pause, resume, complete, delete
 */

import type { BatchId, BatchState, TaskRunnerState } from './taskRunnerStore';
import {
  createQueuedStatus,
  createIdleBatchStatus,
  createRunningBatchStatus,
  createPausedBatchStatus,
  createCompletedBatchStatus,
  isBatchRunning,
  isBatchPaused,
  isTaskCompleted,
} from '../lib/types';

type Set = (fn: (state: TaskRunnerState) => Partial<TaskRunnerState> | TaskRunnerState) => void;
type Get = () => TaskRunnerState;

export function createBatchActions(set: Set, get: Get) {
  return {
    createBatch: (batchId: BatchId, name: string, taskIds: string[]) => {
      set((state) => {
        const newBatch: BatchState = {
          id: `batch_${Date.now()}`,
          name,
          taskIds: [...taskIds],
          status: createIdleBatchStatus(),
          completedCount: 0,
          failedCount: 0,
        };

        const newTasks = { ...state.tasks };
        taskIds.forEach(taskId => {
          newTasks[taskId] = {
            id: taskId,
            batchId,
            status: createQueuedStatus(),
          };
        });

        return {
          batches: {
            ...state.batches,
            [batchId]: newBatch,
          },
          tasks: newTasks,
        };
      });
    },

    createSessionBatch: (
      batchId: BatchId,
      projectId: string,
      projectPath: string,
      name: string,
      taskId: string,
      requirementName: string
    ): string => {
      const internalBatchId = `batch_${Date.now()}`;
      const now = Date.now();

      set((state) => {
        const newReserved = new Set(state.reservedBatchIds);
        newReserved.delete(batchId);

        return {
          reservedBatchIds: newReserved,
          batches: {
            ...state.batches,
            [batchId]: {
              id: internalBatchId,
              name,
              taskIds: [taskId],
              status: createIdleBatchStatus(),
              completedCount: 0,
              failedCount: 0,
              claudeSessionId: null,
              projectId,
              projectPath,
              createdAt: now,
              updatedAt: now,
            },
          },
          tasks: {
            ...state.tasks,
            [taskId]: {
              id: taskId,
              batchId,
              status: createQueuedStatus(),
              requirementName,
            },
          },
        };
      });

      return internalBatchId;
    },

    startBatch: (batchId: BatchId) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch || isBatchRunning(batch.status)) return state;

        const startedAt = isBatchPaused(batch.status)
          ? batch.status.startedAt
          : Date.now();

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              status: createRunningBatchStatus(startedAt),
            },
          },
        };
      });
    },

    pauseBatch: (batchId: BatchId) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch || !isBatchRunning(batch.status)) return state;

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              status: createPausedBatchStatus(batch.status.startedAt),
            },
          },
        };
      });
    },

    resumeBatch: (batchId: BatchId) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch || !isBatchPaused(batch.status)) return state;

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              status: createRunningBatchStatus(batch.status.startedAt),
            },
          },
        };
      });
    },

    completeBatch: (batchId: BatchId) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;

        const progress = get().getBatchProgress(batchId);
        console.log(`✅ Batch ${batchId} completed:`, {
          total: progress.total,
          completed: progress.completed,
          failed: progress.failed,
        });

        const startedAt = isBatchRunning(batch.status)
          ? batch.status.startedAt
          : isBatchPaused(batch.status)
          ? batch.status.startedAt
          : Date.now();

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              status: createCompletedBatchStatus(startedAt),
            },
          },
        };
      });
    },

    deleteBatch: (batchId: BatchId) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;

        const newTasks = { ...state.tasks };
        batch.taskIds.forEach(taskId => {
          delete newTasks[taskId];
        });

        const newBatches = { ...state.batches };
        delete newBatches[batchId];

        return {
          batches: newBatches,
          tasks: newTasks,
        };
      });
    },

    renameBatch: (batchId: BatchId, newName: string) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              name: newName,
              updatedAt: Date.now(),
            },
          },
        };
      });
    },

    updateBatchClaudeSessionId: (batchId: BatchId, claudeSessionId: string) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              claudeSessionId,
              updatedAt: Date.now(),
            },
          },
        };
      });
    },

    compactBatch: (batchId: BatchId) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;

        const completedTaskIds = batch.taskIds.filter(taskId => {
          const task = state.tasks[taskId];
          return task && isTaskCompleted(task.status);
        });

        const remainingTaskIds = batch.taskIds.filter(
          id => !completedTaskIds.includes(id)
        );

        if (remainingTaskIds.length === 0) {
          const newTasks = { ...state.tasks };
          batch.taskIds.forEach(taskId => {
            delete newTasks[taskId];
          });

          const newBatches = { ...state.batches };
          delete newBatches[batchId];

          return {
            batches: newBatches,
            tasks: newTasks,
          };
        }

        const newTasks = { ...state.tasks };
        completedTaskIds.forEach(taskId => {
          delete newTasks[taskId];
        });

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              taskIds: remainingTaskIds,
              updatedAt: Date.now(),
            },
          },
          tasks: newTasks,
        };
      });
    },
  };
}
