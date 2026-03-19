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
import type { SignalAnomaly } from '@/lib/brain/anomalyDetector';
import { safeResponseJson, parseApiResponse, parseApiResponseSafe, unwrapEnvelope, extractMeta, BrainDecayResponseSchema, BrainContextResponseSchema, BrainOutcomesResponseSchema, BrainReflectionStatusSchema, BrainReflectionTriggerSchema } from '@/lib/apiResponseGuard';
import { reflectionCompletionEmitter } from './reflectionCompletionEmitter';
import { DEFAULT_DECAY_FACTOR, DEFAULT_RETENTION_DAYS, REFLECTION_TRIGGER_THRESHOLD } from '@/lib/brain/config';

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

export type ReflectionScope = 'project' | 'global';

/** Per-scope reflection state — replaces the former duplicated project/global fields. */
export interface ReflectionScopeState {
  status: ReflectionStatus | 'idle';
  lastReflection: DbBrainReflection | null;
  runningReflectionId: string | null;
  /** Direct prompt content for CLI execution (no file) */
  promptContent: string | null;
  // Project-specific trigger metadata (only meaningful for project scope, defaults for global)
  decisionsSinceReflection: number;
  nextThreshold: number;
  shouldTrigger: boolean;
  triggerReason: string | null;
}

const INITIAL_SCOPE_STATE: ReflectionScopeState = {
  status: 'idle',
  lastReflection: null,
  runningReflectionId: null,
  promptContent: null,
  decisionsSinceReflection: 0,
  nextThreshold: REFLECTION_TRIGGER_THRESHOLD,
  shouldTrigger: false,
  triggerReason: null,
};

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

  // Reflection — single polymorphic record keyed by scope
  reflections: Record<ReflectionScope, ReflectionScopeState>;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

interface BrainActions {
  // Decay settings
  setDecaySettings: (settings: Partial<DecaySettings>) => void;
  applyDecay: (projectId: string) => Promise<{ affected: number }>;

  // Data loading
  fetchBehavioralContext: (projectId: string) => Promise<void>;
  fetchRecentOutcomes: (projectId: string) => Promise<void>;
  fetchReflectionStatus: (projectId: string) => Promise<void>;

  /** Combined dashboard fetch — replaces 4 separate mount calls. Returns anomalies for caller. */
  fetchDashboard: (projectId: string, signal?: AbortSignal) => Promise<SignalAnomaly[]>;

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

  /** Scope-parameterized selector — returns a snapshot of reflection state for the given scope. */
  getReflectionState: (scope: ReflectionScope) => ReflectionScopeState;
}

type BrainStore = BrainState & BrainActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: BrainState = {
  decaySettings: {
    decayFactor: DEFAULT_DECAY_FACTOR,
    retentionDays: DEFAULT_RETENTION_DAYS,
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
  reflections: {
    project: { ...INITIAL_SCOPE_STATE },
    global: { ...INITIAL_SCOPE_STATE },
  },
  isLoading: false,
  error: null,
};

// ============================================================================
// SCOPE HELPERS (shared logic for project vs global reflection)
// ============================================================================

interface ScopeConfig {
  storagePrefix: string;
}

const scopeConfigs: Record<ReflectionScope, ScopeConfig> = {
  project: {
    storagePrefix: 'brain-prompt-',
  },
  global: {
    storagePrefix: 'brain-prompt-global-',
  },
};

interface ReflectionUpdate {
  status?: ReflectionStatus | 'idle';
  last?: DbBrainReflection | null;
  runId?: string | null;
  prompt?: string | null;
  decisionsSinceReflection?: number;
  nextThreshold?: number;
  shouldTrigger?: boolean;
  triggerReason?: string | null;
}

// ============================================================================
// STORE
// ============================================================================

export const useBrainStore = create<BrainStore>()(
  devtools(
    (set, get) => {
      // ---- Internal helpers (not exposed on the store) ----

      /** Merge a partial update into reflections[scope]. */
      const setScopeState = (scope: ReflectionScope, update: ReflectionUpdate) => {
        set((state) => ({
          reflections: {
            ...state.reflections,
            [scope]: {
              ...state.reflections[scope],
              ...(update.status !== undefined && { status: update.status }),
              ...(update.last !== undefined && { lastReflection: update.last }),
              ...(update.runId !== undefined && { runningReflectionId: update.runId }),
              ...(update.prompt !== undefined && { promptContent: update.prompt }),
              ...(update.decisionsSinceReflection !== undefined && { decisionsSinceReflection: update.decisionsSinceReflection }),
              ...(update.nextThreshold !== undefined && { nextThreshold: update.nextThreshold }),
              ...(update.shouldTrigger !== undefined && { shouldTrigger: update.shouldTrigger }),
              ...(update.triggerReason !== undefined && { triggerReason: update.triggerReason }),
            },
          },
        }));
      };

      const _fetchReflectionStatus = async (scope: ReflectionScope, query: string) => {
        const cfg = scopeConfigs[scope];
        try {
          const response = await fetch(`/api/brain/reflection?${query}`);
          if (!response.ok) {
            setScopeState(scope, {
              status: 'idle',
              last: null,
              runId: null,
              prompt: null,
              decisionsSinceReflection: 0,
              shouldTrigger: false,
              triggerReason: null,
            });
            return;
          }

          const label = `/api/brain/reflection?${query}`;
          const raw = await safeResponseJson(response, label);
          const fallback = { isRunning: false, lastCompleted: null, decisionsSinceLastReflection: 0, nextThreshold: 20, shouldTrigger: false, triggerReason: null, runningReflection: null };
          const data = scope === 'project'
            ? parseApiResponse(raw, BrainReflectionStatusSchema, label)
            : parseApiResponseSafe(raw, BrainReflectionStatusSchema, fallback, label);
          const status = data.isRunning ? 'running' : (data.lastCompleted ? 'completed' : 'idle');

          // Detect reflection completion: compare new completed_at with previous
          const prevReflection = get().reflections[scope].lastReflection;
          const newReflection = data.lastCompleted;
          const hasJustCompleted =
            newReflection &&
            newReflection.status === 'completed' &&
            newReflection.completed_at &&
            (
              !prevReflection ||
              prevReflection.completed_at !== newReflection.completed_at ||
              prevReflection.id !== newReflection.id
            );

          setScopeState(scope, {
            status,
            last: data.lastCompleted || null,
            runId: data.runningReflection?.id || null,
            decisionsSinceReflection: data.decisionsSinceLastReflection,
            nextThreshold: data.nextThreshold,
            shouldTrigger: data.shouldTrigger,
            triggerReason: data.triggerReason,
          });

          // Emit completion event for UI cascade refresh
          if (hasJustCompleted && newReflection) {
            reflectionCompletionEmitter.emit(
              newReflection.id,
              newReflection.project_id,
              scope
            );
          }

          // Restore promptContent from sessionStorage if running but no prompt in memory
          const currentPrompt = get().reflections[scope].promptContent;
          const runId = data.runningReflection?.id;
          if (status === 'running' && !currentPrompt && runId && typeof window !== 'undefined') {
            try {
              const savedPrompt = sessionStorage.getItem(`${cfg.storagePrefix}${runId}`);
              if (savedPrompt) {
                setScopeState(scope, { prompt: savedPrompt });
              }
            } catch { /* sessionStorage unavailable */ }
          }
        } catch (error) {
          console.error(`Failed to fetch ${scope} reflection status:`, error);
          setScopeState(scope, {
            status: 'idle',
            last: null,
            runId: null,
            prompt: null,
          });
        }
      };

      const _triggerReflection = async (scope: ReflectionScope, body: Record<string, unknown>) => {
        const cfg = scopeConfigs[scope];
        const label = `/api/brain/reflection POST${scope === 'global' ? ' global' : ''}`;
        setScopeState(scope, { status: 'running' });
        set({ error: null });

        try {
          const response = await fetch('/api/brain/reflection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errorData = await safeResponseJson<Record<string, unknown>>(response, label);

            if (response.status === 409 && errorData.reflectionId) {
              setScopeState(scope, {
                status: 'running',
                runId: errorData.reflectionId as string,
                prompt: null,
              });
              set({ error: null });
              return;
            }

            throw new Error((errorData.error as string) || `Failed to trigger ${scope} reflection`);
          }

          const raw = await safeResponseJson(response, label);
          const data = parseApiResponseSafe(raw, BrainReflectionTriggerSchema, { reflectionId: undefined, promptContent: null }, label);

          setScopeState(scope, {
            status: 'running',
            runId: data.reflectionId || null,
            prompt: data.promptContent || null,
            decisionsSinceReflection: 0,
            shouldTrigger: false,
            triggerReason: null,
          });

          // Persist promptContent to sessionStorage for refresh recovery
          if (typeof window !== 'undefined' && data.promptContent && data.reflectionId) {
            try {
              sessionStorage.setItem(
                `${cfg.storagePrefix}${data.reflectionId}`,
                data.promptContent
              );
            } catch { /* sessionStorage full or unavailable */ }
          }
        } catch (error) {
          setScopeState(scope, {
            status: 'failed',
            runId: null,
            prompt: null,
          });
          set({
            error: error instanceof Error ? error.message : `Failed to trigger ${scope} reflection`,
          });
        }
      };

      // ---- Public store ----
      return {
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

            const raw = await safeResponseJson(response, '/api/brain/signals/decay');
            const data = parseApiResponseSafe(raw, BrainDecayResponseSchema, { success: false, affected: 0, decayed: 0, deleted: 0, settings: { decayFactor: DEFAULT_DECAY_FACTOR, retentionDays: DEFAULT_RETENTION_DAYS } }, '/api/brain/signals/decay');
            return { affected: data.affected };
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to apply decay' });
            return { affected: 0 };
          }
        },

        // ========================================
        // DATA LOADING
        // ========================================

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

            const raw = await safeResponseJson(response, '/api/brain/context');
            const validated = parseApiResponseSafe(raw, BrainContextResponseSchema, { success: true, data: { context: null } }, '/api/brain/context');
            const context = unwrapEnvelope(validated, 'context', null);
            set({
              behavioralContext: context,
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

            const raw = await safeResponseJson(response, '/api/brain/outcomes');
            const data = parseApiResponseSafe(raw, BrainOutcomesResponseSchema, { outcomes: [], stats: initialState.outcomeStats }, '/api/brain/outcomes');
            set({
              recentOutcomes: data.outcomes,
              outcomeStats: data.stats,
              isLoadingOutcomes: false,
            });
          } catch (error) {
            console.error('Failed to fetch outcomes:', error);
            set({ recentOutcomes: [], isLoadingOutcomes: false });
          }
        },

        fetchReflectionStatus: async (projectId) => {
          await _fetchReflectionStatus('project', `projectId=${projectId}`);
        },

        fetchDashboard: async (projectId, signal?) => {
          set({ isLoadingContext: true, isLoadingOutcomes: true, isLoading: true });
          try {
            const response = await fetch(`/api/brain/dashboard?projectId=${encodeURIComponent(projectId)}`, { signal });
            if (!response.ok) {
              set({ isLoadingContext: false, isLoadingOutcomes: false, isLoading: false });
              return [];
            }

            if (signal?.aborted) return [];

            const data = await response.json();
            if (!data.success) {
              set({ isLoadingContext: false, isLoadingOutcomes: false, isLoading: false });
              return [];
            }

            // Context
            const behavioralContext = data.context || null;

            // Outcomes
            const recentOutcomes = data.outcomes || [];
            const outcomeStats = data.outcomeStats || initialState.outcomeStats;

            // Reflection status
            const ref = data.reflection || {};
            const refStatus: ReflectionStatus | 'idle' = ref.isRunning ? 'running' : (ref.lastCompleted ? 'completed' : 'idle');

            // Detect reflection completion: compare new completed_at with previous
            const prevReflection = get().reflections.project.lastReflection;
            const newReflection = ref.lastCompleted;
            const hasJustCompleted =
              newReflection &&
              newReflection.status === 'completed' &&
              newReflection.completed_at &&
              (
                !prevReflection ||
                prevReflection.completed_at !== newReflection.completed_at ||
                prevReflection.id !== newReflection.id
              );

            // Bail out if request was aborted during parsing (stale project switch)
            if (signal?.aborted) return [];

            set((state) => ({
              behavioralContext,
              isLoadingContext: false,
              recentOutcomes,
              outcomeStats,
              isLoadingOutcomes: false,
              reflections: {
                ...state.reflections,
                project: {
                  ...state.reflections.project,
                  status: refStatus,
                  lastReflection: ref.lastCompleted || null,
                  runningReflectionId: ref.runningReflection?.id || null,
                  decisionsSinceReflection: ref.decisionsSinceLastReflection || 0,
                  nextThreshold: ref.nextThreshold || REFLECTION_TRIGGER_THRESHOLD,
                  shouldTrigger: ref.shouldTrigger || false,
                  triggerReason: ref.triggerReason || null,
                },
              },
              isLoading: false,
            }));

            // Emit completion event for UI cascade refresh
            if (hasJustCompleted && newReflection) {
              reflectionCompletionEmitter.emit(
                newReflection.id,
                newReflection.project_id,
                'project'
              );
            }

            // Restore promptContent from sessionStorage if running
            if (refStatus === 'running' && !get().reflections.project.promptContent && ref.runningReflection?.id && typeof window !== 'undefined') {
              try {
                const savedPrompt = sessionStorage.getItem(`brain-prompt-${ref.runningReflection.id}`);
                if (savedPrompt) setScopeState('project', { prompt: savedPrompt });
              } catch { /* sessionStorage unavailable */ }
            }

            return data.anomalies || [];
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return [];
            console.error('Failed to fetch dashboard:', error);
            set({ isLoadingContext: false, isLoadingOutcomes: false, isLoading: false });
            return [];
          }
        },

        // ========================================
        // ACTIONS
        // ========================================

        triggerReflection: async (projectId, projectName, projectPath) => {
          await _triggerReflection('project', {
            projectId,
            projectName,
            projectPath,
            triggerType: 'manual',
          });
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

            setScopeState('project', {
              status: 'idle',
              runId: null,
              prompt: null,
            });
            set({ error: null });
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
          await _fetchReflectionStatus('global', 'scope=global');
        },

        triggerGlobalReflection: async (projects, workspacePath) => {
          await _triggerReflection('global', {
            scope: 'global',
            projects,
            workspacePath,
          });
        },

        // ========================================
        // UTILITIES
        // ========================================

        getReflectionState: (scope: ReflectionScope) => get().reflections[scope],

        clearError: () => set({ error: null }),
      };
    },
    { name: 'brain-store' }
  )
);

export default useBrainStore;
