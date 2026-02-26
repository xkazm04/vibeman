/**
 * Task Runner Store
 *
 * Batch execution mode has been removed. This store retains only the
 * actions still used by the CLI session system and type exports needed
 * by external consumers.
 */

import { create } from 'zustand';
import type { ProjectRequirement } from '../lib/types';
import type { TaskActivity } from '../lib/activityClassifier.types';
import type { TaskStatusUnion, BatchStatusUnion, TaskStatusType, BatchStatusType } from '../lib/types';

// ============================================================================
// Types (preserved for external consumers)
// ============================================================================

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
  tasks: Record<string, TaskState>;
  executingTasks: Set<string>;
  isPaused: boolean;
  requirementsCache: ProjectRequirement[];
  taskProgress: Record<string, number>;
  taskActivity: Record<string, TaskActivity>;
  taskCheckpoints: Record<string, unknown>;
  gitConfig: GitConfig | null;
  orphanedRequirements: Array<{
    projectPath: string;
    requirementName: string;
    failedAt: number;
    error: string;
  }>;

  // Task actions (used by CLI)
  updateTaskStatus: (taskId: string, status: TaskStatusUnion) => void;
  updateTaskProgress: (taskId: string, progressLines: number) => void;
  updateTaskActivity: (taskId: string, activity: TaskActivity) => void;

  // Global actions
  setGitConfig: (config: GitConfig | null) => void;
  setPaused: (paused: boolean) => void;
  setRequirementsCache: (requirements: ProjectRequirement[]) => void;

  // Orphaned requirements (used by CLI)
  addOrphanedRequirement: (projectPath: string, requirementName: string, error: string) => void;
  removeOrphanedRequirement: (requirementName: string) => void;
  clearOrphanedRequirements: () => void;

  // Helpers
  clearAll: () => void;
}

const ORPHAN_MAX_ENTRIES = 50;
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Store
// ============================================================================

export const useTaskRunnerStore = create<TaskRunnerState>()(
  (set) => ({
    batches: {},
    tasks: {},
    executingTasks: new Set(),
    isPaused: false,
    requirementsCache: [],
    taskProgress: {},
    taskActivity: {},
    taskCheckpoints: {},
    gitConfig: null,
    orphanedRequirements: [],

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

    setGitConfig: (config) => set({ gitConfig: config }),
    setPaused: (paused) => set({ isPaused: paused }),
    setRequirementsCache: (requirements) => set({ requirementsCache: [...requirements] }),

    addOrphanedRequirement: (projectPath, requirementName, error) => {
      set((state) => {
        const now = Date.now();
        // Evict entries older than 24h, then append the new entry
        const fresh = state.orphanedRequirements.filter(
          (r) => now - r.failedAt < ORPHAN_TTL_MS
        );
        fresh.push({ projectPath, requirementName, failedAt: now, error });
        // Cap at max entries, keeping the most recent
        const capped = fresh.length > ORPHAN_MAX_ENTRIES
          ? fresh.slice(fresh.length - ORPHAN_MAX_ENTRIES)
          : fresh;
        return { orphanedRequirements: capped };
      });
    },
    removeOrphanedRequirement: (requirementName) => {
      set((state) => ({
        orphanedRequirements: state.orphanedRequirements.filter(
          (r) => r.requirementName !== requirementName
        ),
      }));
    },
    clearOrphanedRequirements: () => set({ orphanedRequirements: [] }),

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
