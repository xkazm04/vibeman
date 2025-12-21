/**
 * Goal Hub Store
 * Zustand store for managing goal-driven development state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ExtendedGoal,
  GoalHypothesis,
  HypothesisStatus,
  HypothesisCategory,
  EvidenceType,
} from '@/app/db/models/goal-hub.types';

// ============================================================================
// TYPES
// ============================================================================

interface GoalWithHypotheses extends ExtendedGoal {
  hypotheses?: GoalHypothesis[];
}

interface HypothesisCounts {
  total: number;
  verified: number;
  inProgress: number;
}

interface GoalHubState {
  // Active goal
  activeGoal: GoalWithHypotheses | null;

  // All goals for the project
  goals: ExtendedGoal[];

  // Hypotheses for active goal
  hypotheses: GoalHypothesis[];
  hypothesisCounts: HypothesisCounts;

  // Loading states
  isLoading: boolean;
  isLoadingHypotheses: boolean;
  isSavingHypothesis: boolean;

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

  // Hypotheses
  loadHypotheses: (goalId: string) => Promise<void>;
  createHypothesis: (hypothesis: {
    title: string;
    statement: string;
    reasoning?: string;
    category?: HypothesisCategory;
    priority?: number;
  }) => Promise<GoalHypothesis | null>;
  updateHypothesis: (id: string, updates: Partial<GoalHypothesis>) => Promise<void>;
  verifyHypothesis: (id: string, evidence: string, evidenceType: EvidenceType) => Promise<void>;
  deleteHypothesis: (id: string) => Promise<void>;

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
  hypotheses: [],
  hypothesisCounts: { total: 0, verified: 0, inProgress: 0 },
  isLoading: false,
  isLoadingHypotheses: false,
  isSavingHypothesis: false,
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

        if (goal) {
          // Load hypotheses for the active goal
          get().loadHypotheses(goal.id);
        } else {
          set({
            hypotheses: [],
            hypothesisCounts: { total: 0, verified: 0, inProgress: 0 },
          });
        }
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
      // HYPOTHESES
      // ========================================

      loadHypotheses: async (goalId) => {
        const state = get();

        // Skip if already loading
        if (state.isLoadingHypotheses) return;

        set({ isLoadingHypotheses: true });
        try {
          const response = await fetch(`/api/goal-hub/hypotheses?goalId=${goalId}`);
          if (!response.ok) throw new Error('Failed to load hypotheses');

          const data = await response.json();
          set({
            hypotheses: data.hypotheses || [],
            hypothesisCounts: data.counts || { total: 0, verified: 0, inProgress: 0 },
            isLoadingHypotheses: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load hypotheses',
            isLoadingHypotheses: false,
          });
        }
      },

      createHypothesis: async (hypothesis) => {
        const { activeGoal, projectId } = get();
        if (!activeGoal || !projectId) return null;

        set({ isSavingHypothesis: true });
        try {
          const response = await fetch('/api/goal-hub/hypotheses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goalId: activeGoal.id,
              projectId,
              ...hypothesis,
            }),
          });

          if (!response.ok) throw new Error('Failed to create hypothesis');

          const data = await response.json();

          set((state) => ({
            hypotheses: [...state.hypotheses, data.hypothesis],
            hypothesisCounts: {
              ...state.hypothesisCounts,
              total: state.hypothesisCounts.total + 1,
            },
            isSavingHypothesis: false,
          }));

          return data.hypothesis;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create hypothesis',
            isSavingHypothesis: false,
          });
          return null;
        }
      },

      updateHypothesis: async (id, updates) => {
        try {
          const response = await fetch('/api/goal-hub/hypotheses', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });

          if (!response.ok) throw new Error('Failed to update hypothesis');

          const data = await response.json();

          set((state) => ({
            hypotheses: state.hypotheses.map((h) =>
              h.id === id ? data.hypothesis : h
            ),
          }));

          // Reload counts if status changed
          if (updates.status) {
            const { activeGoal } = get();
            if (activeGoal) {
              get().loadHypotheses(activeGoal.id);
            }
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update hypothesis' });
        }
      },

      verifyHypothesis: async (id, evidence, evidenceType) => {
        try {
          const response = await fetch('/api/goal-hub/hypotheses/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hypothesisId: id, evidence, evidenceType }),
          });

          if (!response.ok) throw new Error('Failed to verify hypothesis');

          const data = await response.json();

          set((state) => ({
            hypotheses: state.hypotheses.map((h) =>
              h.id === id ? data.hypothesis : h
            ),
            hypothesisCounts: {
              total: data.goalProgress.total,
              verified: data.goalProgress.verified,
              inProgress: state.hypothesisCounts.inProgress,
            },
            activeGoal: state.activeGoal
              ? { ...state.activeGoal, progress: data.goalProgress.progress }
              : null,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to verify hypothesis' });
        }
      },

      deleteHypothesis: async (id) => {
        try {
          const response = await fetch(`/api/goal-hub/hypotheses?id=${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('Failed to delete hypothesis');

          set((state) => ({
            hypotheses: state.hypotheses.filter((h) => h.id !== id),
            hypothesisCounts: {
              ...state.hypothesisCounts,
              total: Math.max(0, state.hypothesisCounts.total - 1),
            },
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete hypothesis' });
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
