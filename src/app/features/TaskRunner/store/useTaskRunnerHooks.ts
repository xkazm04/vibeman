/**
 * Convenience hooks for Task Runner Store
 * Provides selectors and compound actions for common operations
 */

import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTaskRunnerStore, type BatchId, type BatchState, type TaskState } from './taskRunnerStore';
import type { ProjectRequirement } from '../lib/types';
import {
  isBatchIdle,
  isBatchRunning,
  isTaskQueued,
  isTaskRunning,
  isTaskCompleted,
  isTaskFailed,
} from '../lib/types';

// ============================================================================
// Batch Hooks
// ============================================================================

/**
 * Hook to get a specific batch state
 */
export function useBatch(batchId: BatchId): BatchState | null {
  return useTaskRunnerStore((state) => state.batches[batchId]);
}

/**
 * Hook to get all batches
 */
export function useAllBatches() {
  return useTaskRunnerStore((state) => state.batches);
}

/**
 * Hook to get all active (running) batches
 */
export function useActiveBatches(): BatchId[] {
  return useTaskRunnerStore(useShallow((state) => state.getActiveBatches()));
}

/**
 * Hook to get batch progress
 */
export function useBatchProgress(batchId: BatchId) {
  return useTaskRunnerStore(useShallow((state) => state.getBatchProgress(batchId)));
}

/**
 * Hook to get tasks for a specific batch
 */
export function useBatchTasks(batchId: BatchId): TaskState[] {
  return useTaskRunnerStore(useShallow((state) => state.getTasksForBatch(batchId)));
}

// ============================================================================
// Batch Action Hooks
// ============================================================================

/**
 * Hook to get batch management actions
 */
export function useBatchActions(batchId: BatchId) {
  const store = useTaskRunnerStore();

  return {
    start: useCallback(() => store.startBatch(batchId), [store, batchId]),
    pause: useCallback(() => store.pauseBatch(batchId), [store, batchId]),
    resume: useCallback(() => store.resumeBatch(batchId), [store, batchId]),
    complete: useCallback(() => store.completeBatch(batchId), [store, batchId]),
    delete: useCallback(() => store.deleteBatch(batchId), [store, batchId]),
  };
}

/**
 * Hook to create a new batch
 */
export function useCreateBatch() {
  const createBatch = useTaskRunnerStore((state) => state.createBatch);

  return useCallback((batchId: BatchId, name: string, taskIds: string[]) => {
    createBatch(batchId, name, taskIds);
  }, [createBatch]);
}

/**
 * Hook to start batch execution
 * Combines starting the batch and triggering execution
 * Also caches requirements for polling callbacks to access
 */
export function useStartBatchExecution() {
  const store = useTaskRunnerStore();

  return useCallback((batchId: BatchId, requirements: ProjectRequirement[]) => {
    // Cache requirements in store so polling callbacks can access full array
    store.setRequirementsCache(requirements);

    store.startBatch(batchId);
    // Start execution after a short delay to ensure state updates
    setTimeout(() => {
      store.executeNextTask(batchId, requirements);
    }, 100);
  }, [store]);
}

// ============================================================================
// Task Action Hooks
// ============================================================================

/**
 * Hook to manage tasks within a batch
 */
export function useTaskActions(batchId: BatchId) {
  const store = useTaskRunnerStore();

  return {
    addTask: useCallback((taskId: string) => {
      store.addTaskToBatch(batchId, taskId);
    }, [store, batchId]),

    removeTask: useCallback((taskId: string) => {
      store.removeTaskFromBatch(batchId, taskId);
    }, [store, batchId]),

    moveTaskTo: useCallback((taskId: string, toBatchId: BatchId) => {
      store.moveTask(taskId, batchId, toBatchId);
    }, [store, batchId]),
  };
}

/**
 * Hook to offload tasks from one batch to another
 */
export function useOffloadTasks() {
  const offloadTasks = useTaskRunnerStore((state) => state.offloadTasks);

  return useCallback((fromBatchId: BatchId, toBatchId: BatchId, taskIds: string[]) => {
    offloadTasks(fromBatchId, toBatchId, taskIds);
  }, [offloadTasks]);
}

// ============================================================================
// Execution Hooks
// ============================================================================

/**
 * Hook to manage task execution for a batch
 * Automatically triggers execution when batch status changes to 'running'
 */
export function useAutoExecution(batchId: BatchId, requirements: ProjectRequirement[]) {
  const batch = useBatch(batchId);
  const executeNextTask = useTaskRunnerStore((state) => state.executeNextTask);
  const canStartTask = useTaskRunnerStore((state) => state.canStartTask(batchId));

  useEffect(() => {
    if (!batch || !isBatchRunning(batch.status)) return;
    if (!canStartTask) return;

    // Try to start next task
    const timer = setTimeout(() => {
      executeNextTask(batchId, requirements);
    }, 100);

    return () => clearTimeout(timer);
  }, [batch?.status, canStartTask, executeNextTask, batchId, requirements]);
}

/**
 * Hook to monitor and auto-restart execution when tasks complete
 */
export function useExecutionMonitor(batchId: BatchId, requirements: ProjectRequirement[]) {
  const tasks = useBatchTasks(batchId);
  const batch = useBatch(batchId);
  const executeNextTask = useTaskRunnerStore((state) => state.executeNextTask);
  const canStartTask = useTaskRunnerStore((state) => state.canStartTask(batchId));

  useEffect(() => {
    if (!batch || !isBatchRunning(batch.status)) return;

    // Check if we can start a new task
    const hasQueuedTasks = tasks.some(t => isTaskQueued(t.status));
    const hasRunningTask = tasks.some(t => isTaskRunning(t.status));

    if (hasQueuedTasks && !hasRunningTask && canStartTask) {
      // Start next task after a short delay
      const timer = setTimeout(() => {
        executeNextTask(batchId, requirements);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [tasks, batch, executeNextTask, batchId, requirements, canStartTask]);
}

// ============================================================================
// Global State Hooks
// ============================================================================

/**
 * Hook to manage git configuration
 */
export function useGitConfig() {
  const gitConfig = useTaskRunnerStore((state) => state.gitConfig);
  const setGitConfig = useTaskRunnerStore((state) => state.setGitConfig);

  return {
    gitConfig,
    setGitConfig,
  };
}

/**
 * Hook to manage global pause state
 */
export function useGlobalPause() {
  const isPaused = useTaskRunnerStore((state) => state.isPaused);
  const setPaused = useTaskRunnerStore((state) => state.setPaused);

  return {
    isPaused,
    setPaused,
    pause: useCallback(() => setPaused(true), [setPaused]),
    resume: useCallback(() => setPaused(false), [setPaused]),
  };
}

// ============================================================================
// Aggregate Hooks
// ============================================================================

/**
 * Hook to get overall progress across all active batches
 */
export function useOverallProgress() {
  return useTaskRunnerStore(useShallow((state) => {
    let totalTasks = 0;
    let completedTasks = 0;
    let failedTasks = 0;

    (Object.keys(state.batches) as BatchId[]).forEach(batchId => {
      const batch = state.batches[batchId];
      if (!batch || isBatchIdle(batch.status)) return;

      // Count tasks by status
      batch.taskIds.forEach(taskId => {
        const task = state.tasks[taskId];
        if (!task) return;

        totalTasks++;
        if (isTaskCompleted(task.status)) completedTasks++;
        if (isTaskFailed(task.status)) failedTasks++;
      });
    });

    return {
      total: totalTasks,
      completed: completedTasks,
      failed: failedTasks,
      remaining: totalTasks - completedTasks - failedTasks,
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }));
}

/**
 * Hook to check if any batch is currently executing
 */
export function useIsAnyBatchRunning(): boolean {
  const activeBatches = useActiveBatches();
  return activeBatches.length > 0;
}

/**
 * Hook to get available batches for task offloading
 * Returns batches that are either idle or running with available capacity
 */
export function useAvailableBatchesForOffload(excludeBatchId?: BatchId): BatchId[] {
  const batches = useAllBatches();
  const canStartTask = useTaskRunnerStore((state) => state.canStartTask);

  return (Object.keys(batches) as BatchId[]).filter(batchId => {
    if (batchId === excludeBatchId) return false;
    const batch = batches[batchId];
    if (!batch) return false;

    // Include idle batches or running batches that can accept more tasks
    return isBatchIdle(batch.status) || (isBatchRunning(batch.status) && canStartTask(batchId));
  });
}

// ============================================================================
// Recovery Hook
// ============================================================================

/**
 * Hook to initialize store from localStorage on mount
 * Automatically recovers interrupted batches
 */
export function useStoreRecovery(requirements: ProjectRequirement[]) {
  const recoverFromStorage = useTaskRunnerStore((state) => state.recoverFromStorage);

  useEffect(() => {
    // Recover state on mount
    recoverFromStorage(requirements);
  }, []); // Only run once on mount
}

// ============================================================================
// Cleanup Hook
// ============================================================================

/**
 * Hook to clear all batch and task data
 */
export function useClearStore() {
  const clearAll = useTaskRunnerStore((state) => state.clearAll);
  return useCallback(() => clearAll(), [clearAll]);
}
