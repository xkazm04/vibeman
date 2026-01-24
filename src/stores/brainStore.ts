/**
 * Brain Store
 * Zustand store for Brain 2.0 behavioral learning UI state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  BehavioralContext,
  DbDirectionOutcome,
  DbBrainReflection,
  ReflectionStatus,
} from '@/app/db/models/brain.types';

// ============================================================================
// TYPES
// ============================================================================

interface OutcomeStats {
  total: number;
  successful: number;
  failed: number;
  reverted: number;
  pending: number;
}

interface BrainState {
  // Behavioral context
  behavioralContext: BehavioralContext | null;
  isLoadingContext: boolean;

  // Outcomes
  recentOutcomes: DbDirectionOutcome[];
  outcomeStats: OutcomeStats;
  isLoadingOutcomes: boolean;

  // Reflection
  reflectionStatus: ReflectionStatus | 'idle';
  lastReflection: DbBrainReflection | null;
  decisionsSinceReflection: number;
  nextThreshold: number;
  shouldTrigger: boolean;
  triggerReason: string | null;

  // Running reflection CLI state
  runningReflectionId: string | null;
  requirementName: string | null;

  // Global reflection
  globalReflectionStatus: ReflectionStatus | 'idle';
  lastGlobalReflection: DbBrainReflection | null;
  globalRunningReflectionId: string | null;
  globalRequirementName: string | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Current project
  projectId: string | null;
}

interface BrainActions {
  // Data loading
  setProjectId: (projectId: string) => void;
  loadBrainData: (projectId: string, projectName: string, projectPath: string) => Promise<void>;
  fetchBehavioralContext: (projectId: string) => Promise<void>;
  fetchRecentOutcomes: (projectId: string) => Promise<void>;
  fetchReflectionStatus: (projectId: string) => Promise<void>;

  // Actions
  triggerReflection: (projectId: string, projectName: string, projectPath: string) => Promise<void>;
  cancelReflection: (projectId: string) => Promise<void>;

  // Global reflection
  fetchGlobalReflectionStatus: () => Promise<void>;
  triggerGlobalReflection: (
    projects: Array<{ id: string; name: string; path: string }>,
    workspacePath: string
  ) => Promise<void>;

  // Utilities
  clearError: () => void;
  reset: () => void;
}

type BrainStore = BrainState & BrainActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: BrainState = {
  behavioralContext: null,
  isLoadingContext: false,
  recentOutcomes: [],
  outcomeStats: {
    total: 0,
    successful: 0,
    failed: 0,
    reverted: 0,
    pending: 0,
  },
  isLoadingOutcomes: false,
  reflectionStatus: 'idle',
  lastReflection: null,
  decisionsSinceReflection: 0,
  nextThreshold: 20,
  shouldTrigger: false,
  triggerReason: null,
  runningReflectionId: null,
  requirementName: null,
  globalReflectionStatus: 'idle',
  lastGlobalReflection: null,
  globalRunningReflectionId: null,
  globalRequirementName: null,
  isLoading: false,
  error: null,
  projectId: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useBrainStore = create<BrainStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================
      // DATA LOADING
      // ========================================

      setProjectId: (projectId) => {
        set({ projectId });
      },

      loadBrainData: async (projectId, projectName, projectPath) => {
        const state = get();

        // Skip if already loading
        if (state.isLoading) return;

        set({ isLoading: true, error: null, projectId });

        try {
          // Load all data in parallel
          await Promise.all([
            get().fetchBehavioralContext(projectId),
            get().fetchRecentOutcomes(projectId),
            get().fetchReflectionStatus(projectId),
          ]);

          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load brain data',
            isLoading: false,
          });
        }
      },

      fetchBehavioralContext: async (projectId) => {
        set({ isLoadingContext: true });
        try {
          const response = await fetch(`/api/brain/context?projectId=${projectId}`);
          if (!response.ok) {
            // Context might not exist yet, that's ok
            if (response.status === 404) {
              set({ behavioralContext: null, isLoadingContext: false });
              return;
            }
            throw new Error('Failed to fetch behavioral context');
          }

          const data = await response.json();
          set({
            behavioralContext: data.context || null,
            isLoadingContext: false,
          });
        } catch (error) {
          console.error('Failed to fetch behavioral context:', error);
          set({ behavioralContext: null, isLoadingContext: false });
        }
      },

      fetchRecentOutcomes: async (projectId) => {
        set({ isLoadingOutcomes: true });
        try {
          const response = await fetch(`/api/brain/outcomes?projectId=${projectId}&limit=10`);
          if (!response.ok) {
            if (response.status === 404) {
              set({ recentOutcomes: [], isLoadingOutcomes: false });
              return;
            }
            throw new Error('Failed to fetch outcomes');
          }

          const data = await response.json();
          set({
            recentOutcomes: data.outcomes || [],
            outcomeStats: data.stats || initialState.outcomeStats,
            isLoadingOutcomes: false,
          });
        } catch (error) {
          console.error('Failed to fetch outcomes:', error);
          set({ recentOutcomes: [], isLoadingOutcomes: false });
        }
      },

      fetchReflectionStatus: async (projectId) => {
        try {
          const response = await fetch(`/api/brain/reflection?projectId=${projectId}`);
          if (!response.ok) {
            if (response.status === 404) {
              set({
                reflectionStatus: 'idle',
                lastReflection: null,
                decisionsSinceReflection: 0,
                shouldTrigger: false,
                triggerReason: null,
                runningReflectionId: null,
                requirementName: null,
              });
              return;
            }
            throw new Error('Failed to fetch reflection status');
          }

          const data = await response.json();
          const status = data.isRunning ? 'running' : (data.lastCompleted ? 'completed' : 'idle');
          set({
            reflectionStatus: status,
            lastReflection: data.lastCompleted || null,
            decisionsSinceReflection: data.decisionsSinceLastReflection || 0,
            nextThreshold: data.nextThreshold || 20,
            shouldTrigger: data.shouldTrigger || false,
            triggerReason: data.triggerReason || null,
            runningReflectionId: data.runningReflection?.id || null,
            requirementName: data.requirementName || null,
          });
        } catch (error) {
          console.error('Failed to fetch reflection status:', error);
          set({ reflectionStatus: 'idle', lastReflection: null, runningReflectionId: null, requirementName: null });
        }
      },

      // ========================================
      // ACTIONS
      // ========================================

      triggerReflection: async (projectId, projectName, projectPath) => {
        set({ reflectionStatus: 'running', error: null });
        try {
          const response = await fetch('/api/brain/reflection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              projectName,
              projectPath,
              triggerType: 'manual',
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Handle 409 (already running) - update state to reflect running, not failed
            if (response.status === 409 && errorData.reflectionId) {
              const reqName = `brain-reflection-${errorData.reflectionId}.md`;
              set({
                reflectionStatus: 'running',
                runningReflectionId: errorData.reflectionId,
                requirementName: reqName,
                error: null,
              });
              return;
            }

            throw new Error(errorData.error || 'Failed to trigger reflection');
          }

          const data = await response.json();
          const reqName = data.reflectionId ? `brain-reflection-${data.reflectionId}.md` : null;

          set({
            reflectionStatus: 'running',
            runningReflectionId: data.reflectionId || null,
            requirementName: reqName,
            decisionsSinceReflection: 0,
            shouldTrigger: false,
            triggerReason: null,
          });
        } catch (error) {
          set({
            reflectionStatus: 'failed',
            error: error instanceof Error ? error.message : 'Failed to trigger reflection',
            runningReflectionId: null,
            requirementName: null,
          });
        }
      },

      cancelReflection: async (projectId) => {
        try {
          const response = await fetch('/api/brain/reflection', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to cancel reflection');
          }

          set({
            reflectionStatus: 'idle',
            runningReflectionId: null,
            requirementName: null,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to cancel reflection',
          });
        }
      },

      // ========================================
      // GLOBAL REFLECTION
      // ========================================

      fetchGlobalReflectionStatus: async () => {
        try {
          const response = await fetch('/api/brain/reflection?scope=global');
          if (!response.ok) {
            set({
              globalReflectionStatus: 'idle',
              lastGlobalReflection: null,
              globalRunningReflectionId: null,
              globalRequirementName: null,
            });
            return;
          }

          const data = await response.json();
          const status = data.isRunning ? 'running' : (data.lastCompleted ? 'completed' : 'idle');
          set({
            globalReflectionStatus: status,
            lastGlobalReflection: data.lastCompleted || null,
            globalRunningReflectionId: data.runningReflection?.id || null,
            globalRequirementName: data.requirementName || null,
          });
        } catch (error) {
          console.error('Failed to fetch global reflection status:', error);
          set({ globalReflectionStatus: 'idle', lastGlobalReflection: null });
        }
      },

      triggerGlobalReflection: async (projects, workspacePath) => {
        set({ globalReflectionStatus: 'running', error: null });
        try {
          const response = await fetch('/api/brain/reflection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scope: 'global',
              projects,
              workspacePath,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            if (response.status === 409 && errorData.reflectionId) {
              const reqName = `brain-reflection-${errorData.reflectionId}.md`;
              set({
                globalReflectionStatus: 'running',
                globalRunningReflectionId: errorData.reflectionId,
                globalRequirementName: reqName,
                error: null,
              });
              return;
            }

            throw new Error(errorData.error || 'Failed to trigger global reflection');
          }

          const data = await response.json();
          const reqName = data.reflectionId ? `brain-reflection-${data.reflectionId}.md` : null;

          set({
            globalReflectionStatus: 'running',
            globalRunningReflectionId: data.reflectionId || null,
            globalRequirementName: reqName,
          });
        } catch (error) {
          set({
            globalReflectionStatus: 'failed',
            error: error instanceof Error ? error.message : 'Failed to trigger global reflection',
            globalRunningReflectionId: null,
            globalRequirementName: null,
          });
        }
      },

      // ========================================
      // UTILITIES
      // ========================================

      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    { name: 'brain-store' }
  )
);

export default useBrainStore;
