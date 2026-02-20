/**
 * Task Runner Store - Minimal Shim
 *
 * Batch execution mode has been removed. This file preserves type exports
 * and a no-op store so that external consumers (Blueprint scans, Ideas buffer,
 * CLI sync) don't crash. All batch operations are no-ops.
 *
 * The CLI session system (src/components/cli/) is now the sole execution mode.
 */

import { create } from 'zustand';
import type { ProjectRequirement } from '../lib/types';
import type { TaskActivity } from '../lib/activityClassifier.types';
import type { TaskCheckpointState } from '../lib/checkpoint.types';
import type { BuiltRules } from '@/lib/rules/types';
import type { TaskStatusUnion, BatchStatusUnion, TaskStatusType, BatchStatusType } from '../lib/types';
import {
  createQueuedStatus,
  createCompletedStatus,
} from '../lib/types';

// ============================================================================
// Types (preserved for external consumers)
// ============================================================================

/** @deprecated Batch mode removed. Type kept for backwards compatibility. */
export type BatchId = string;
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
  batches: Record<string, BatchState>;
  reservedBatchIds: Set<string>;
  tasks: Record<string, TaskState>;
  executingTasks: Set<string>;
  isPaused: boolean;
  requirementsCache: ProjectRequirement[];
  taskProgress: Record<string, number>;
  taskActivity: Record<string, TaskActivity>;
  taskCheckpoints: Record<string, TaskCheckpointState>;
  gitConfig: GitConfig | null;
  orphanedRequirements: Array<{
    projectPath: string;
    requirementName: string;
    failedAt: number;
    error: string;
  }>;

  // Batch actions (no-ops)
  createBatch: (batchId: BatchId, name: string, taskIds: string[]) => void;
  createSessionBatch: (batchId: BatchId, projectId: string, projectPath: string, name: string, taskId: string, requirementName: string) => string;
  startBatch: (batchId: BatchId) => void;
  pauseBatch: (batchId: BatchId) => void;
  resumeBatch: (batchId: BatchId) => void;
  completeBatch: (batchId: BatchId) => void;
  deleteBatch: (batchId: BatchId) => void;
  renameBatch: (batchId: BatchId, newName: string) => void;
  updateBatchClaudeSessionId: (batchId: BatchId, claudeSessionId: string) => void;
  compactBatch: (batchId: BatchId) => void;

  // Task actions (no-ops)
  addTaskToBatch: (batchId: BatchId, taskId: string) => void;
  addTaskToBatchWithName: (batchId: BatchId, taskId: string, requirementName: string) => void;
  removeTaskFromBatch: (batchId: BatchId, taskId: string) => void;
  moveTask: (taskId: string, fromBatchId: BatchId, toBatchId: BatchId) => void;
  offloadTasks: (fromBatchId: BatchId, toBatchId: BatchId, taskIds: string[]) => void;
  updateTaskSessionStatus: (batchId: BatchId, taskId: string, status: 'pending' | 'running' | 'completed' | 'failed', extras?: { claudeSessionId?: string; errorMessage?: string }) => void;

  // Execution actions
  executeNextTask: (batchId: BatchId, requirements: ProjectRequirement[]) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatusUnion) => void;
  updateTaskProgress: (taskId: string, progressLines: number) => void;
  updateTaskActivity: (taskId: string, activity: TaskActivity) => void;

  // Checkpoint actions (no-ops)
  initializeCheckpoints: (taskId: string, builtRules: BuiltRules) => void;
  updateCheckpoints: (taskId: string, activity: TaskActivity, events: any[]) => void;
  finalizeTaskCheckpoints: (taskId: string) => void;
  clearTaskCheckpoints: (taskId: string) => void;

  // Global actions
  setGitConfig: (config: GitConfig | null) => void;
  setPaused: (paused: boolean) => void;
  setRequirementsCache: (requirements: ProjectRequirement[]) => void;

  // Orphaned requirements
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
  recoverFromStorage: (requirements: ProjectRequirement[]) => void;
  clearAll: () => void;
}

// ============================================================================
// No-op store (batch mode removed)
// ============================================================================

const noop = () => {};
const noopAsync = async () => {};

export const useTaskRunnerStore = create<TaskRunnerState>()(
  (set, get) => ({
    // State
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

    // Batch actions (no-ops)
    createBatch: noop,
    createSessionBatch: (_batchId, _projectId, _projectPath, _name, taskId) => taskId,
    startBatch: noop,
    pauseBatch: noop,
    resumeBatch: noop,
    completeBatch: noop,
    deleteBatch: noop,
    renameBatch: noop,
    updateBatchClaudeSessionId: noop,
    compactBatch: noop,

    // Task actions (no-ops)
    addTaskToBatch: noop,
    addTaskToBatchWithName: noop,
    removeTaskFromBatch: noop,
    moveTask: noop,
    offloadTasks: noop,
    updateTaskSessionStatus: noop,

    // Execution actions - updateTaskStatus is still used by CLI
    executeNextTask: noopAsync,
    updateTaskStatus: (taskId, status) => {
      set((state) => ({
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...(state.tasks[taskId] || { id: taskId, batchId: '' }),
            status,
          },
        },
      }));
    },
    updateTaskProgress: (taskId, progressLines) => {
      set((state) => ({
        taskProgress: { ...state.taskProgress, [taskId]: progressLines },
      }));
    },
    updateTaskActivity: (taskId, activity) => {
      set((state) => ({
        taskActivity: { ...state.taskActivity, [taskId]: activity },
      }));
    },

    // Checkpoint actions (no-ops)
    initializeCheckpoints: noop,
    updateCheckpoints: noop,
    finalizeTaskCheckpoints: noop,
    clearTaskCheckpoints: noop,

    // Global
    setGitConfig: (config) => set({ gitConfig: config }),
    setPaused: (paused) => set({ isPaused: paused }),
    setRequirementsCache: (requirements) => set({ requirementsCache: [...requirements] }),

    // Orphaned requirements (still useful for CLI)
    addOrphanedRequirement: (projectPath, requirementName, error) => {
      set((state) => ({
        orphanedRequirements: [
          ...state.orphanedRequirements,
          { projectPath, requirementName, failedAt: Date.now(), error },
        ],
      }));
    },
    removeOrphanedRequirement: (requirementName) => {
      set((state) => ({
        orphanedRequirements: state.orphanedRequirements.filter(
          (r) => r.requirementName !== requirementName
        ),
      }));
    },
    retryDeleteOrphanedRequirement: async () => false,
    clearOrphanedRequirements: () => set({ orphanedRequirements: [] }),

    // Helpers (return empty defaults)
    getActiveBatches: () => [],
    getBatchProgress: () => ({ total: 0, completed: 0, failed: 0 }),
    getTasksForBatch: () => [],
    getNextTaskForBatch: () => null,
    canStartTask: () => false,
    getNextAvailableBatchId: () => 'batch1',
    getSessionBatches: () => [],
    isTaskInAnyBatch: () => null,
    reserveBatchSlot: () => 'batch1',
    releaseBatchReservation: noop,
    recoverFromStorage: noop,
    clearAll: () => {
      set({
        batches: {},
        tasks: {},
        executingTasks: new Set(),
        taskProgress: {},
        taskActivity: {},
      });
    },
  })
);

// Helper for CLI sync - checks if any batch is running (always false now)
export const useIsAnyBatchRunning = () => false;
