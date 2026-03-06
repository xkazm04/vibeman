/**
 * Application Session Coordinator Store
 *
 * Centralized store for managing application session state across
 * multiple independent stores (project, context, brain, CLI).
 *
 * Problem: Components manually wire 5+ stores on every page
 * - useClientProjectStore for activeProject
 * - useContextStore.loadProjectData(pid)
 * - useBrainStore.fetchDashboard(pid)
 * - useOrchestrationStore for CLI session
 * - useWorkflowStore for workflow state
 *
 * Each feature layout has its own useEffect re-deriving projectId,
 * causing race conditions when switching projects while stale data loads.
 *
 * Solution: ApplicationSessionStore owns the cascade
 * - setActiveProject() auto-triggers loadProjectData, fetchBrainDashboard
 * - Coordinates AbortSignals to cancel stale requests
 * - New features get connection for free
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Project } from '@/types';
import type { Context } from '@/lib/queries/contextQueries';
import {
  ApplicationSessionStore,
  ApplicationSessionState,
  AbortSignalTracker,
  SessionPhase,
  CascadeConfig,
  DEFAULT_CASCADE_CONFIG,
} from './types';

/**
 * Create abort signal tracker
 */
function createAbortSignalTracker(): AbortSignalTracker {
  return {
    context: new AbortController(),
    brain: new AbortController(),
    brain_dashboard: new AbortController(),
    file_structure: new AbortController(),
    general: new AbortController(),
  };
}

/**
 * Application Session Coordinator
 *
 * Single source of truth for managing the cascade of state changes
 * when switching projects, contexts, or workflows.
 */
export const useApplicationSessionStore = create<ApplicationSessionStore>()(
  devtools(
    (set, get) => {
      // Track abort signals for coordinating request cancellation
      let abortSignals = createAbortSignalTracker();

      return {
        // === Initial State ===
        activeProject: null,
        activeContext: null,
        activeWorkflow: null,
        phase: 'idle',
        error: null,
        lastSwitchAt: 0,
        switchInProgress: false,

        // === Initialization ===

        /**
         * Initialize the session coordinator
         * Restores last session if available
         */
        initialize: async () => {
          const state = get();
          if (state.phase !== 'idle') return; // Already initialized

          set({ phase: 'loading' });

          try {
            // Try to restore from localStorage
            get().restore();
            set({ phase: 'ready' });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to initialize session';
            set({ phase: 'error', error: message });
          }
        },

        /**
         * Restore session from localStorage
         */
        restore: () => {
          if (typeof window === 'undefined') return;

          try {
            const stored = localStorage.getItem('app-session');
            if (!stored) return;

            const session = JSON.parse(stored) as ApplicationSessionState;
            set({
              activeProject: session.activeProject,
              activeContext: session.activeContext,
              activeWorkflow: session.activeWorkflow,
              phase: session.phase,
            });
          } catch {
            // Silently fail for corrupted localStorage
          }
        },

        // === Session Actions ===

        /**
         * Switch to a different project.
         *
         * Atomically:
         * 1. Updates activeProject in this store
         * 2. Cascades to dependent stores based on config
         * 3. Cancels previous in-flight requests
         * 4. Updates browser history/localStorage
         *
         * This is called from feature layouts instead of manually
         * wiring up 5 different stores.
         */
        switchProject: async (project: Project, config?: Partial<CascadeConfig>) => {
          const state = get();
          const finalConfig = { ...DEFAULT_CASCADE_CONFIG, ...config };

          // Already switching to this project
          if (state.activeProject?.id === project.id && !state.switchInProgress) {
            return;
          }

          set({ switchInProgress: true, phase: 'switching', error: null });

          try {
            // 1. Cancel all previous requests if configured
            if (finalConfig.cancelPrevious) {
              get().cancelAllRequests();
            }

            // 2. Update active project immediately
            set({
              activeProject: project,
              activeContext: null, // Reset context on project switch
              lastSwitchAt: Date.now(),
            });

            // 3. Persist session
            if (typeof window !== 'undefined') {
              const session: ApplicationSessionState = {
                activeProject: project,
                activeContext: null,
                activeWorkflow: state.activeWorkflow,
                phase: 'loading',
                error: null,
                lastSwitchAt: Date.now(),
                switchInProgress: false,
              };
              localStorage.setItem('app-session', JSON.stringify(session));
            }

            // 4. Sync legacy clientProjectStore so components reading
            //    useActiveProjectStore see the same project
            try {
              const { useClientProjectStore } = await import('@/stores/clientProjectStore');
              useClientProjectStore.getState().setActiveProject(project);
            } catch (e) {
              console.error('[ApplicationSession] Failed to sync clientProjectStore:', e);
            }

            // 5. Cascade to dependent stores concurrently, passing AbortSignals
            const cascades: Promise<void>[] = [];

            // Load contexts for this project
            if (finalConfig.loadContext) {
              cascades.push(
                (async () => {
                  try {
                    const { useContextStore } = await import('@/stores/contextStore');
                    const contextStore = useContextStore.getState();
                    await contextStore.loadProjectData(project.id, abortSignals.context.signal);
                  } catch (e) {
                    if (e instanceof DOMException && e.name === 'AbortError') return;
                    console.error('[ApplicationSession] Failed to load contexts:', e);
                  }
                })()
              );
            }

            // Load brain dashboard for this project
            if (finalConfig.loadBrainDashboard) {
              cascades.push(
                (async () => {
                  try {
                    const { useBrainStore } = await import('@/stores/brainStore');
                    const brainStore = useBrainStore.getState();
                    await brainStore.fetchDashboard(project.id, abortSignals.brain_dashboard.signal);
                  } catch (e) {
                    if (e instanceof DOMException && e.name === 'AbortError') return;
                    console.error('[ApplicationSession] Failed to fetch brain dashboard:', e);
                  }
                })()
              );
            }

            // Load file structure for this project
            if (finalConfig.loadFileStructure) {
              cascades.push(
                (async () => {
                  try {
                    const { useClientProjectStore } = await import('@/stores/clientProjectStore');
                    const clientProjectStore = useClientProjectStore.getState();
                    await clientProjectStore.loadProjectFileStructure(project.id);
                  } catch (e) {
                    console.error('[ApplicationSession] Failed to load file structure:', e);
                  }
                })()
              );
            }

            // Note: Not cascading to orchestratorStore as it's for batch execution,
            // not tracking the current project selection

            // Wait for all cascades to complete
            await Promise.all(cascades);

            set({ phase: 'ready', switchInProgress: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to switch project';
            set({
              phase: 'error',
              error: message,
              switchInProgress: false,
            });
            throw error;
          }
        },

        /**
         * Switch to a different context within the current project
         */
        setContext: async (context: Context | null) => {
          const state = get();

          if (!state.activeProject) {
            throw new Error('Cannot set context: no active project');
          }

          set({ activeContext: context });

          // Persist change
          if (typeof window !== 'undefined') {
            const session: ApplicationSessionState = {
              ...state,
              activeContext: context,
              lastSwitchAt: Date.now(),
            };
            localStorage.setItem('app-session', JSON.stringify(session));
          }
        },

        /**
         * Set active workflow
         */
        setWorkflow: (workflowId: string | null) => {
          set({ activeWorkflow: workflowId });
        },

        // === Request Coordination ===

        /**
         * Get abort signal for specific request type
         * Used by data-fetching code to enable cancellation
         */
        getAbortSignal: (type: keyof AbortSignalTracker) => {
          return abortSignals[type].signal;
        },

        /**
         * Cancel all in-flight requests
         */
        cancelAllRequests: () => {
          // Abort all previous requests
          Object.values(abortSignals).forEach((controller) => {
            controller.abort();
          });

          // Create fresh abort controllers
          abortSignals = createAbortSignalTracker();
        },

        /**
         * Cancel specific request type
         */
        cancelRequest: (type: keyof AbortSignalTracker) => {
          abortSignals[type].abort();
          abortSignals[type] = new AbortController();
        },

        // === Error Handling ===

        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        // === Cleanup ===

        cleanup: () => {
          // Cancel all active requests
          get().cancelAllRequests();

          // Clear localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('app-session');
          }

          // Reset state
          set({
            activeProject: null,
            activeContext: null,
            activeWorkflow: null,
            phase: 'idle',
            error: null,
            lastSwitchAt: 0,
            switchInProgress: false,
          });
        },
      };
    },
    { name: 'ApplicationSessionStore' }
  )
);
