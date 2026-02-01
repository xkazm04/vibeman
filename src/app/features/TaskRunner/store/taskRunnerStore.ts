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
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { ProjectRequirement } from '../lib/types';
import type { TaskActivity, ActivityEvent } from '../lib/activityClassifier.types';
import type { TaskCheckpointState, Checkpoint } from '../lib/checkpoint.types';
import type { BuiltRules } from '@/lib/rules/types';
import { rulesLoader } from '@/lib/rules';
import { createTaskCheckpointState } from '../lib/checkpointExtractor';
import { updateCheckpointStates, finalizeCheckpoints, autoAdvanceCheckpoints } from '../lib/checkpointDetector';
import { executeRequirementAsync, getTaskStatus, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import { executeGitOperations, generateCommitMessage } from '../sub_Git/gitApi';
import { getContextIdFromRequirement, triggerScreenshotCapture } from '../sub_Screenshot/screenshotApi';
import {
  startPolling,
  stopPolling,
  cleanupAllPolling,
  recoverActivePolling,
  isPollingActive,
  PollingResults,
  type PollingCallback,
  type PollingResult,
} from '../lib/pollingManager';
import { remoteEvents } from '@/lib/remote';

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
  // Session mode fields (optional - for Claude Code --resume support)
  claudeSessionId?: string | null;
  projectId?: string;
  projectPath?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface TaskState {
  id: string; // requirement ID
  batchId: BatchId; // Which batch owns this task
  status: TaskStatusUnion; // Now uses discriminated union
  // Session mode fields (optional - for Claude Code --resume support)
  requirementName?: string;
  claudeSessionId?: string;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
}

export interface GitConfig {
  enabled: boolean;
  commands: string[];
  commitMessage: string;
}

interface TaskRunnerState {
  // Batch Management
  batches: Record<BatchId, BatchState | null>;
  reservedBatchIds: Set<BatchId>; // Batch IDs reserved for pending async operations

  // Task Management
  tasks: Record<string, TaskState>; // Map of taskId -> TaskState

  // Execution State
  executingTasks: Set<string>; // Currently executing task IDs
  isPaused: boolean; // Global pause state

  // Requirements cache for batch continuation
  // Ensures polling callbacks have access to full requirements array
  requirementsCache: ProjectRequirement[];

  // Progress tracking for running tasks (progressLines from /api/claude-code status)
  taskProgress: Record<string, number>; // Map of taskId -> progressLines

  // Activity tracking for running tasks (parsed from stream-json output)
  taskActivity: Record<string, TaskActivity>; // Map of taskId -> activity

  // Checkpoint tracking for running tasks (derived from execution rules)
  taskCheckpoints: Record<string, TaskCheckpointState>; // Map of taskId -> checkpoints

  // Git Configuration
  gitConfig: GitConfig | null;

  // Orphaned requirement files that failed to delete after task completion
  // Tracked so users can manually clean up or retry deletion
  orphanedRequirements: Array<{
    projectPath: string;
    requirementName: string;
    failedAt: number;
    error: string;
  }>;

  // Actions - Batch Management
  createBatch: (batchId: BatchId, name: string, taskIds: string[]) => void;
  createSessionBatch: (
    batchId: BatchId,
    projectId: string,
    projectPath: string,
    name: string,
    taskId: string,
    requirementName: string
  ) => string; // Returns internal batch ID
  startBatch: (batchId: BatchId) => void;
  pauseBatch: (batchId: BatchId) => void;
  resumeBatch: (batchId: BatchId) => void;
  completeBatch: (batchId: BatchId) => void;
  deleteBatch: (batchId: BatchId) => void;
  renameBatch: (batchId: BatchId, newName: string) => void;
  updateBatchClaudeSessionId: (batchId: BatchId, claudeSessionId: string) => void;
  compactBatch: (batchId: BatchId) => void; // Remove completed tasks

  // Actions - Task Management
  addTaskToBatch: (batchId: BatchId, taskId: string) => void;
  addTaskToBatchWithName: (batchId: BatchId, taskId: string, requirementName: string) => void;
  removeTaskFromBatch: (batchId: BatchId, taskId: string) => void;
  moveTask: (taskId: string, fromBatchId: BatchId, toBatchId: BatchId) => void;
  offloadTasks: (fromBatchId: BatchId, toBatchId: BatchId, taskIds: string[]) => void;
  updateTaskSessionStatus: (
    batchId: BatchId,
    taskId: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    extras?: { claudeSessionId?: string; errorMessage?: string }
  ) => void;

  // Actions - Task Execution
  executeNextTask: (batchId: BatchId, requirements: ProjectRequirement[]) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatusUnion) => void;
  updateTaskProgress: (taskId: string, progressLines: number) => void;
  updateTaskActivity: (taskId: string, activity: TaskActivity) => void;

  // Actions - Checkpoint Management
  initializeCheckpoints: (taskId: string, builtRules: BuiltRules) => void;
  updateCheckpoints: (taskId: string, activity: TaskActivity, events: ActivityEvent[]) => void;
  finalizeTaskCheckpoints: (taskId: string) => void;
  clearTaskCheckpoints: (taskId: string) => void;

  // Actions - Global
  setGitConfig: (config: GitConfig | null) => void;
  setPaused: (paused: boolean) => void;
  setRequirementsCache: (requirements: ProjectRequirement[]) => void;

  // Actions - Orphaned Requirements Cleanup
  addOrphanedRequirement: (projectPath: string, requirementName: string, error: string) => void;
  removeOrphanedRequirement: (requirementName: string) => void;
  retryDeleteOrphanedRequirement: (requirementName: string) => Promise<boolean>;
  clearOrphanedRequirements: () => void;

  // Helpers
  getActiveBatches: () => BatchId[];
  getBatchProgress: (batchId: BatchId) => { total: number; completed: number; failed: number };
  getTasksForBatch: (batchId: BatchId) => TaskState[];
  getNextTaskForBatch: (batchId: BatchId) => TaskState | null;
  canStartTask: (batchId: BatchId) => boolean;
  // Session helpers
  getNextAvailableBatchId: () => BatchId | null;
  getSessionBatches: () => BatchId[]; // Returns batches with claudeSessionId set
  isTaskInAnyBatch: (taskId: string) => BatchId | null;
  // Atomic batch reservation for race-condition-free async operations
  reserveBatchSlot: () => BatchId | null; // Atomically reserves a batch slot, returns null if all full
  releaseBatchReservation: (batchId: BatchId) => void; // Releases a reservation if async op fails

  // Recovery
  recoverFromStorage: (requirements: ProjectRequirement[]) => void;
  clearAll: () => void;
}

// ============================================================================
// Debounced Storage
// ============================================================================

const DEBOUNCE_MS = 2000;

function createDebouncedStorage(): StateStorage {
  let pendingValue: string | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  const STORAGE_KEY = 'task-runner-storage';

  return {
    getItem(name: string): string | null {
      // If there's a pending write for this key, return that value
      // so the store sees the most recent state
      if (name === STORAGE_KEY && pendingValue !== null) {
        return pendingValue;
      }
      return localStorage.getItem(name);
    },
    setItem(name: string, value: string): void {
      if (name === STORAGE_KEY) {
        pendingValue = value;
        if (timerId !== null) {
          clearTimeout(timerId);
        }
        timerId = setTimeout(() => {
          localStorage.setItem(name, value);
          pendingValue = null;
          timerId = null;
        }, DEBOUNCE_MS);
      } else {
        localStorage.setItem(name, value);
      }
    },
    removeItem(name: string): void {
      if (name === STORAGE_KEY && timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
        pendingValue = null;
      }
      localStorage.removeItem(name);
    },
  };
}

const debouncedStorage = createDebouncedStorage();

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
      reservedBatchIds: new Set(),
      tasks: {},
      executingTasks: new Set(),
      isPaused: false,
      requirementsCache: [],
      taskProgress: {},
      taskActivity: {},
      taskCheckpoints: {},
      gitConfig: null,
      orphanedRequirements: [],

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

      createSessionBatch: (batchId, projectId, projectPath, name, taskId, requirementName) => {
        const internalBatchId = `batch_${Date.now()}`;
        const now = Date.now();

        set((state) => {
          // Clear reservation when actually creating the batch
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
                // Session fields
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

      renameBatch: (batchId, newName) => {
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

      updateBatchClaudeSessionId: (batchId, claudeSessionId) => {
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

      compactBatch: (batchId) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          // Remove completed tasks
          const completedTaskIds = batch.taskIds.filter(taskId => {
            const task = state.tasks[taskId];
            return task && isTaskCompleted(task.status);
          });

          const remainingTaskIds = batch.taskIds.filter(
            id => !completedTaskIds.includes(id)
          );

          // If no tasks left, clear the batch
          if (remainingTaskIds.length === 0) {
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
          }

          // Remove completed task entries
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

      addTaskToBatchWithName: (batchId, taskId, requirementName) => {
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

      updateTaskSessionStatus: (batchId, taskId, status, extras) => {
        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          const task = state.tasks[taskId];
          if (!task) return state;

          // Map session status to discriminated union status
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

          const updatedTask: TaskState = {
            ...task,
            status: taskStatus,
            claudeSessionId: extras?.claudeSessionId ?? task.claudeSessionId,
            errorMessage: extras?.errorMessage,
            startedAt: status === 'running' ? Date.now() : task.startedAt,
            completedAt: (status === 'completed' || status === 'failed') ? Date.now() : task.completedAt,
          };

          // Auto-update batch status based on task statuses
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
            batchStatus = createCompletedBatchStatus(startedAt); // Mark as completed even with failures
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

        // Initialize checkpoints for this task
        // Look up contextId from requirement (may be null if no linked idea)
        const contextId = await getContextIdFromRequirement(requirement.requirementName);

        // Post-await verification: check batch/task state hasn't changed during async operation
        // This prevents orphaned executions when users quickly pause/clear batches
        {
          const freshState = get();
          const freshBatch = freshState.batches[batchId];
          if (!freshBatch || !isBatchRunning(freshBatch.status) || freshState.isPaused) {
            console.log(`⚠️ Batch ${batchId} state changed during context lookup, aborting task ${nextTask.id}`);
            // Clean up: remove from executing set since we're not proceeding
            set((s) => ({
              executingTasks: new Set([...s.executingTasks].filter(id => id !== nextTask.id)),
              tasks: {
                ...s.tasks,
                [nextTask.id]: {
                  ...s.tasks[nextTask.id],
                  status: createQueuedStatus(), // Reset to queued so it can be re-executed later
                },
              },
            }));
            return;
          }
          // Verify task is still owned by this batch
          if (!freshBatch.taskIds.includes(nextTask.id)) {
            console.log(`⚠️ Task ${nextTask.id} no longer in batch ${batchId}, aborting execution`);
            set((s) => ({
              executingTasks: new Set([...s.executingTasks].filter(id => id !== nextTask.id)),
            }));
            return;
          }
        }

        const builtRules = rulesLoader.buildRules({
          requirementContent: '', // Not needed for checkpoint extraction
          projectPath: requirement.projectPath,
          projectId: requirement.projectId,
          contextId: contextId || undefined,
          gitEnabled: state.gitConfig?.enabled || false,
          gitCommitMessage: state.gitConfig?.commitMessage,
        });
        state.initializeCheckpoints(nextTask.id, builtRules);
        console.log(`📋 Initialized ${builtRules.includedRuleIds.length} checkpoints for task: ${nextTask.id}`);

        // Publish task started event to remote
        remoteEvents.taskStarted(requirement.projectId, {
          taskId: nextTask.id,
          batchId,
          title: requirement.requirementName,
        });

        try {
          // Execute the task
          const result = await executeRequirementAsync(
            requirement.projectPath,
            requirement.requirementName,
            requirement.projectId,
            state.gitConfig || undefined
          );

          // Post-await verification after executeRequirementAsync
          // Check batch/task state hasn't changed during task execution startup
          {
            const freshState = get();
            const freshBatch = freshState.batches[batchId];
            if (!freshBatch || !isBatchRunning(freshBatch.status) || freshState.isPaused) {
              console.log(`⚠️ Batch ${batchId} state changed during execution startup, task ${nextTask.id} will be orphaned`);
              // Task already started in Claude Code, but we won't poll for it
              // The execution will complete but store won't track it
              set((s) => ({
                executingTasks: new Set([...s.executingTasks].filter(id => id !== nextTask.id)),
              }));
              return;
            }
            if (!freshBatch.taskIds.includes(nextTask.id)) {
              console.log(`⚠️ Task ${nextTask.id} removed from batch ${batchId} during execution startup`);
              set((s) => ({
                executingTasks: new Set([...s.executingTasks].filter(id => id !== nextTask.id)),
              }));
              return;
            }
          }

          // Start polling for completion using the polling manager
          // Note: state is no longer passed - polling callback uses getState() for fresh state
          startTaskPolling(result.taskId, nextTask.id, batchId, requirement);

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

      updateTaskProgress: (taskId, progressLines) => {
        set((state) => ({
          taskProgress: {
            ...state.taskProgress,
            [taskId]: progressLines,
          },
        }));
      },

      updateTaskActivity: (taskId, activity) => {
        set((state) => ({
          taskActivity: {
            ...state.taskActivity,
            [taskId]: activity,
          },
        }));
      },

      // ========================================================================
      // Checkpoint Actions
      // ========================================================================

      initializeCheckpoints: (taskId, builtRules) => {
        set((state) => ({
          taskCheckpoints: {
            ...state.taskCheckpoints,
            [taskId]: createTaskCheckpointState(taskId, builtRules),
          },
        }));
      },

      updateCheckpoints: (taskId, activity, events) => {
        set((state) => {
          const checkpointState = state.taskCheckpoints[taskId];
          if (!checkpointState) return state;

          // Update checkpoint states based on activity
          let updatedCheckpoints = updateCheckpointStates(
            checkpointState.checkpoints,
            activity,
            events
          );

          // Auto-advance earlier checkpoints if a later one started
          updatedCheckpoints = autoAdvanceCheckpoints(updatedCheckpoints);

          // Find current active checkpoint
          const currentCheckpoint = updatedCheckpoints.find(
            (c) => c.status === 'in_progress'
          );

          return {
            taskCheckpoints: {
              ...state.taskCheckpoints,
              [taskId]: {
                ...checkpointState,
                checkpoints: updatedCheckpoints,
                currentCheckpointId: currentCheckpoint?.id || null,
              },
            },
          };
        });
      },

      finalizeTaskCheckpoints: (taskId) => {
        set((state) => {
          const checkpointState = state.taskCheckpoints[taskId];
          if (!checkpointState) return state;

          return {
            taskCheckpoints: {
              ...state.taskCheckpoints,
              [taskId]: {
                ...checkpointState,
                checkpoints: finalizeCheckpoints(checkpointState.checkpoints),
                currentCheckpointId: null,
              },
            },
          };
        });
      },

      clearTaskCheckpoints: (taskId) => {
        set((state) => {
          const { [taskId]: _, ...rest } = state.taskCheckpoints;
          return { taskCheckpoints: rest };
        });
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

      setRequirementsCache: (requirements) => {
        set({ requirementsCache: [...requirements] });
        console.log(`📦 Requirements cache updated: ${requirements.length} requirements`);
      },

      // ========================================================================
      // Orphaned Requirements Cleanup Actions
      // ========================================================================

      addOrphanedRequirement: (projectPath, requirementName, error) => {
        set((state) => ({
          orphanedRequirements: [
            ...state.orphanedRequirements,
            {
              projectPath,
              requirementName,
              failedAt: Date.now(),
              error,
            },
          ],
        }));
        console.warn(`⚠️ Orphaned requirement tracked: ${requirementName} (${error})`);
      },

      removeOrphanedRequirement: (requirementName) => {
        set((state) => ({
          orphanedRequirements: state.orphanedRequirements.filter(
            (r) => r.requirementName !== requirementName
          ),
        }));
      },

      retryDeleteOrphanedRequirement: async (requirementName) => {
        const state = get();
        const orphaned = state.orphanedRequirements.find(
          (r) => r.requirementName === requirementName
        );
        if (!orphaned) return false;

        try {
          await deleteRequirement(orphaned.projectPath, requirementName);
          // Remove from orphaned list on success
          set((s) => ({
            orphanedRequirements: s.orphanedRequirements.filter(
              (r) => r.requirementName !== requirementName
            ),
          }));
          console.log(`✅ Successfully deleted orphaned requirement: ${requirementName}`);
          return true;
        } catch (err) {
          console.warn(`❌ Retry delete failed for ${requirementName}:`, err);
          return false;
        }
      },

      clearOrphanedRequirements: () => {
        set({ orphanedRequirements: [] });
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

      // Session helpers
      getNextAvailableBatchId: () => {
        const state = get();
        const batchIds: BatchId[] = ['batch1', 'batch2', 'batch3', 'batch4'];

        for (const id of batchIds) {
          // Check both actual batches AND reservations
          if (!state.batches[id] && !state.reservedBatchIds.has(id)) {
            return id;
          }
        }
        return null;
      },

      // Atomically reserve a batch slot for async operations
      // This prevents race conditions when multiple requests try to claim the same slot
      reserveBatchSlot: () => {
        const state = get();
        const batchIds: BatchId[] = ['batch1', 'batch2', 'batch3', 'batch4'];

        for (const id of batchIds) {
          if (!state.batches[id] && !state.reservedBatchIds.has(id)) {
            // Atomically add reservation
            set((s) => ({
              reservedBatchIds: new Set([...s.reservedBatchIds, id]),
            }));
            return id;
          }
        }
        return null;
      },

      // Release a batch reservation if the async operation fails
      releaseBatchReservation: (batchId) => {
        set((state) => {
          const newReserved = new Set(state.reservedBatchIds);
          newReserved.delete(batchId);
          return { reservedBatchIds: newReserved };
        });
      },

      getSessionBatches: () => {
        const state = get();
        const batchIds: BatchId[] = ['batch1', 'batch2', 'batch3', 'batch4'];

        return batchIds.filter(id => {
          const batch = state.batches[id];
          // A session batch has projectPath set (indicating it's for session mode)
          return batch !== null && batch.projectPath !== undefined;
        });
      },

      isTaskInAnyBatch: (taskId) => {
        const state = get();
        const batchIds: BatchId[] = ['batch1', 'batch2', 'batch3', 'batch4'];

        for (const batchId of batchIds) {
          const batch = state.batches[batchId];
          if (batch?.taskIds.includes(taskId)) {
            return batchId;
          }
        }
        return null;
      },

      // ========================================================================
      // Recovery & Cleanup
      // ========================================================================

      recoverFromStorage: (requirements) => {
        const state = get();

        // Cache requirements for polling callbacks to access
        state.setRequirementsCache(requirements);

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
                  // Note: createPollingCallback uses getState() internally to avoid stale closures
                  const callback = createPollingCallback(
                    requirement.requirementName,
                    taskId,
                    batchId,
                    requirement
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
          taskProgress: {},
          taskActivity: {},
        });
      },
    }),
    {
      name: 'task-runner-storage',
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (state) => ({
        batches: state.batches,
        tasks: state.tasks,
        isPaused: state.isPaused,
        gitConfig: state.gitConfig,
        orphanedRequirements: state.orphanedRequirements,
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
 *
 * IMPORTANT: This callback runs asynchronously (every ~10s) and must NOT capture
 * state by reference in the closure. Always use useTaskRunnerStore.getState()
 * inside the callback to get fresh state on each poll.
 *
 * @returns PollingCallback that returns one of three discriminated union types:
 * - { done: false } - continue polling
 * - { done: true, success: true } - task completed successfully
 * - { done: true, success: false, error: string } - task failed
 */
function createPollingCallback(
  taskId: string,
  requirementId: string,
  batchId: BatchId,
  requirement: ProjectRequirement
): PollingCallback {
  return async (): Promise<PollingResult> => {
    try {
      const taskStatus = await getTaskStatus(taskId);

      // Handle case where task is not found yet
      if (!taskStatus) {
        console.log(`⏳ Task ${taskId} not found yet, will retry...`);
        return PollingResults.continue();
      }

      // Handle stuck pending tasks - if task is pending after being started, something is wrong
      if (taskStatus.status === 'pending') {
        console.warn(`⚠️ Task ${requirementId} still pending - execution may have failed to start`);
        // Continue polling but log warning - task should transition to running
        return PollingResults.continue();
      }

      // Batch all progress/activity/checkpoint state updates into a single setState call
      // to avoid 2-3 separate renders per polling tick
      const progressLines = taskStatus.progress?.length || 0;
      let mappedActivity: TaskActivity | null = null;

      if (taskStatus.activity) {
        const parseEvent = (event: any): ActivityEvent | null => {
          if (!event) return null;
          return {
            ...event,
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          };
        };

        mappedActivity = {
          currentActivity: parseEvent(taskStatus.activity.current),
          activityHistory: (taskStatus.activity.history || []).map(parseEvent).filter(Boolean) as ActivityEvent[],
          toolCounts: taskStatus.activity.toolCounts || {},
          phase: taskStatus.activity.phase || 'idle',
        };
      }

      if (progressLines > 0 || mappedActivity) {
        useTaskRunnerStore.setState((state) => {
          const updates: Partial<TaskRunnerState> = {};

          if (progressLines > 0) {
            updates.taskProgress = {
              ...state.taskProgress,
              [requirementId]: progressLines,
            };
          }

          if (mappedActivity) {
            updates.taskActivity = {
              ...state.taskActivity,
              [requirementId]: mappedActivity,
            };

            // Compute checkpoint updates inline instead of a separate setState
            const checkpointState = state.taskCheckpoints[requirementId];
            if (checkpointState) {
              let updatedCheckpoints = updateCheckpointStates(
                checkpointState.checkpoints,
                mappedActivity,
                mappedActivity.activityHistory
              );
              updatedCheckpoints = autoAdvanceCheckpoints(updatedCheckpoints);
              const currentCheckpoint = updatedCheckpoints.find(
                (c) => c.status === 'in_progress'
              );
              updates.taskCheckpoints = {
                ...state.taskCheckpoints,
                [requirementId]: {
                  ...checkpointState,
                  checkpoints: updatedCheckpoints,
                  currentCheckpointId: currentCheckpoint?.id || null,
                },
              };
            }
          }

          return updates;
        });
      }

      if (taskStatus.status === 'completed') {
        // Task completed successfully
        console.log(`✅ Task ${requirementId} completed successfully`);

        // Get fresh state to avoid stale closure - methods must be called on current state
        const freshState = useTaskRunnerStore.getState();
        freshState.updateTaskStatus(requirementId, createCompletedStatus());

        // Finalize checkpoints (mark remaining as completed)
        freshState.finalizeTaskCheckpoints(requirementId);

        // Update batch progress and clear task progress/activity/checkpoints using setState
        useTaskRunnerStore.setState((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          // Clear progressLines, activity, and checkpoints for completed task
          const newTaskProgress = { ...state.taskProgress };
          delete newTaskProgress[requirementId];
          const newTaskActivity = { ...state.taskActivity };
          delete newTaskActivity[requirementId];
          const newTaskCheckpoints = { ...state.taskCheckpoints };
          delete newTaskCheckpoints[requirementId];

          return {
            batches: {
              ...state.batches,
              [batchId]: {
                ...batch,
                completedCount: batch.completedCount + 1,
              },
            },
            executingTasks: new Set([...state.executingTasks].filter(id => id !== requirementId)),
            taskProgress: newTaskProgress,
            taskActivity: newTaskActivity,
            taskCheckpoints: newTaskCheckpoints,
          };
        });

        // Publish task completed event to remote
        remoteEvents.taskCompleted(requirement.projectId, {
          taskId: requirementId,
          batchId,
          title: requirement.requirementName,
        });

        // Publish batch progress update
        const currentState = useTaskRunnerStore.getState();
        const batchProgress = currentState.getBatchProgress(batchId);
        remoteEvents.batchProgress(requirement.projectId, {
          batchId,
          completed: batchProgress.completed,
          total: batchProgress.total,
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
          // Track orphaned requirement for later cleanup instead of silent failure
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          useTaskRunnerStore.getState().addOrphanedRequirement(
            requirement.projectPath,
            requirement.requirementName,
            errorMessage
          );
        }

        // Continue with next task using cached requirements from store
        // Use fresh state inside setTimeout to avoid stale closure
        setTimeout(() => {
          const nextState = useTaskRunnerStore.getState();
          nextState.executeNextTask(batchId, nextState.requirementsCache);
        }, 500);

        return PollingResults.success();

      } else if (taskStatus.status === 'failed' || taskStatus.status === 'session-limit') {
        // Task failed
        console.error(`❌ Task ${requirementId} failed: ${taskStatus.error || 'Unknown error'}`);
        const isSessionLimit = taskStatus.status === 'session-limit';

        // Get fresh state to avoid stale closure
        const freshFailedState = useTaskRunnerStore.getState();
        freshFailedState.updateTaskStatus(
          requirementId,
          createFailedStatus(taskStatus.error || 'Task failed', Date.now(), isSessionLimit)
        );

        // Update batch failed count and clear task progress/activity/checkpoints using setState
        useTaskRunnerStore.setState((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          // Clear progressLines, activity, and checkpoints for failed task
          const newTaskProgress = { ...state.taskProgress };
          delete newTaskProgress[requirementId];
          const newTaskActivity = { ...state.taskActivity };
          delete newTaskActivity[requirementId];
          const newTaskCheckpoints = { ...state.taskCheckpoints };
          delete newTaskCheckpoints[requirementId];

          return {
            batches: {
              ...state.batches,
              [batchId]: {
                ...batch,
                failedCount: batch.failedCount + 1,
              },
            },
            executingTasks: new Set([...state.executingTasks].filter(id => id !== requirementId)),
            taskProgress: newTaskProgress,
            taskActivity: newTaskActivity,
            taskCheckpoints: newTaskCheckpoints,
          };
        });

        // Publish task failed event to remote
        remoteEvents.taskFailed(requirement.projectId, {
          taskId: requirementId,
          batchId,
          title: requirement.requirementName,
          error: taskStatus.error || 'Task failed',
        });

        // Publish batch progress update
        const failedState = useTaskRunnerStore.getState();
        const failedBatchProgress = failedState.getBatchProgress(batchId);
        remoteEvents.batchProgress(requirement.projectId, {
          batchId,
          completed: failedBatchProgress.completed,
          total: failedBatchProgress.total,
        });

        // Continue with next task using cached requirements from store
        // Use fresh state inside setTimeout to avoid stale closure
        setTimeout(() => {
          const nextState = useTaskRunnerStore.getState();
          nextState.executeNextTask(batchId, nextState.requirementsCache);
        }, 1000);

        return PollingResults.failure(taskStatus.error || 'Task failed');
      }

      // Task still running, continue polling
      return PollingResults.continue();

    } catch (error) {
      console.error('Error polling task status:', error);
      // Continue polling despite error - will retry on next interval
      return PollingResults.continue();
    }
  };
}

/**
 * Start polling for task completion using the polling manager
 *
 * Note: State is no longer passed as parameter - the polling callback uses
 * useTaskRunnerStore.getState() internally to get fresh state on each poll.
 */
function startTaskPolling(
  taskId: string,
  requirementId: string,
  batchId: BatchId,
  requirement: ProjectRequirement
): void {
  console.log(`🔄 Starting polling for task: ${requirementId}`);

  const callback = createPollingCallback(taskId, requirementId, batchId, requirement);

  startPolling(requirementId, callback, {
    intervalMs: 10000, // Poll every 10 seconds
    // No maxAttempts - sessions can take a long time
    onAttempt: (attempt) => {
      if (attempt % 6 === 0) { // Log every minute
        console.log(`⏳ Polling attempt #${attempt} for task: ${requirementId}`);
      }
    },
  });
}
