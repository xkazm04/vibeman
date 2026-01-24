/**
 * Goal Hub Store
 * Zustand store for managing goal-driven development state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ExtendedGoal } from '@/app/db/models/goal-hub.types';

// ============================================================================
// TYPES
// ============================================================================

interface GoalHubState {
  // Active goal
  activeGoal: ExtendedGoal | null;

  // All goals for the project
  goals: ExtendedGoal[];

  // Loading states
  isLoading: boolean;

  // Error state
  error: string | null;

  // Current project
  projectId: string | null;
}

interface GoalHubActions {
  // Project & goals
  setProjectId: (projectId: string) => void;
  loadGoals: (projectId: string) => Promise<void>;
  setActiveGoal: (goal: ExtendedGoal | null) => void;
  createGoal: (title: string, description?: string, targetDate?: Date) => Promise<ExtendedGoal | null>;
  updateGoal: (goalId: string, updates: Partial<ExtendedGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  completeGoal: (goalId: string) => Promise<void>;

  // Utilities
  clearError: () => void;
  reset: () => void;
}

type GoalHubStore = GoalHubState & GoalHubActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: GoalHubState = {
  activeGoal: null,
  goals: [],
  isLoading: false,
  error: null,
  projectId: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useGoalHubStore = create<GoalHubStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================
      // PROJECT & GOALS
      // ========================================

      setProjectId: (projectId) => {
        set({ projectId });
      },

      loadGoals: async (projectId) => {
        const state = get();

        // Skip if already loading or same project already loaded
        if (state.isLoading) return;
        if (state.projectId === projectId && state.goals.length > 0) return;

        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/goals?projectId=${projectId}`);
          if (!response.ok) throw new Error('Failed to load goals');

          const data = await response.json();
          set({
            goals: data.goals || [],
            projectId,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load goals',
            isLoading: false,
          });
        }
      },

      setActiveGoal: (goal) => {
        const currentGoalId = get().activeGoal?.id;

        // Skip if same goal is already selected
        if (goal?.id === currentGoalId) return;

        set({ activeGoal: goal });
      },

      createGoal: async (title, description, targetDate) => {
        const { projectId } = get();
        if (!projectId) return null;

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              title,
              description,
              status: 'open',
            }),
          });

          if (!response.ok) throw new Error('Failed to create goal');

          const data = await response.json();
          const newGoal = data.goal;

          // Set target date if provided
          if (targetDate && newGoal.id) {
            await fetch('/api/goals', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: newGoal.id,
                target_date: targetDate.toISOString(),
              }),
            });
          }

          set((state) => ({
            goals: [...state.goals, newGoal],
            isLoading: false,
          }));

          return newGoal;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create goal',
            isLoading: false,
          });
          return null;
        }
      },

      updateGoal: async (goalId, updates) => {
        try {
          const response = await fetch('/api/goals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: goalId, ...updates }),
          });

          if (!response.ok) throw new Error('Failed to update goal');

          const data = await response.json();

          set((state) => ({
            goals: state.goals.map((g) => (g.id === goalId ? { ...g, ...data.goal } : g)),
            activeGoal: state.activeGoal?.id === goalId
              ? { ...state.activeGoal, ...data.goal }
              : state.activeGoal,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update goal' });
        }
      },

      deleteGoal: async (goalId) => {
        try {
          const response = await fetch(`/api/goals?id=${goalId}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('Failed to delete goal');

          set((state) => ({
            goals: state.goals.filter((g) => g.id !== goalId),
            activeGoal: state.activeGoal?.id === goalId ? null : state.activeGoal,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete goal' });
        }
      },

      completeGoal: async (goalId) => {
        try {
          const response = await fetch('/api/goals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: goalId, status: 'done' }),
          });

          if (!response.ok) throw new Error('Failed to complete goal');

          set((state) => ({
            goals: state.goals.map((g) =>
              g.id === goalId ? { ...g, status: 'done' as const, progress: 100 } : g
            ),
            activeGoal: state.activeGoal?.id === goalId
              ? { ...state.activeGoal, status: 'done' as const, progress: 100 }
              : state.activeGoal,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to complete goal' });
        }
      },

      // ========================================
      // UTILITIES
      // ========================================

      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    { name: 'goal-hub-store' }
  )
);

export default useGoalHubStore;
