/**
 * DSL Slice - Manages DSL mode state and spec operations
 */

import type { StateCreator } from 'zustand';
import type { DSLSlice, RefactorState, DSLExecutionStatus } from './types';
import type { RefactorSpec, ExecutionResult } from '@/app/features/RefactorWizard/lib/dslTypes';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

export const createDSLSlice: StateCreator<
  RefactorState,
  [],
  [],
  DSLSlice
> = (set, get) => ({
  // Initial state
  isDSLMode: false,
  currentSpec: null,
  dslExecutionStatus: 'idle',
  dslExecutionResult: null,
  recentSpecs: [],
  savedSpecs: [],

  // Actions
  setDSLMode: (enabled: boolean) => {
    set({ isDSLMode: enabled });
  },

  setCurrentSpec: (spec: RefactorSpec | null) => {
    set({ currentSpec: spec });
  },

  updateCurrentSpec: (updates: Partial<RefactorSpec>) => {
    const current = get().currentSpec;
    if (current) {
      set({ currentSpec: { ...current, ...updates } });
    }
  },

  setDSLExecutionStatus: (status: DSLExecutionStatus) => {
    set({ dslExecutionStatus: status });
  },

  setDSLExecutionResult: (result: ExecutionResult | null) => {
    set({ dslExecutionResult: result });
  },

  saveCurrentSpec: () => {
    const { currentSpec, savedSpecs } = get();
    if (!currentSpec) return;

    // Check if spec with same name exists
    const existingIndex = savedSpecs.findIndex(s => s.name === currentSpec.name);
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...savedSpecs];
      updated[existingIndex] = currentSpec;
      set({ savedSpecs: updated });
    } else {
      // Add new
      set({ savedSpecs: [...savedSpecs, currentSpec] });
    }
  },

  loadSpec: (spec: RefactorSpec) => {
    set({ currentSpec: spec, isDSLMode: true });
    // Add to recent
    get().addToRecentSpecs(spec);
  },

  deleteSavedSpec: (name: string) => {
    const { savedSpecs } = get();
    set({ savedSpecs: savedSpecs.filter(s => s.name !== name) });
  },

  addToRecentSpecs: (spec: RefactorSpec) => {
    const { recentSpecs } = get();
    const entry = {
      name: spec.name,
      spec,
      timestamp: new Date().toISOString(),
    };

    // Remove existing entry with same name
    const filtered = recentSpecs.filter(r => r.name !== spec.name);

    // Add to front, keep only last 10
    set({ recentSpecs: [entry, ...filtered].slice(0, 10) });
  },

  executeDSLSpec: async (spec: RefactorSpec) => {
    const activeProject = useActiveProjectStore.getState().activeProject;

    if (!activeProject?.path) {
      set({ dslExecutionStatus: 'failed' });
      return;
    }

    set({ dslExecutionStatus: 'executing' });

    try {
      const response = await fetch('/api/refactor/execute-dsl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec,
          projectPath: activeProject.path,
          projectId: activeProject.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute DSL spec');
      }

      const data = await response.json();

      set({
        dslExecutionStatus: 'completed',
        dslExecutionResult: data.result,
      });

      // Add to recent
      get().addToRecentSpecs(spec);

    } catch (error) {
      console.error('[RefactorStore] DSL execution failed:', error);
      set({ dslExecutionStatus: 'failed' });
    }
  },
});
