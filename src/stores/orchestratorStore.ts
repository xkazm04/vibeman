/**
 * Orchestrator Store
 *
 * Manages multi-project batch execution for context map generation
 * and architecture analysis. Supports both sequential processing
 * (advanceToNext) and DAG-based parallel execution (getReadyProjects).
 */

import { create } from 'zustand';
import { DAGScheduler, type DAGTask, type DAGTaskStatus } from '@/lib/dag/dagScheduler';

export interface OrchestratorProject {
  id: string;
  name: string;
  path: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** IDs of projects that must complete before this one starts */
  dependencies?: string[];
}

export type BatchType = 'context-map' | 'architecture';

interface OrchestratorState {
  // Batch execution tracking
  batchId: string | null;
  batchType: BatchType | null;
  projects: OrchestratorProject[];
  currentIndex: number;
  isRunning: boolean;
  maxParallel: number;

  // Actions
  startBatch: (
    type: BatchType,
    projects: Array<{ id: string; name: string; path: string; dependencies?: string[] }>,
    options?: { maxParallel?: number }
  ) => void;
  markProjectRunning: (projectId: string) => void;
  markProjectComplete: (projectId: string, success: boolean) => void;
  /** @deprecated Use getReadyProjects for DAG-aware scheduling */
  advanceToNext: () => OrchestratorProject | null;
  /** Get all projects whose dependencies are met and can start now */
  getReadyProjects: () => OrchestratorProject[];
  reset: () => void;
  getProgress: () => { completed: number; failed: number; total: number; running: number };
}

function projectStatusToDAG(status: OrchestratorProject['status']): DAGTaskStatus {
  return status;
}

function toDAGTasks(projects: OrchestratorProject[]): DAGTask[] {
  return projects.map(p => ({
    id: p.id,
    status: projectStatusToDAG(p.status),
    dependencies: p.dependencies || [],
  }));
}

export const useOrchestratorStore = create<OrchestratorState>((set, get) => ({
  batchId: null,
  batchType: null,
  projects: [],
  currentIndex: 0,
  isRunning: false,
  maxParallel: 3,

  startBatch: (type, projects, options) => {
    const batchId = `batch-${type}-${Date.now()}`;
    set({
      batchId,
      batchType: type,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        status: 'pending' as const,
        dependencies: p.dependencies,
      })),
      currentIndex: 0,
      isRunning: true,
      maxParallel: options?.maxParallel ?? 3,
    });
  },

  markProjectRunning: (projectId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, status: 'running' as const } : p
      ),
    }));
  },

  markProjectComplete: (projectId, success) => {
    set((state) => {
      const updated = state.projects.map((p) =>
        p.id === projectId
          ? { ...p, status: success ? ('completed' as const) : ('failed' as const) }
          : p
      );

      // Check if all tasks are finished
      const allFinished = updated.every(
        p => p.status === 'completed' || p.status === 'failed'
      );

      return {
        projects: updated,
        isRunning: allFinished ? false : state.isRunning,
      };
    });
  },

  advanceToNext: () => {
    const { projects, currentIndex } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= projects.length) {
      // All projects processed
      set({ isRunning: false });
      return null;
    }

    set({ currentIndex: nextIndex });
    return projects[nextIndex];
  },

  getReadyProjects: () => {
    const { projects, maxParallel } = get();
    const scheduler = new DAGScheduler({ maxParallel });
    const dagTasks = toDAGTasks(projects);
    const readyIds = scheduler.getNextBatch(dagTasks);
    return projects.filter(p => readyIds.includes(p.id));
  },

  reset: () => {
    set({
      batchId: null,
      batchType: null,
      projects: [],
      currentIndex: 0,
      isRunning: false,
      maxParallel: 3,
    });
  },

  getProgress: () => {
    const { projects } = get();
    return {
      completed: projects.filter((p) => p.status === 'completed').length,
      failed: projects.filter((p) => p.status === 'failed').length,
      running: projects.filter((p) => p.status === 'running').length,
      total: projects.length,
    };
  },
}));
