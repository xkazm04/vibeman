/**
 * Zustand Store for Task Runner
 * Centralizes batch and task execution management
 *
 * Key Features:
 * - Manages up to 4 concurrent batches
 * - Per-batch task isolation (each batch only processes its own tasks)
 * - Task offloading between batches
 * - LocalStorage persistence
 * - Pause/Resume per batch
 * - Progress tracking
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProjectRequirement } from '../lib/types';
import { executeRequirementAsync, getTaskStatus, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import { executeGitOperations, generateCommitMessage } from '../sub_Git/gitApi';
import { getContextIdFromRequirement, triggerScreenshotCapture } from '../sub_Screenshot/screenshotApi';
import {
  startPolling,
  stopPolling,
  cleanupAllPolling,
  recoverActivePolling,
  isPollingActive,
  type PollingCallback,
} from '../lib/pollingManager';

// ============================================================================
// Requirements Cache (Fix for batch continuation bug)
// ============================================================================

/**
 * Module-level requirements cache to ensure polling callbacks have access
 * to the full requirements array, not just the single completed requirement.
 * This fixes the "Requirement not found" error on subsequent tasks.
 */
let cachedRequirements: ProjectRequirement[] = [];

/**
 * Update the requirements cache. Call this when starting batch execution.
 */
export function setCachedRequirements(requirements: ProjectRequirement[]): void {
  cachedRequirements = [...requirements];
  console.log(`📦 Requirements cache updated: ${cachedRequirements.length} requirements`);
}

/**
 * Get the cached requirements array.
 */
export function getCachedRequirements(): ProjectRequirement[] {
  return cachedRequirements;
}

// ============================================================================
// Types
// ============================================================================

import type {
  TaskStatusUnion,
  BatchStatusUnion,
  TaskStatusType,
  BatchStatusType,
} from '../lib/types';

import {
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
  createIdleBatchStatus,
  createRunningBatchStatus,
  createPausedBatchStatus,
  createCompletedBatchStatus,
  isTaskQueued,
  isTaskRunning,
  isTaskCompleted,
  isTaskFailed,
  isBatchIdle,
  isBatchRunning,
  isBatchPaused,
  isBatchCompleted,
} from '../lib/types';

export type BatchId = 'batch1' | 'batch2' | 'batch3' | 'batch4';

// Re-export type aliases for backward compatibility
export type BatchStatus = BatchStatusType;
export type TaskStatus = TaskStatusType;

export interface BatchState {
  id: string;
  name: string;
  taskIds: string[]; // Tasks assigned to this batch
  status: BatchStatusUnion; // Now uses discriminated union
  completedCount: number;
  failedCount: number;
}

export interface TaskState {
  id: string; // requirement ID
  batchId: BatchId; // Which batch owns this task
  status: TaskStatusUnion; // Now uses discriminated union
}

export interface GitConfig {
  enabled: boolean;
  commands: string[];
  commitMessage: string;
}

interface TaskRunnerState {
  // Batch Management
  batches: Record<BatchId, BatchState | null>;

  // Task Management
  tasks: Record<string, TaskState>; // Map of taskId -> TaskState

  // Execution State
  executingTasks: Set<string>; // Currently executing task IDs
  isPaused: boolean; // Global pause state

  // Git Configuration
  gitConfig: GitConfig | null;

  // Actions - Batch Management
  createBatch: (batchId: BatchId, name: string, taskIds: string[]) => void;
  startBatch: (batchId: BatchId) => void;
  pauseBatch: (batchId: BatchId) => void;
  resumeBatch: (batchId: BatchId) => void;
  completeBatch: (batchId: BatchId) => void;
  deleteBatch: (batchId: BatchId) => void;

  // Actions - Task Management
  addTaskToBatch: (batchId: BatchId, taskId: string) => void;
  removeTaskFromBatch: (batchId: BatchId, taskId: string) => void;
  moveTask: (taskId: string, fromBatchId: BatchId, toBatchId: BatchId) => void;
  offloadTasks: (fromBatchId: BatchId, toBatchId: BatchId, taskIds: string[]) => void;

  // Actions - Task Execution
  executeNextTask: (batchId: BatchId, requirements: ProjectRequirement[]) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatusUnion) => void;

  // Actions - Global
  setGitConfig: (config: GitConfig | null) => void;
  setPaused: (paused: boolean) => void;

  // Helpers
  getActiveBatches: () => BatchId[];
  getBatchProgress: (batchId: BatchId) => { total: number; completed: number; failed: number };
  getTasksForBatch: (batchId: BatchId) => TaskState[];
  getNextTaskForBatch: (batchId: BatchId) => TaskState | null;
  canStartTask: (batchId: BatchId) => boolean;

  // Recovery
  recoverFromStorage: (requirements: ProjectRequirement[]) => void;
  clearAll: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useTaskRunnerStore = create<TaskRunnerState>()(
  persist(
    (set, get) => ({
      // Initial State
      batches: {
        batch1: null,
        batch2: null,
        batch3: null,
        batch4: null,
      },
      tasks: {},
      executingTasks: new Set(),
      isPaused: false,
      gitConfig: null,

      // ========================================================================
      // Batch Management Actions
      // ========================================================================

      createBatch: (batchId, name, taskIds) => {
        set((state) => {
          const newBatch: BatchState = {
            id: `batch_${Date.now()}`,
            name,
            taskIds: [...taskIds],
            status: createIdleBatchStatus(),
            completedCount: 0,
            failedCount: 0,
          };

          // Create task entries for all tasks in this batch
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

      startBatch: (batchId) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch || isBatchRunning(batch.status)) return state;

          // Get the startedAt from previous status if available
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

      pauseBatch: (batchId) => {
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

      resumeBatch: (batchId) => {
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

      completeBatch: (batchId) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          // Log completion stats
          const progress = state.getBatchProgress(batchId);
          console.log(`✅ Batch ${batchId} completed:`, {
            total: progress.total,
            completed: progress.completed,
            failed: progress.failed,
          });

          // Get startedAt from the batch status
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

      deleteBatch: (batchId) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          // Remove all tasks associated with this batch
          const newTasks = { ...state.tasks };
          batch.taskIds.forEach(taskId => {
            delete newTasks[taskId];
          });

          return {
            batches: {
              ...state.batches,
              [batchId]: null,
            },
            tasks: newTasks,
          };
        });
      },

      // ========================================================================
      // Task Management Actions
      // ========================================================================

      addTaskToBatch: (batchId, taskId) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          // Don't add if already in batch
          if (batch.taskIds.includes(taskId)) return state;

          return {
            batches: {
              ...state.batches,
              [batchId]: {
                ...batch,
                taskIds: [...batch.taskIds, taskId],
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

      removeTaskFromBatch: (batchId, taskId) => {
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

      moveTask: (taskId, fromBatchId, toBatchId) => {
        set((state) => {
          const fromBatch = state.batches[fromBatchId];
          const toBatch = state.batches[toBatchId];

          if (!fromBatch || !toBatch) return state;
          if (!fromBatch.taskIds.includes(taskId)) return state;

          // Don't allow moving running tasks
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
                status: createQueuedStatus(), // Reset to queued when moved
              },
            },
          };
        });
      },

      offloadTasks: (fromBatchId, toBatchId, taskIds) => {
        set((state) => {
          const fromBatch = state.batches[fromBatchId];
          const toBatch = state.batches[toBatchId];

          if (!fromBatch || !toBatch) return state;

          // Filter to only queued tasks
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

      // ========================================================================
      // Task Execution Actions
      // ========================================================================

      executeNextTask: async (batchId, requirements) => {
        const state = get();
        const batch = state.batches[batchId];

        // Check if batch can execute
        if (!batch || !isBatchRunning(batch.status)) return;
        if (state.isPaused) return;

        // Check if batch already has a running task
        if (!state.canStartTask(batchId)) return;

        // Get next queued task for this batch
        const nextTask = state.getNextTaskForBatch(batchId);
        if (!nextTask) {
          // No more tasks - check if batch is complete
          const progress = state.getBatchProgress(batchId);
          if (progress.total === progress.completed + progress.failed) {
            state.completeBatch(batchId);
          }
          return;
        }

        // Parse composite task ID (format: "projectId:requirementName")
        const [taskProjectId, taskRequirementName] = nextTask.id.includes(':')
          ? nextTask.id.split(':')
          : [null, nextTask.id];

        console.log(`🔍 Looking for requirement - Task ID: ${nextTask.id}, Parsed: projectId=${taskProjectId}, name=${taskRequirementName}`);

        // Find the requirement details by matching projectId AND requirementName
        const requirement = requirements.find(r => {
          if (taskProjectId) {
            // Composite ID: match both projectId and requirementName
            return r.projectId === taskProjectId && r.requirementName === taskRequirementName;
          } else {
            // Simple ID: match just requirementName
            return r.requirementName === taskRequirementName;
          }
        });

        if (!requirement) {
          console.error(`❌ Requirement not found for task: ${nextTask.id}`);
          console.error(`Available requirements:`, requirements.map(r => `${r.projectId}:${r.requirementName}`));
          state.updateTaskStatus(nextTask.id, createFailedStatus('Requirement not found'));

          // Remove from executing set (task was never actually started)
          set((state) => ({
            executingTasks: new Set([...state.executingTasks].filter(id => id !== nextTask.id)),
          }));

          // Update batch failed count
          set((state) => {
            const batch = state.batches[batchId];
            if (!batch) return state;

            return {
              batches: {
                ...state.batches,
                [batchId]: {
                  ...batch,
                  failedCount: batch.failedCount + 1,
                },
              },
            };
          });

          // Continue to next task instead of stopping
          setTimeout(() => {
            state.executeNextTask(batchId, requirements);
          }, 500);
          return;
        }

        console.log(`✅ Requirement found: ${requirement.projectPath}/.claude/commands/${requirement.requirementName}.md`);
        console.log(`🚀 Starting task execution for: ${nextTask.id}`);

        // Mark task as running
        set((state) => ({
          tasks: {
            ...state.tasks,
            [nextTask.id]: {
              ...state.tasks[nextTask.id],
              status: createRunningStatus(),
            },
          },
          executingTasks: new Set([...state.executingTasks, nextTask.id]),
        }));

        try {
          // Execute the task
          const result = await executeRequirementAsync(
            requirement.projectPath,
            requirement.requirementName,
            requirement.projectId,
            state.gitConfig || undefined
          );

          // Start polling for completion using the polling manager
          startTaskPolling(result.taskId, nextTask.id, batchId, requirement, state);

        } catch (error) {
          console.error(`Error executing task ${nextTask.id}:`, error);
          state.updateTaskStatus(nextTask.id, createFailedStatus(error instanceof Error ? error.message : 'Unknown error'));

          // Remove from executing set
          set((state) => ({
            executingTasks: new Set([...state.executingTasks].filter(id => id !== nextTask.id)),
          }));

          // Update batch failed count
          set((state) => {
            const batch = state.batches[batchId];
            if (!batch) return state;

            return {
              batches: {
                ...state.batches,
                [batchId]: {
                  ...batch,
                  failedCount: batch.failedCount + 1,
                },
              },
            };
          });

          // Try next task after delay
          setTimeout(() => state.executeNextTask(batchId, requirements), 1000);
        }
      },

      updateTaskStatus: (taskId, status) => {
        set((state) => ({
          tasks: {
            ...state.tasks,
            [taskId]: {
              ...state.tasks[taskId],
              status,
            },
          },
        }));
      },

      // ========================================================================
      // Global Actions
      // ========================================================================

      setGitConfig: (config) => {
        set({ gitConfig: config });
      },

      setPaused: (paused) => {
        set({ isPaused: paused });
      },

      // ========================================================================
      // Helper Methods
      // ========================================================================

      getActiveBatches: () => {
        const state = get();
        return (Object.keys(state.batches) as BatchId[]).filter(
          batchId => {
            const batch = state.batches[batchId];
            return batch && isBatchRunning(batch.status);
          }
        );
      },

      getBatchProgress: (batchId) => {
        const state = get();
        const batch = state.batches[batchId];

        if (!batch) {
          return { total: 0, completed: 0, failed: 0 };
        }

        const tasks = batch.taskIds.map(id => state.tasks[id]).filter(Boolean);
        const completed = tasks.filter(t => isTaskCompleted(t.status)).length;
        const failed = tasks.filter(t => isTaskFailed(t.status)).length;

        return {
          total: batch.taskIds.length,
          completed,
          failed,
        };
      },

      getTasksForBatch: (batchId) => {
        const state = get();
        const batch = state.batches[batchId];

        if (!batch) return [];

        return batch.taskIds
          .map(id => state.tasks[id])
          .filter(Boolean);
      },

      getNextTaskForBatch: (batchId) => {
        const tasks = get().getTasksForBatch(batchId);
        return tasks.find(t => isTaskQueued(t.status)) || null;
      },

      canStartTask: (batchId) => {
        const state = get();
        const batch = state.batches[batchId];

        if (!batch || !isBatchRunning(batch.status)) return false;

        // Check if batch already has a running task
        const tasks = state.getTasksForBatch(batchId);
        const hasRunningTask = tasks.some(t => isTaskRunning(t.status));

        return !hasRunningTask;
      },

      // ========================================================================
      // Recovery & Cleanup
      // ========================================================================

      recoverFromStorage: (requirements) => {
        const state = get();

        // Cache requirements for polling callbacks to access
        setCachedRequirements(requirements);

        // For each batch, verify that tasks still exist in requirements
        const batchIds: BatchId[] = ['batch1', 'batch2', 'batch3', 'batch4'];

        batchIds.forEach(batchId => {
          const batch = state.batches[batchId];
          if (!batch || isBatchCompleted(batch.status)) return;

          // Filter to only include tasks that still exist
          const validTaskIds = batch.taskIds.filter(taskId => {
            // Parse composite task ID (format: "projectId:requirementName")
            const [taskProjectId, taskRequirementName] = taskId.includes(':')
              ? taskId.split(':')
              : [null, taskId];

            return requirements.some(req => {
              if (taskProjectId) {
                // Composite ID: match both projectId and requirementName
                return req.projectId === taskProjectId && req.requirementName === taskRequirementName;
              } else {
                // Simple ID: match just requirementName
                return req.requirementName === taskRequirementName;
              }
            });
          });

          if (validTaskIds.length === 0) {
            // No valid tasks, mark as completed
            state.completeBatch(batchId);
            return;
          }

          if (validTaskIds.length !== batch.taskIds.length) {
            // Some tasks no longer exist, update the batch
            set((state) => ({
              batches: {
                ...state.batches,
                [batchId]: {
                  ...batch,
                  taskIds: validTaskIds,
                },
              },
            }));
          }

          // If batch was running, reconnect to running tasks and resume execution
          if (isBatchRunning(batch.status)) {
            console.log(`🔄 Recovering batch ${batchId} - reconnecting to running tasks`);

            // Collect tasks that need polling recovery
            const tasksToRecover: Array<{
              taskId: string;
              callback: PollingCallback;
            }> = [];

            // Reconnect to any tasks that were running before page refresh
            validTaskIds.forEach(taskId => {
              const task = state.tasks[taskId];
              if (task && isTaskRunning(task.status)) {
                // Find the requirement for this task
                const [taskProjectId, taskRequirementName] = taskId.includes(':')
                  ? taskId.split(':')
                  : [null, taskId];

                const requirement = requirements.find(req => {
                  if (taskProjectId) {
                    return req.projectId === taskProjectId && req.requirementName === taskRequirementName;
                  } else {
                    return req.requirementName === taskRequirementName;
                  }
                });

                if (requirement) {
                  // Build the polling callback for this task
                  const callback = createPollingCallback(
                    requirement.requirementName,
                    taskId,
                    batchId,
                    requirement,
                    state
                  );
                  tasksToRecover.push({ taskId, callback });
                }
              }
            });

            // Recover polling for all running tasks at once
            if (tasksToRecover.length > 0) {
              recoverActivePolling(tasksToRecover);
            }

            // Also resume execution for queued tasks
            state.executeNextTask(batchId, requirements);
          }
        });
      },

      clearAll: () => {
        // Stop all active polling using the polling manager
        cleanupAllPolling();

        set({
          batches: {
            batch1: null,
            batch2: null,
            batch3: null,
            batch4: null,
          },
          tasks: {},
          executingTasks: new Set(),
        });
      },
    }),
    {
      name: 'task-runner-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        batches: state.batches,
        tasks: state.tasks,
        isPaused: state.isPaused,
        gitConfig: state.gitConfig,
        // Don't persist executingTasks - will be reconstructed on recovery
      }),
    }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a polling callback for a task
 * This callback is used by the polling manager to check task status
 */
function createPollingCallback(
  taskId: string,
  requirementId: string,
  batchId: BatchId,
  requirement: ProjectRequirement,
  state: TaskRunnerState
): PollingCallback {
  return async () => {
    try {
      const taskStatus = await getTaskStatus(taskId);

      // Handle case where task is not found yet
      if (!taskStatus) {
        console.log(`⏳ Task ${taskId} not found yet, will retry...`);
        return { done: false };
      }

      console.log(`📊 Task status: ${taskStatus.status}`);

      if (taskStatus.status === 'completed') {
        // Task completed successfully
        console.log(`✅ Task ${requirementId} completed successfully`);
        state.updateTaskStatus(requirementId, createCompletedStatus());

        // Update batch progress using setState
        useTaskRunnerStore.setState((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          return {
            batches: {
              ...state.batches,
              [batchId]: {
                ...batch,
                completedCount: batch.completedCount + 1,
              },
            },
            executingTasks: new Set([...state.executingTasks].filter(id => id !== requirementId)),
          };
        });

        // Update idea status to 'implemented' and increment context counter
        try {
          await fetch('/api/ideas/update-implementation-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirementName: requirement.requirementName }),
          });
        } catch (err) {
          console.warn('Failed to update idea implementation status:', err);
        }

        // Clean up requirement file if needed
        try {
          await deleteRequirement(requirement.projectPath, requirement.requirementName);
        } catch (err) {
          console.warn('Failed to delete requirement file:', err);
        }

        // Continue with next task using cached requirements
        const allRequirements = getCachedRequirements();
        setTimeout(() => state.executeNextTask(batchId, allRequirements), 500);

        return { done: true, success: true };

      } else if (taskStatus.status === 'failed' || taskStatus.status === 'session-limit') {
        // Task failed
        console.error(`❌ Task ${requirementId} failed: ${taskStatus.error || 'Unknown error'}`);
        const isSessionLimit = taskStatus.status === 'session-limit';
        state.updateTaskStatus(
          requirementId,
          createFailedStatus(taskStatus.error || 'Task failed', Date.now(), isSessionLimit)
        );

        // Update batch failed count using setState
        useTaskRunnerStore.setState((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          return {
            batches: {
              ...state.batches,
              [batchId]: {
                ...batch,
                failedCount: batch.failedCount + 1,
              },
            },
            executingTasks: new Set([...state.executingTasks].filter(id => id !== requirementId)),
          };
        });

        // Continue with next task using cached requirements
        const allRequirements = getCachedRequirements();
        setTimeout(() => state.executeNextTask(batchId, allRequirements), 1000);

        return { done: true, success: false, error: taskStatus.error || 'Task failed' };
      }

      // Task still running, continue polling
      return { done: false };

    } catch (error) {
      console.error('Error polling task status:', error);
      // Continue polling despite error - will retry on next interval
      return { done: false };
    }
  };
}

/**
 * Start polling for task completion using the polling manager
 */
function startTaskPolling(
  taskId: string,
  requirementId: string,
  batchId: BatchId,
  requirement: ProjectRequirement,
  state: TaskRunnerState
): void {
  console.log(`🔄 Starting polling for task: ${requirementId}`);

  const callback = createPollingCallback(taskId, requirementId, batchId, requirement, state);

  startPolling(requirementId, callback, {
    intervalMs: 10000, // Poll every 10 seconds
    maxAttempts: 120,  // 20 minutes at 10s intervals
    onAttempt: (attempt) => {
      if (attempt % 6 === 0) { // Log every minute
        console.log(`⏳ Polling attempt #${attempt} for task: ${requirementId}`);
      }
    },
  });
}
