/**
 * Zustand Store for Task Runner
 * Centralizes batch and task execution management
 *
 * This is a thin orchestrator that composes focused action modules:
 * - batchActions.ts    — batch CRUD (create, start, pause, resume, complete, delete)
 * - taskActions.ts     — task add/remove/move/offload between batches
 * - executionActions.ts — task execution, polling, completion/failure lifecycle
 * - checkpointActions.ts — checkpoint init/update/finalize
 * - pollingManager.ts  — low-level polling infrastructure (already separate)
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { ProjectRequirement } from '../lib/types';
import type { TaskActivity, ActivityEvent } from '../lib/activityClassifier.types';
import type { TaskCheckpointState, Checkpoint } from '../lib/checkpoint.types';
import type { BuiltRules } from '@/lib/rules/types';
import type { TaskStatusUnion, BatchStatusUnion, TaskStatusType, BatchStatusType } from '../lib/types';
import {
  createQueuedStatus,
  isTaskRunning,
  isTaskQueued,
  isTaskCompleted,
  isTaskFailed,
  isBatchIdle,
  isBatchRunning,
  isBatchPaused,
  isBatchCompleted,
} from '../lib/types';
import { deleteRequirement } from '@/app/Claude/lib/requirementApi';
import {
  cleanupAllPolling,
  recoverActivePolling,
  type PollingCallback,
} from '../lib/pollingManager';

// Action slices
import { createBatchActions } from './batchActions';
import { createTaskActions } from './taskActions';
import { createExecutionActions, createPollingCallback, setStoreRef } from './executionActions';
import { createCheckpointActions } from './checkpointActions';

// ============================================================================
// Types
// ============================================================================

/** Batch IDs are dynamic strings like 'batch1', 'batch2', ... 'batchN'. */
export type BatchId = string;

// Re-export type aliases for backward compatibility
export type BatchStatus = BatchStatusType;
export type TaskStatus = TaskStatusType;

export interface BatchState {
  id: string;
  name: string;
  taskIds: string[];
  status: BatchStatusUnion;
  completedCount: number;
  failedCount: number;
  claudeSessionId?: string | null;
  projectId?: string;
  projectPath?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface TaskState {
  id: string;
  batchId: BatchId;
  status: TaskStatusUnion;
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

export interface TaskRunnerState {
  // Batch Management
  batches: Record<string, BatchState>;
  reservedBatchIds: Set<string>;

  // Task Management
  tasks: Record<string, TaskState>;

  // Execution State
  executingTasks: Set<string>;
  isPaused: boolean;

  // Requirements cache for batch continuation
  requirementsCache: ProjectRequirement[];

  // Progress tracking
  taskProgress: Record<string, number>;
  taskActivity: Record<string, TaskActivity>;
  taskCheckpoints: Record<string, TaskCheckpointState>;

  // Git Configuration
  gitConfig: GitConfig | null;

  // Orphaned requirement files
  orphanedRequirements: Array<{
    projectPath: string;
    requirementName: string;
    failedAt: number;
    error: string;
  }>;

  // Actions - Batch Management (from batchActions.ts)
  createBatch: (batchId: BatchId, name: string, taskIds: string[]) => void;
  createSessionBatch: (
    batchId: BatchId,
    projectId: string,
    projectPath: string,
    name: string,
    taskId: string,
    requirementName: string
  ) => string;
  startBatch: (batchId: BatchId) => void;
  pauseBatch: (batchId: BatchId) => void;
  resumeBatch: (batchId: BatchId) => void;
  completeBatch: (batchId: BatchId) => void;
  deleteBatch: (batchId: BatchId) => void;
  renameBatch: (batchId: BatchId, newName: string) => void;
  updateBatchClaudeSessionId: (batchId: BatchId, claudeSessionId: string) => void;
  compactBatch: (batchId: BatchId) => void;

  // Actions - Task Management (from taskActions.ts)
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

  // Actions - Task Execution (from executionActions.ts)
  executeNextTask: (batchId: BatchId, requirements: ProjectRequirement[]) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatusUnion) => void;
  updateTaskProgress: (taskId: string, progressLines: number) => void;
  updateTaskActivity: (taskId: string, activity: TaskActivity) => void;

  // Actions - Checkpoint Management (from checkpointActions.ts)
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
  getNextAvailableBatchId: () => BatchId;
  getSessionBatches: () => BatchId[];
  isTaskInAnyBatch: (taskId: string) => BatchId | null;
  reserveBatchSlot: () => BatchId;
  releaseBatchReservation: (batchId: BatchId) => void;

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
// Store Implementation — composes action slices
// ============================================================================

export const useTaskRunnerStore = create<TaskRunnerState>()(
  persist(
    (set, get) => ({
      // Initial State
      batches: {},
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

      // Compose action slices
      ...createBatchActions(set, get),
      ...createTaskActions(set, get),
      ...createExecutionActions(set, get),
      ...createCheckpointActions(set),

      // ====================================================================
      // Global Actions (kept inline — small and cross-cutting)
      // ====================================================================

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

      // ====================================================================
      // Orphaned Requirements Cleanup
      // ====================================================================

      addOrphanedRequirement: (projectPath, requirementName, error) => {
        set((state) => ({
          orphanedRequirements: [
            ...state.orphanedRequirements,
            { projectPath, requirementName, failedAt: Date.now(), error },
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

      // ====================================================================
      // Helper Methods
      // ====================================================================

      getActiveBatches: () => {
        const state = get();
        return Object.keys(state.batches).filter(
          batchId => isBatchRunning(state.batches[batchId]?.status)
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

        return { total: batch.taskIds.length, completed, failed };
      },

      getTasksForBatch: (batchId) => {
        const state = get();
        const batch = state.batches[batchId];
        if (!batch) return [];
        return batch.taskIds.map(id => state.tasks[id]).filter(Boolean);
      },

      getNextTaskForBatch: (batchId) => {
        const tasks = get().getTasksForBatch(batchId);
        return tasks.find(t => isTaskQueued(t.status)) || null;
      },

      canStartTask: (batchId) => {
        const state = get();
        const batch = state.batches[batchId];
        if (!batch || !isBatchRunning(batch.status)) return false;
        const tasks = state.getTasksForBatch(batchId);
        return !tasks.some(t => isTaskRunning(t.status));
      },

      getNextAvailableBatchId: () => {
        const state = get();
        // Find lowest unused batchN id
        for (let n = 1; ; n++) {
          const id = `batch${n}`;
          if (!state.batches[id] && !state.reservedBatchIds.has(id)) {
            return id;
          }
        }
      },

      reserveBatchSlot: () => {
        const nextId = get().getNextAvailableBatchId()!;
        set((s) => ({
          reservedBatchIds: new Set([...s.reservedBatchIds, nextId]),
        }));
        return nextId;
      },

      releaseBatchReservation: (batchId) => {
        set((state) => {
          const newReserved = new Set(state.reservedBatchIds);
          newReserved.delete(batchId);
          return { reservedBatchIds: newReserved };
        });
      },

      getSessionBatches: () => {
        const state = get();
        return Object.keys(state.batches).filter(id => {
          const batch = state.batches[id];
          return batch && batch.projectPath !== undefined;
        });
      },

      isTaskInAnyBatch: (taskId) => {
        const state = get();
        for (const batchId of Object.keys(state.batches)) {
          if (state.batches[batchId]?.taskIds.includes(taskId)) {
            return batchId;
          }
        }
        return null;
      },

      // ====================================================================
      // Recovery & Cleanup
      // ====================================================================

      recoverFromStorage: (requirements) => {
        const state = get();
        state.setRequirementsCache(requirements);

        Object.keys(state.batches).forEach(batchId => {
          const batch = state.batches[batchId];
          if (!batch || isBatchCompleted(batch.status)) return;

          const validTaskIds = batch.taskIds.filter(taskId => {
            const [taskProjectId, taskRequirementName] = taskId.includes(':')
              ? taskId.split(':')
              : [null, taskId];

            return requirements.some(req => {
              if (taskProjectId) {
                return req.projectId === taskProjectId && req.requirementName === taskRequirementName;
              } else {
                return req.requirementName === taskRequirementName;
              }
            });
          });

          if (validTaskIds.length === 0) {
            state.completeBatch(batchId);
            return;
          }

          if (validTaskIds.length !== batch.taskIds.length) {
            set((state) => ({
              batches: {
                ...state.batches,
                [batchId]: { ...batch, taskIds: validTaskIds },
              },
            }));
          }

          if (isBatchRunning(batch.status)) {
            console.log(`🔄 Recovering batch ${batchId} - reconnecting to running tasks`);

            const tasksToRecover: Array<{
              taskId: string;
              callback: PollingCallback;
            }> = [];

            validTaskIds.forEach(taskId => {
              const task = state.tasks[taskId];
              if (task && isTaskRunning(task.status)) {
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

            if (tasksToRecover.length > 0) {
              recoverActivePolling(tasksToRecover);
            }

            state.executeNextTask(batchId, requirements);
          }
        });
      },

      clearAll: () => {
        cleanupAllPolling();
        set({
          batches: {},
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
      }),
    }
  )
);

// Link the store to executionActions for polling callbacks
setStoreRef(useTaskRunnerStore);
