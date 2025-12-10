/**
 * Execution Slice - Manages current execution state and stages
 */

import type { StateCreator } from 'zustand';
import type { ExecutionSlice, BlueprintExecutionState, BlueprintExecution, ExecutionStage } from './types';
import { generateExecutionId } from '@/lib/idGenerator';

export const createExecutionSlice: StateCreator<
  BlueprintExecutionState,
  [],
  [],
  ExecutionSlice
> = (set, get) => ({
  currentExecution: null,

  startExecution: ({ blueprintId, blueprintName, projectId, projectPath, stages }) => {
    const executionId = generateExecutionId();

    const execution: BlueprintExecution = {
      id: executionId,
      blueprintId,
      blueprintName,
      projectId,
      projectPath,
      status: 'running',
      stages: stages.map(s => ({
        ...s,
        status: 'pending' as const,
      })),
      currentStageIndex: 0,
      pendingDecision: null,
      startedAt: Date.now(),
    };

    set({ currentExecution: execution });

    return executionId;
  },

  updateStageStatus: (stageId, status, output, error) => {
    set(state => {
      if (!state.currentExecution) return state;

      const stages = state.currentExecution.stages.map(stage => {
        if (stage.id !== stageId) return stage;

        return {
          ...stage,
          status,
          output,
          error,
          startedAt: status === 'running' ? Date.now() : stage.startedAt,
          completedAt: ['completed', 'failed', 'skipped'].includes(status)
            ? Date.now()
            : stage.completedAt,
        };
      });

      // Update current stage index
      const currentIndex = stages.findIndex(s => s.status === 'running');
      const newIndex = currentIndex >= 0 ? currentIndex : state.currentExecution.currentStageIndex;

      return {
        currentExecution: {
          ...state.currentExecution,
          stages,
          currentStageIndex: newIndex,
        },
      };
    });
  },

  completeExecution: (result) => {
    set(state => {
      if (!state.currentExecution) return state;

      const execution: BlueprintExecution = {
        ...state.currentExecution,
        status: 'completed',
        completedAt: Date.now(),
        result,
      };

      return {
        currentExecution: null,
        executionHistory: [execution, ...state.executionHistory].slice(0, 10),
      };
    });
  },

  failExecution: (error) => {
    set(state => {
      if (!state.currentExecution) return state;

      const execution: BlueprintExecution = {
        ...state.currentExecution,
        status: 'failed',
        completedAt: Date.now(),
        error,
      };

      return {
        currentExecution: null,
        executionHistory: [execution, ...state.executionHistory].slice(0, 10),
      };
    });
  },

  clearExecution: () => {
    set({ currentExecution: null });
  },

  getCurrentStage: () => {
    const { currentExecution } = get();
    if (!currentExecution) return null;
    return currentExecution.stages[currentExecution.currentStageIndex] || null;
  },

  getProgress: () => {
    const { currentExecution } = get();
    if (!currentExecution) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = currentExecution.stages.filter(
      s => s.status === 'completed' || s.status === 'skipped'
    ).length;
    const total = currentExecution.stages.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  },
});
