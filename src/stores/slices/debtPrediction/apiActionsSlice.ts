/**
 * API Actions Slice - Async operations for debt predictions
 */

import type { StateCreator } from 'zustand';
import type { ApiActionsSlice, DebtPredictionState } from './types';
import { initialState } from './types';

export const createApiActionsSlice: StateCreator<
  DebtPredictionState,
  [],
  [],
  ApiActionsSlice
> = (set, get) => ({
  fetchPredictions: async (projectId: string) => {
    try {
      const response = await fetch(
        `/api/debt-predictions?projectId=${projectId}&status=active`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }

      const data = await response.json();
      set({
        predictions: data.predictions || [],
        opportunityCards: (data.opportunityCards || []).map((c: any) => ({
          ...c,
          affected_files: typeof c.affected_files === 'string'
            ? JSON.parse(c.affected_files)
            : c.affected_files || [],
          clicked: !!c.clicked,
          acted_upon: !!c.acted_upon,
        })),
      });
    } catch (error) {
      console.error('[DebtPredictionStore] fetchPredictions error:', error);
    }
  },

  fetchStats: async (projectId: string) => {
    try {
      const response = await fetch(
        `/api/debt-predictions/stats?projectId=${projectId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const stats = await response.json();
      set({ stats });
    } catch (error) {
      console.error('[DebtPredictionStore] fetchStats error:', error);
    }
  },

  scanProject: async (projectId: string, projectPath: string) => {
    set({
      scanStatus: 'scanning',
      scanProgress: 0,
      scanError: null,
    });

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        set((state) => ({
          scanProgress: Math.min(state.scanProgress + 10, 90),
        }));
      }, 500);

      const response = await fetch('/api/debt-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectPath }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Failed to scan project');
      }

      const data = await response.json();

      set({
        predictions: data.predictions || [],
        opportunityCards: (data.opportunityCards || []).map((c: any) => ({
          id: `temp-${Date.now()}-${Math.random()}`,
          project_id: projectId,
          prediction_id: '',
          card_type: c.cardType,
          priority: c.priority,
          title: c.title,
          summary: c.summary,
          action_type: c.actionType,
          action_description: c.actionDescription,
          estimated_time_minutes: c.estimatedTimeMinutes,
          affected_files: [],
          clicked: false,
          acted_upon: false,
        })),
        scanStatus: 'completed',
        scanProgress: 100,
      });

      // Fetch updated stats
      get().fetchStats(projectId);
    } catch (error) {
      set({
        scanStatus: 'error',
        scanError: error instanceof Error ? error.message : 'Unknown error',
        scanProgress: 0,
      });
    }
  },

  dismissPrediction: async (id: string, reason: string) => {
    try {
      const response = await fetch(`/api/debt-predictions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss prediction');
      }

      get().removePrediction(id);
    } catch (error) {
      console.error('[DebtPredictionStore] dismissPrediction error:', error);
    }
  },

  addressPrediction: async (id: string) => {
    try {
      const response = await fetch(`/api/debt-predictions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'address' }),
      });

      if (!response.ok) {
        throw new Error('Failed to address prediction');
      }

      get().removePrediction(id);
    } catch (error) {
      console.error('[DebtPredictionStore] addressPrediction error:', error);
    }
  },

  escalatePrediction: async (id: string) => {
    try {
      const response = await fetch(`/api/debt-predictions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'escalate' }),
      });

      if (!response.ok) {
        throw new Error('Failed to escalate prediction');
      }

      get().updatePrediction(id, { status: 'escalated' });
    } catch (error) {
      console.error('[DebtPredictionStore] escalatePrediction error:', error);
    }
  },

  reset: () => set(initialState),
});
