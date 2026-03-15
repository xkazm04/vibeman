/**
 * Task Runner Store
 *
 * Minimal store preserving task status tracking and type exports
 * needed by the CLI session system.
 *
 * Progress tracking is handled by the unified ProgressTracker
 * (see lib/progressTracker.ts) which processes CLI stdout into
 * activity, checkpoints, and percentage as derived views.
 */

import { create } from 'zustand';
import type { ProjectRequirement } from '../lib/types';
import type { TaskStatusUnion, TaskStatusType } from '../lib/types';
import type { ExternalProcessingState } from '@/lib/supabase/external-types';
import { taskEventBus } from '@/lib/taskEventBus';

// ============================================================================
// Types
// ============================================================================

export type TaskStatus = TaskStatusType;

export interface TaskState {
  id: string;
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
  tasks: Record<string, TaskState>;
  executingTasks: Set<string>;
  isPaused: boolean;
  requirementsCache: ProjectRequirement[];
  gitConfig: GitConfig | null;
  orphanedRequirements: Array<{
    projectPath: string;
    requirementName: string;
    failedAt: number;
    error: string;
  }>;

  // External requirements processing state
  externalProcessing: Record<string, ExternalProcessingState>;

  // Task actions (used by CLI)
  updateTaskStatus: (taskId: string, status: TaskStatusUnion) => void;

  // Global actions
  setGitConfig: (config: GitConfig | null) => void;
  setPaused: (paused: boolean) => void;
  setRequirementsCache: (requirements: ProjectRequirement[]) => void;

  // Orphaned requirements (used by CLI)
  addOrphanedRequirement: (projectPath: string, requirementName: string, error: string) => void;
  removeOrphanedRequirement: (requirementName: string) => void;
  clearOrphanedRequirements: () => void;

  // External processing
  setExternalProcessingStatus: (reqId: string, state: ExternalProcessingState) => void;
  clearExternalProcessing: (reqId: string) => void;

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
    tasks: {},
    executingTasks: new Set(),
    isPaused: false,
    requirementsCache: [],
    gitConfig: null,
    orphanedRequirements: [],
    externalProcessing: {},

    updateTaskStatus: (taskId, status) => {
      set((state) => ({
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...(state.tasks[taskId] || { id: taskId }),
            status,
          },
        },
      }));
      if (status.type === 'queued') taskEventBus.emit({ type: 'task-queued', taskId });
      else if (status.type === 'running') taskEventBus.emit({ type: 'task-started', taskId });
      else if (status.type === 'completed') taskEventBus.emit({ type: 'task-completed', taskId });
      else if (status.type === 'failed') taskEventBus.emit({ type: 'task-failed', taskId, error: status.error });
    },

    setGitConfig: (config) => set({ gitConfig: config }),
    setPaused: (paused) => set({ isPaused: paused }),
    setRequirementsCache: (requirements) => set({ requirementsCache: [...requirements] }),

    addOrphanedRequirement: (projectPath, requirementName, error) => {
      set((state) => {
        const now = Date.now();
        const fresh = state.orphanedRequirements.filter(
          (r) => now - r.failedAt < ORPHAN_TTL_MS
        );
        fresh.push({ projectPath, requirementName, failedAt: now, error });
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

    setExternalProcessingStatus: (reqId, state) => {
      set((prev) => ({
        externalProcessing: { ...prev.externalProcessing, [reqId]: state },
      }));
    },
    clearExternalProcessing: (reqId) => {
      set((prev) => {
        const next = { ...prev.externalProcessing };
        delete next[reqId];
        return { externalProcessing: next };
      });
    },

    clearAll: () => {
      set({
        tasks: {},
        executingTasks: new Set(),
        externalProcessing: {},
      });
    },
  })
);
