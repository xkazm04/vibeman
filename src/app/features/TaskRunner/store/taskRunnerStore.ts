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

// ============================================================================
// Global Polling Management
// ============================================================================

// Track active polling intervals to enable reconnection after page refresh
const activePollingIntervals = new Map<string, NodeJS.Timeout>();

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

export type BatchId = 'batch1' | 'batch2' | 'batch3' | 'batch4';
export type BatchStatus = 'idle' | 'running' | 'paused' | 'completed';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface BatchState {
  id: string;
  name: string;
  taskIds: string[]; // Tasks assigned to this batch
  status: BatchStatus;
  startedAt: number | null;
  completedAt?: number | null;
  completedCount: number;
  failedCount: number;
}

export interface TaskState {
  id: string; // requirement ID
  batchId: BatchId; // Which batch owns this task
  status: TaskStatus;
  error?: string;
  startedAt?: number;
  completedAt?: number;
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
  updateTaskStatus: (taskId: string, status: TaskStatus, error?: string) => void;

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
            status: 'idle',
            startedAt: null,
            completedCount: 0,
            failedCount: 0,
          };

          // Create task entries for all tasks in this batch
          const newTasks = { ...state.tasks };
          taskIds.forEach(taskId => {
            newTasks[taskId] = {
              id: taskId,
              batchId,
              status: 'queued',
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
          if (!batch || batch.status === 'running') return state;

          return {
            batches: {
              ...state.batches,
              [batchId]: {
                ...batch,
                status: 'running',
                startedAt: batch.startedAt || Date.now(),
              },
            },
          };
        });
      },

      pauseBatch: (batchId) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch || batch.status !== 'running') return state;

          return {
            batches: {
              ...state.batches,
              [batchId]: {
                ...batch,
                status: 'paused',
              },
            },
          };
        });
      },

      resumeBatch: (batchId) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch || batch.status !== 'paused') return state;

          return {
            batches: {
              ...state.batches,
              [batchId]: {
                ...batch,
                status: 'running',
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

          return {
            batches: {
              ...state.batches,
              [batchId]: {
                ...batch,
                status: 'completed',
                completedAt: Date.now(),
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
                status: 'queued',
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
          if (task?.status === 'running') return state;

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
                status: 'queued', // Reset to queued when moved
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
            return task && task.status === 'queued' && fromBatch.taskIds.includes(taskId);
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
        if (!batch || batch.status !== 'running') return;
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
          state.updateTaskStatus(nextTask.id, 'failed', 'Requirement not found');

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
              status: 'running',
              startedAt: Date.now(),
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

          // Start polling for completion (using setInterval for reconnection support)
          startPollingForTask(result.taskId, nextTask.id, batchId, requirement, state);

        } catch (error) {
          console.error(`Error executing task ${nextTask.id}:`, error);
          state.updateTaskStatus(nextTask.id, 'failed', error instanceof Error ? error.message : 'Unknown error');

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

      updateTaskStatus: (taskId, status, error) => {
        set((state) => ({
          tasks: {
            ...state.tasks,
            [taskId]: {
              ...state.tasks[taskId],
              status,
              error,
              completedAt: status === 'completed' || status === 'failed' ? Date.now() : undefined,
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
          batchId => state.batches[batchId]?.status === 'running'
        );
      },

      getBatchProgress: (batchId) => {
        const state = get();
        const batch = state.batches[batchId];

        if (!batch) {
          return { total: 0, completed: 0, failed: 0 };
        }

        const tasks = batch.taskIds.map(id => state.tasks[id]).filter(Boolean);
        const completed = tasks.filter(t => t.status === 'completed').length;
        const failed = tasks.filter(t => t.status === 'failed').length;

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
        return tasks.find(t => t.status === 'queued') || null;
      },

      canStartTask: (batchId) => {
        const state = get();
        const batch = state.batches[batchId];

        if (!batch || batch.status !== 'running') return false;

        // Check if batch already has a running task
        const tasks = state.getTasksForBatch(batchId);
        const hasRunningTask = tasks.some(t => t.status === 'running');

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
          if (!batch || batch.status === 'completed') return;

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
          if (batch.status === 'running') {
            console.log(`🔄 Recovering batch ${batchId} - reconnecting to running tasks`);

            // Reconnect to any tasks that were running before page refresh
            validTaskIds.forEach(taskId => {
              const task = state.tasks[taskId];
              if (task && task.status === 'running') {
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
                  console.log(`🔌 Reconnecting polling for task: ${taskId}`);
                  // Restart polling for this task (uses requirementName as taskId)
                  startPollingForTask(requirement.requirementName, taskId, batchId, requirement, state);
                }
              }
            });

            // Also resume execution for queued tasks
            state.executeNextTask(batchId, requirements);
          }
        });
      },

      clearAll: () => {
        // Stop all active polling intervals
        activePollingIntervals.forEach((interval, taskId) => {
          clearInterval(interval);
          console.log(`⏹️ Stopped polling for task: ${taskId}`);
        });
        activePollingIntervals.clear();

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
 * Start polling for task completion using setInterval (survives page refresh)
 */
function startPollingForTask(
  taskId: string,
  requirementId: string,
  batchId: BatchId,
  requirement: ProjectRequirement,
  state: TaskRunnerState
): void {
  // Clear any existing polling interval for this task
  stopPollingForTask(requirementId);

  const MAX_POLL_ATTEMPTS = 120; // 20 minutes at 10s intervals
  let attempts = 0;

  console.log(`🔄 Starting polling for task: ${requirementId}`);

  const pollInterval = setInterval(async () => {
    attempts++;

    try {
      const taskStatus = await getTaskStatus(taskId);

      // Handle case where task is not found yet
      if (!taskStatus) {
        console.log(`⏳ Task ${taskId} not found yet, will retry...`);

        // Stop polling if we've exceeded max attempts
        if (attempts >= MAX_POLL_ATTEMPTS) {
          console.error(`⏰ Polling timeout for task: ${requirementId}`);
          state.updateTaskStatus(requirementId, 'failed', 'Polling timeout - task took too long');
          stopPollingForTask(requirementId);
        }
        return;
      }

      console.log(`📊 Task status poll #${attempts}: ${taskStatus.status}`);

      if (taskStatus.status === 'completed') {
        // Task completed successfully
        console.log(`✅ Task ${requirementId} completed successfully`);
        state.updateTaskStatus(requirementId, 'completed');

        // Stop polling
        stopPollingForTask(requirementId);

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

        // Continue with next task using cached requirements (FIX: was passing [requirement] causing "Requirement not found")
        const allRequirements = getCachedRequirements();
        setTimeout(() => state.executeNextTask(batchId, allRequirements), 500);
        return;

      } else if (taskStatus.status === 'failed' || taskStatus.status === 'session-limit') {
        // Task failed
        console.error(`❌ Task ${requirementId} failed: ${taskStatus.error || 'Unknown error'}`);
        state.updateTaskStatus(requirementId, 'failed', taskStatus.error || 'Task failed');

        // Stop polling
        stopPollingForTask(requirementId);

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

        // Continue with next task using cached requirements (FIX: was passing [requirement] causing "Requirement not found")
        const allRequirements = getCachedRequirements();
        setTimeout(() => state.executeNextTask(batchId, allRequirements), 1000);
        return;
      }

      // Task still running, continue polling

    } catch (error) {
      console.error('Error polling task status:', error);
      // Continue polling despite error - will retry on next interval
    }
  }, 10000); // Poll every 10 seconds

  // Store the interval ID so we can stop it later
  activePollingIntervals.set(requirementId, pollInterval);
}

/**
 * Stop polling for a specific task
 */
function stopPollingForTask(requirementId: string): void {
  const interval = activePollingIntervals.get(requirementId);
  if (interval) {
    clearInterval(interval);
    activePollingIntervals.delete(requirementId);
    console.log(`⏹️ Stopped polling for task: ${requirementId}`);
  }
}
