/**
 * Decision Slice - Manages decision requests and resolution
 */

import type { StateCreator } from 'zustand';
import type { DecisionSlice, BlueprintExecutionState, DecisionRequest, BlueprintExecution } from './types';

export const createDecisionSlice: StateCreator<
  BlueprintExecutionState,
  [],
  [],
  DecisionSlice
> = (set, get) => ({
  requestDecision: async (request) => {
    return new Promise((resolve) => {
      const decisionId = `decision-${Date.now()}`;

      const decisionRequest: DecisionRequest = {
        ...request,
        id: decisionId,
        createdAt: Date.now(),
      };

      set(state => {
        if (!state.currentExecution) {
          resolve(false);
          return state;
        }

        return {
          currentExecution: {
            ...state.currentExecution,
            status: 'paused-for-decision',
            pendingDecision: decisionRequest,
          },
        };
      });

      // Store the resolver so resume/abort can resolve the promise
      (window as any).__blueprintDecisionResolver = resolve;
    });
  },

  resumeExecution: () => {
    set(state => {
      if (!state.currentExecution) return state;

      return {
        currentExecution: {
          ...state.currentExecution,
          status: 'running',
          pendingDecision: null,
        },
      };
    });

    // Resolve the pending decision promise
    const resolver = (window as any).__blueprintDecisionResolver;
    if (resolver) {
      resolver(true);
      delete (window as any).__blueprintDecisionResolver;
    }
  },

  abortExecution: (reason) => {
    set(state => {
      if (!state.currentExecution) return state;

      const execution: BlueprintExecution = {
        ...state.currentExecution,
        status: 'aborted',
        pendingDecision: null,
        completedAt: Date.now(),
        error: reason || 'Aborted by user',
      };

      return {
        currentExecution: null,
        executionHistory: [execution, ...state.executionHistory].slice(0, 10),
      };
    });

    // Resolve the pending decision promise with false
    const resolver = (window as any).__blueprintDecisionResolver;
    if (resolver) {
      resolver(false);
      delete (window as any).__blueprintDecisionResolver;
    }
  },

  isDecisionPending: () => {
    const { currentExecution } = get();
    return currentExecution?.status === 'paused-for-decision';
  },
});
