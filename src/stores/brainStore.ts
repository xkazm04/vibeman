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

export interface DecaySettings {
  decayFactor: number;      // 0.8 - 0.99
  retentionDays: number;    // 7 - 90
}

interface BrainState {
  // Decay settings
  decaySettings: DecaySettings;

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
  /** Direct prompt content for CLI execution (no file) */
  promptContent: string | null;

  // Global reflection
  globalReflectionStatus: ReflectionStatus | 'idle';
  lastGlobalReflection: DbBrainReflection | null;
  globalRunningReflectionId: string | null;
  /** Direct prompt content for global reflection CLI execution */
  globalPromptContent: string | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Current project
  projectId: string | null;
}

interface BrainActions {
  // Decay settings
  setDecaySettings: (settings: Partial<DecaySettings>) => void;
  applyDecay: (projectId: string) => Promise<{ affected: number }>;

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
  decaySettings: {
    decayFactor: 0.9,
    retentionDays: 30,
  },
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
  promptContent: null,
  globalReflectionStatus: 'idle',
  lastGlobalReflection: null,
  globalRunningReflectionId: null,
  globalPromptContent: null,
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
      // DECAY SETTINGS
      // ========================================

      setDecaySettings: (settings) => {
        set(state => ({
          decaySettings: { ...state.decaySettings, ...settings },
        }));
      },

      applyDecay: async (projectId) => {
        const { decaySettings } = get();
        try {
          const response = await fetch('/api/brain/signals/decay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              decayFactor: decaySettings.decayFactor,
              retentionDays: decaySettings.retentionDays,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to apply decay');
          }

          const data = await response.json();
          return { affected: data.affected || 0 };
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to apply decay' });
          return { affected: 0 };
        }
      },

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
                promptContent: null,
              });
              return;
            }
            throw new Error('Failed to fetch reflection status');
          }

          const data = await response.json();
          const status = data.isRunning ? 'running' : (data.lastCompleted ? 'completed' : 'idle');

          // Note: promptContent is only available right after triggering, not on refresh
          // If running but no promptContent, the CLI terminal won't show (reflection continues in background)
          set({
            reflectionStatus: status,
            lastReflection: data.lastCompleted || null,
            decisionsSinceReflection: data.decisionsSinceLastReflection || 0,
            nextThreshold: data.nextThreshold || 20,
            shouldTrigger: data.shouldTrigger || false,
            triggerReason: data.triggerReason || null,
            runningReflectionId: data.runningReflection?.id || null,
            // Don't overwrite promptContent from GET - it's only set by triggerReflection
          });

          // Restore promptContent from sessionStorage if running but no prompt in memory
          const currentPrompt = get().promptContent;
          const runId = data.runningReflection?.id;
          if (status === 'running' && !currentPrompt && runId && typeof window !== 'undefined') {
            try {
              const savedPrompt = sessionStorage.getItem(`brain-prompt-${runId}`);
              if (savedPrompt) {
                set({ promptContent: savedPrompt });
              }
            } catch { /* sessionStorage unavailable */ }
          }
        } catch (error) {
          console.error('Failed to fetch reflection status:', error);
          set({ reflectionStatus: 'idle', lastReflection: null, runningReflectionId: null, promptContent: null });
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
            // Note: no promptContent available for already-running reflections
            if (response.status === 409 && errorData.reflectionId) {
              set({
                reflectionStatus: 'running',
                runningReflectionId: errorData.reflectionId,
                promptContent: null, // Can't get prompt for already-running reflection
                error: null,
              });
              return;
            }

            throw new Error(errorData.error || 'Failed to trigger reflection');
          }

          const data = await response.json();

          set({
            reflectionStatus: 'running',
            runningReflectionId: data.reflectionId || null,
            promptContent: data.promptContent || null,
            decisionsSinceReflection: 0,
            shouldTrigger: false,
            triggerReason: null,
          });

          // Persist promptContent to sessionStorage for refresh recovery
          if (typeof window !== 'undefined' && data.promptContent && data.reflectionId) {
            try {
              sessionStorage.setItem(
                `brain-prompt-${data.reflectionId}`,
                data.promptContent
              );
            } catch { /* sessionStorage full or unavailable */ }
          }
        } catch (error) {
          set({
            reflectionStatus: 'failed',
            error: error instanceof Error ? error.message : 'Failed to trigger reflection',
            runningReflectionId: null,
            promptContent: null,
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
            promptContent: null,
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
              globalPromptContent: null,
            });
            return;
          }

          const data = await response.json();
          const status = data.isRunning ? 'running' : (data.lastCompleted ? 'completed' : 'idle');
          set({
            globalReflectionStatus: status,
            lastGlobalReflection: data.lastCompleted || null,
            globalRunningReflectionId: data.runningReflection?.id || null,
            // Don't overwrite globalPromptContent from GET
          });

          // Restore globalPromptContent from sessionStorage if running but no prompt in memory
          const currentPrompt = get().globalPromptContent;
          const runId = data.runningReflection?.id;
          if (status === 'running' && !currentPrompt && runId && typeof window !== 'undefined') {
            try {
              const savedPrompt = sessionStorage.getItem(`brain-prompt-global-${runId}`);
              if (savedPrompt) {
                set({ globalPromptContent: savedPrompt });
              }
            } catch { /* sessionStorage unavailable */ }
          }
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
              set({
                globalReflectionStatus: 'running',
                globalRunningReflectionId: errorData.reflectionId,
                globalPromptContent: null, // Can't get prompt for already-running reflection
                error: null,
              });
              return;
            }

            throw new Error(errorData.error || 'Failed to trigger global reflection');
          }

          const data = await response.json();

          set({
            globalReflectionStatus: 'running',
            globalRunningReflectionId: data.reflectionId || null,
            globalPromptContent: data.promptContent || null,
          });

          // Persist globalPromptContent to sessionStorage for refresh recovery
          if (typeof window !== 'undefined' && data.promptContent && data.reflectionId) {
            try {
              sessionStorage.setItem(
                `brain-prompt-global-${data.reflectionId}`,
                data.promptContent
              );
            } catch { /* sessionStorage full or unavailable */ }
          }
        } catch (error) {
          set({
            globalReflectionStatus: 'failed',
            error: error instanceof Error ? error.message : 'Failed to trigger global reflection',
            globalRunningReflectionId: null,
            globalPromptContent: null,
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
