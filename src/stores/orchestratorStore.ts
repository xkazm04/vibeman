/**
 * Orchestrator Store
 *
 * Manages multi-project batch execution for context map generation
 * and architecture analysis. Tracks progress through sequential
 * project processing.
 */

import { create } from 'zustand';

export interface OrchestratorProject {
  id: string;
  name: string;
  path: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export type BatchType = 'context-map' | 'architecture';

interface OrchestratorState {
  // Batch execution tracking
  batchId: string | null;
  batchType: BatchType | null;
  projects: OrchestratorProject[];
  currentIndex: number;
  isRunning: boolean;

  // Actions
  startBatch: (
    type: BatchType,
    projects: Array<{ id: string; name: string; path: string }>
  ) => void;
  markProjectRunning: (projectId: string) => void;
  markProjectComplete: (projectId: string, success: boolean) => void;
  advanceToNext: () => OrchestratorProject | null;
  reset: () => void;
  getProgress: () => { completed: number; failed: number; total: number };
}

export const useOrchestratorStore = create<OrchestratorState>((set, get) => ({
  batchId: null,
  batchType: null,
  projects: [],
  currentIndex: 0,
  isRunning: false,

  startBatch: (type, projects) => {
    const batchId = `batch-${type}-${Date.now()}`;
    set({
      batchId,
      batchType: type,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        status: 'pending' as const,
      })),
      currentIndex: 0,
      isRunning: true,
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
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, status: success ? ('completed' as const) : ('failed' as const) }
          : p
      ),
    }));
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

  reset: () => {
    set({
      batchId: null,
      batchType: null,
      projects: [],
      currentIndex: 0,
      isRunning: false,
    });
  },

  getProgress: () => {
    const { projects } = get();
    return {
      completed: projects.filter((p) => p.status === 'completed').length,
      failed: projects.filter((p) => p.status === 'failed').length,
      total: projects.length,
    };
  },
}));
