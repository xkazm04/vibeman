/**
 * Task Management Actions
 * Add, remove, move, and offload tasks between batches
 */

import type { BatchId, TaskRunnerState } from './taskRunnerStore';
import type { TaskStatusUnion } from '../lib/types';
import {
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
  isTaskQueued,
  isTaskRunning,
  isTaskCompleted,
  isTaskFailed,
  isBatchRunning,
  isBatchPaused,
  createRunningBatchStatus,
  createCompletedBatchStatus,
} from '../lib/types';

type Set = (fn: (state: TaskRunnerState) => Partial<TaskRunnerState> | TaskRunnerState) => void;
type Get = () => TaskRunnerState;

export function createTaskActions(set: Set, _get: Get) {
  return {
    addTaskToBatch: (batchId: BatchId, taskId: string) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;
        if (batch.taskIds.includes(taskId)) return state;

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              taskIds: [...batch.taskIds, taskId],
              updatedAt: Date.now(),
            },
          },
          tasks: {
            ...state.tasks,
            [taskId]: {
              id: taskId,
              batchId,
              status: createQueuedStatus(),
            },
          },
        };
      });
    },

    addTaskToBatchWithName: (batchId: BatchId, taskId: string, requirementName: string) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;
        if (batch.taskIds.includes(taskId)) return state;

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              taskIds: [...batch.taskIds, taskId],
              updatedAt: Date.now(),
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
    },

    removeTaskFromBatch: (batchId: BatchId, taskId: string) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;

        const newTasks = { ...state.tasks };
        delete newTasks[taskId];

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              taskIds: batch.taskIds.filter(id => id !== taskId),
            },
          },
          tasks: newTasks,
        };
      });
    },

    moveTask: (taskId: string, fromBatchId: BatchId, toBatchId: BatchId) => {
      set((state) => {
        const fromBatch = state.batches[fromBatchId];
        const toBatch = state.batches[toBatchId];

        if (!fromBatch || !toBatch) return state;
        if (!fromBatch.taskIds.includes(taskId)) return state;

        const task = state.tasks[taskId];
        if (task && isTaskRunning(task.status)) return state;

        return {
          batches: {
            ...state.batches,
            [fromBatchId]: {
              ...fromBatch,
              taskIds: fromBatch.taskIds.filter(id => id !== taskId),
            },
            [toBatchId]: {
              ...toBatch,
              taskIds: [...toBatch.taskIds, taskId],
            },
          },
          tasks: {
            ...state.tasks,
            [taskId]: {
              ...state.tasks[taskId],
              batchId: toBatchId,
              status: createQueuedStatus(),
            },
          },
        };
      });
    },

    offloadTasks: (fromBatchId: BatchId, toBatchId: BatchId, taskIds: string[]) => {
      set((state) => {
        const fromBatch = state.batches[fromBatchId];
        const toBatch = state.batches[toBatchId];

        if (!fromBatch || !toBatch) return state;

        const queuedTaskIds = taskIds.filter(taskId => {
          const task = state.tasks[taskId];
          return task && isTaskQueued(task.status) && fromBatch.taskIds.includes(taskId);
        });

        if (queuedTaskIds.length === 0) return state;

        const newTasks = { ...state.tasks };
        queuedTaskIds.forEach(taskId => {
          newTasks[taskId] = {
            ...newTasks[taskId],
            batchId: toBatchId,
          };
        });

        return {
          batches: {
            ...state.batches,
            [fromBatchId]: {
              ...fromBatch,
              taskIds: fromBatch.taskIds.filter(id => !queuedTaskIds.includes(id)),
            },
            [toBatchId]: {
              ...toBatch,
              taskIds: [...toBatch.taskIds, ...queuedTaskIds],
            },
          },
          tasks: newTasks,
        };
      });
    },

    updateTaskSessionStatus: (
      batchId: BatchId,
      taskId: string,
      status: 'pending' | 'running' | 'completed' | 'failed',
      extras?: { claudeSessionId?: string; errorMessage?: string }
    ) => {
      set((state) => {
        const batch = state.batches[batchId];
        if (!batch) return state;

        const task = state.tasks[taskId];
        if (!task) return state;

        let taskStatus: TaskStatusUnion;
        switch (status) {
          case 'pending':
            taskStatus = createQueuedStatus();
            break;
          case 'running':
            taskStatus = createRunningStatus();
            break;
          case 'completed':
            taskStatus = createCompletedStatus();
            break;
          case 'failed':
            taskStatus = createFailedStatus(extras?.errorMessage || 'Task failed');
            break;
        }

        const updatedTask = {
          ...task,
          status: taskStatus,
          claudeSessionId: extras?.claudeSessionId ?? task.claudeSessionId,
          errorMessage: extras?.errorMessage,
          startedAt: status === 'running' ? Date.now() : task.startedAt,
          completedAt: (status === 'completed' || status === 'failed') ? Date.now() : task.completedAt,
        };

        const allTaskIds = batch.taskIds;
        const updatedTasks = { ...state.tasks, [taskId]: updatedTask };

        const hasRunning = allTaskIds.some(id => {
          const t = id === taskId ? updatedTask : updatedTasks[id];
          return t && isTaskRunning(t.status);
        });
        const allCompleted = allTaskIds.every(id => {
          const t = id === taskId ? updatedTask : updatedTasks[id];
          return t && isTaskCompleted(t.status);
        });
        const hasFailed = allTaskIds.some(id => {
          const t = id === taskId ? updatedTask : updatedTasks[id];
          return t && isTaskFailed(t.status);
        });
        const hasPending = allTaskIds.some(id => {
          const t = id === taskId ? updatedTask : updatedTasks[id];
          return t && isTaskQueued(t.status);
        });

        let batchStatus = batch.status;
        if (hasRunning) {
          const startedAt = isBatchRunning(batch.status)
            ? batch.status.startedAt
            : isBatchPaused(batch.status)
            ? batch.status.startedAt
            : Date.now();
          batchStatus = createRunningBatchStatus(startedAt);
        } else if (allCompleted) {
          const startedAt = isBatchRunning(batch.status)
            ? batch.status.startedAt
            : isBatchPaused(batch.status)
            ? batch.status.startedAt
            : Date.now();
          batchStatus = createCompletedBatchStatus(startedAt);
        } else if (hasFailed && !hasPending) {
          const startedAt = isBatchRunning(batch.status)
            ? batch.status.startedAt
            : isBatchPaused(batch.status)
            ? batch.status.startedAt
            : Date.now();
          batchStatus = createCompletedBatchStatus(startedAt);
        }

        return {
          batches: {
            ...state.batches,
            [batchId]: {
              ...batch,
              status: batchStatus,
              updatedAt: Date.now(),
            },
          },
          tasks: updatedTasks,
        };
      });
    },
  };
}
