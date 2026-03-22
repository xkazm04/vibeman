/**
 * Conductor Pipeline Store
 *
 * Zustand store managing autonomous pipeline state, configuration,
 * and self-healing data. Config and run history are persisted to localStorage.
 * Current run state is volatile (rebuilt from server on reconnect).
 *
 * Supports multiple concurrent runs via a runs map + selectedRunId pointer.
 * Backward-compat derived fields (currentRun, isRunning, isPaused, processLog)
 * are recomputed from selectedRunId so existing selectors keep working.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  PipelineRun,
  PipelineRunSummary,
  PipelineStage,
  PipelineStatus,
  PipelineMetrics,
  StageState,
  BalancingConfig,
  HealingPatch,
  ErrorClassification,
  ProcessLogEntry,
  ServerRunPayload,
} from './types';
import {
  DEFAULT_BALANCING_CONFIG,
  createEmptyStages,
  createEmptyMetrics,
} from './types';

// ============================================================================
// Store State
// ============================================================================

interface ConductorStoreState {
  // Multi-run state (volatile — not persisted)
  runs: Record<string, PipelineRun>;
  processLogs: Record<string, ProcessLogEntry[]>;
  selectedRunId: string | null;

  // Derived fields (backward compat — recomputed from selectedRunId)
  currentRun: PipelineRun | null;
  isRunning: boolean;
  isPaused: boolean;
  processLog: ProcessLogEntry[];

  // Configuration (persisted)
  config: BalancingConfig;

  // History (persisted, last 20 runs)
  runHistory: PipelineRunSummary[];

  // Self-healing (persisted)
  healingPatches: HealingPatch[];
  errorClassifications: ErrorClassification[];

  // UI preferences (persisted)
  nerdMode: boolean;

  // Actions — Pipeline Control
  startRun: (projectId: string, configOverrides?: Partial<BalancingConfig>) => string;
  pauseRun: (runId?: string) => void;
  resumeRun: (runId?: string) => void;
  stopRun: (runId?: string) => void;
  setRunFromServer: (run: ServerRunPayload) => void;
  setRunsFromServer: (runs: ServerRunPayload[]) => void;

  // Actions — Run Selection
  selectRun: (runId: string | null) => void;
  removeRun: (runId: string) => void;

  // Actions — Stage Updates
  advanceStage: (stage: PipelineStage, stageState: Partial<StageState>) => void;
  updateMetrics: (metrics: Partial<PipelineMetrics>) => void;
  completePipeline: (status: PipelineStatus, runId?: string) => void;

  // Actions — Configuration
  updateConfig: (partial: Partial<BalancingConfig>) => void;
  resetConfig: () => void;

  // Actions — Self-Healing
  recordError: (classification: ErrorClassification) => void;
  applyHealingPatch: (patch: HealingPatch) => void;
  revertHealingPatch: (patchId: string) => void;
  clearResolvedErrors: () => void;

  // Actions — UI Preferences
  toggleNerdMode: () => void;

  // Actions — Run Reset
  resetRun: () => void;

  // Actions — History
  addToHistory: (summary: PipelineRunSummary) => void;
  clearHistory: () => void;
}

// ============================================================================
// Derive Helper — recomputes backward-compat fields from runs + selectedRunId
// ============================================================================

function derive(
  partial: Partial<ConductorStoreState>,
  current: ConductorStoreState
): Partial<ConductorStoreState> {
  const merged = { ...current, ...partial };
  const selectedRun = merged.selectedRunId
    ? merged.runs[merged.selectedRunId] ?? null
    : null;

  return {
    ...partial,
    currentRun: selectedRun,
    isRunning: selectedRun?.status === 'running',
    isPaused: selectedRun?.status === 'paused',
    processLog: merged.selectedRunId
      ? merged.processLogs[merged.selectedRunId] || []
      : [],
  };
}

function parseProcessLog(raw: string | ProcessLogEntry[] | null | undefined): ProcessLogEntry[] {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

// ============================================================================
// Store
// ============================================================================

export const useConductorStore = create<ConductorStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        runs: {},
        processLogs: {},
        selectedRunId: null,
        currentRun: null,
        isRunning: false,
        isPaused: false,
        processLog: [],
        config: DEFAULT_BALANCING_CONFIG,
        runHistory: [],
        healingPatches: [],
        errorClassifications: [],
        nerdMode: false,

        // ---- Pipeline Control ----

        startRun: (projectId, configOverrides) => {
          const config = { ...get().config, ...configOverrides };
          const runId = uuidv4();
          const isV3 = config.pipelineVersion === 3;
          const run: PipelineRun = {
            id: runId,
            projectId,
            goalId: '',
            status: 'running',
            currentStage: (isV3 ? 'plan' : 'scout') as PipelineStage,
            cycle: 1,
            config,
            stages: createEmptyStages(),
            startedAt: new Date().toISOString(),
            metrics: createEmptyMetrics(),
            pipelineVersion: isV3 ? 3 : 2,
          };

          set(derive({
            runs: { ...get().runs, [runId]: run },
            processLogs: { ...get().processLogs, [runId]: [] },
            selectedRunId: runId,
          }, get()));

          return runId;
        },

        pauseRun: (runId?) => {
          const targetId = runId || get().selectedRunId;
          if (!targetId) return;
          const run = get().runs[targetId];
          if (!run || run.status !== 'running') return;

          set(derive({
            runs: {
              ...get().runs,
              [targetId]: { ...run, status: 'paused' as PipelineStatus },
            },
          }, get()));
        },

        resumeRun: (runId?) => {
          const targetId = runId || get().selectedRunId;
          if (!targetId) return;
          const run = get().runs[targetId];
          if (!run || run.status !== 'paused') return;

          set(derive({
            runs: {
              ...get().runs,
              [targetId]: { ...run, status: 'running' as PipelineStatus },
            },
          }, get()));
        },

        stopRun: (runId?) => {
          const targetId = runId || get().selectedRunId;
          if (!targetId) return;
          const run = get().runs[targetId];
          if (!run) return;

          set(derive({
            runs: {
              ...get().runs,
              [targetId]: { ...run, status: 'stopping' as PipelineStatus },
            },
          }, get()));

          // Auto-clear after timeout — if server never confirms, don't stay stuck
          setTimeout(() => {
            const state = get();
            const currentRun = state.runs[targetId];
            if (currentRun?.status === 'stopping') {
              set(derive({
                runs: {
                  ...state.runs,
                  [targetId]: { ...currentRun, status: 'interrupted' as PipelineStatus, completedAt: new Date().toISOString() },
                },
              }, state));
            }
          }, 10_000);
        },

        setRunFromServer: (run) => {
          const { runs } = get();
          const isTerminal = run.status === 'completed' || run.status === 'failed' || run.status === 'interrupted';

          // Don't restore terminal runs unless we're tracking them
          if (isTerminal && !runs[run.id]) return;

          const parsedLog = parseProcessLog(run.process_log);

          if (isTerminal) {
            // Add to history before removing from active runs
            const trackedRun = runs[run.id];
            if (trackedRun) {
              get().addToHistory({
                id: trackedRun.id,
                projectId: trackedRun.projectId,
                status: run.status as PipelineStatus,
                cycles: trackedRun.cycle,
                metrics: {
                  ...trackedRun.metrics,
                  totalDurationMs: Date.now() - new Date(trackedRun.startedAt).getTime(),
                },
                startedAt: trackedRun.startedAt,
                completedAt: new Date().toISOString(),
              });
            }

            // Remove from active runs
            const { [run.id]: _, ...remaining } = runs;
            const { [run.id]: __, ...remainingLogs } = get().processLogs;
            let { selectedRunId } = get();
            if (selectedRunId === run.id) {
              const ids = Object.keys(remaining);
              selectedRunId = ids[0] || null;
            }
            set(derive({
              runs: remaining,
              processLogs: remainingLogs,
              selectedRunId,
            }, get()));
          } else {
            set(derive({
              runs: { ...runs, [run.id]: run },
              processLogs: { ...get().processLogs, [run.id]: parsedLog },
            }, get()));
          }
        },

        setRunsFromServer: (serverRuns) => {
          const { runs, processLogs, selectedRunId } = get();
          const updatedRuns = { ...runs };
          const updatedLogs = { ...processLogs };

          for (const run of serverRuns) {
            const isTerminal = run.status === 'completed' || run.status === 'failed' || run.status === 'interrupted';
            const parsedLog = parseProcessLog(run.process_log);

            if (isTerminal) {
              if (updatedRuns[run.id]) {
                // Add to history before removing
                get().addToHistory({
                  id: updatedRuns[run.id].id,
                  projectId: updatedRuns[run.id].projectId,
                  status: run.status as PipelineStatus,
                  cycles: updatedRuns[run.id].cycle,
                  metrics: {
                    ...updatedRuns[run.id].metrics,
                    totalDurationMs: Date.now() - new Date(updatedRuns[run.id].startedAt).getTime(),
                  },
                  startedAt: updatedRuns[run.id].startedAt,
                  completedAt: new Date().toISOString(),
                });
                delete updatedRuns[run.id];
                delete updatedLogs[run.id];
              }
            } else {
              updatedRuns[run.id] = run;
              updatedLogs[run.id] = parsedLog;
            }
          }

          // Auto-select if selectedRunId is stale
          let newSelectedId = selectedRunId;
          if (!newSelectedId || !updatedRuns[newSelectedId]) {
            const ids = Object.keys(updatedRuns);
            newSelectedId = ids[0] || null;
          }

          set(derive({
            runs: updatedRuns,
            processLogs: updatedLogs,
            selectedRunId: newSelectedId,
          }, get()));
        },

        // ---- Run Selection ----

        selectRun: (runId) => {
          set(derive({ selectedRunId: runId }, get()));
        },

        removeRun: (runId) => {
          const { [runId]: _, ...remaining } = get().runs;
          const { [runId]: __, ...remainingLogs } = get().processLogs;
          let { selectedRunId } = get();
          if (selectedRunId === runId) {
            const ids = Object.keys(remaining);
            selectedRunId = ids[0] || null;
          }
          set(derive({
            runs: remaining,
            processLogs: remainingLogs,
            selectedRunId,
          }, get()));
        },

        // ---- Stage Updates ----

        advanceStage: (stage, stageState) => {
          const { currentRun } = get();
          if (!currentRun) return;

          const updatedStages = { ...currentRun.stages };
          updatedStages[stage] = {
            ...updatedStages[stage],
            ...stageState,
          };

          set(derive({
            runs: {
              ...get().runs,
              [currentRun.id]: {
                ...currentRun,
                currentStage: stage,
                stages: updatedStages,
              },
            },
          }, get()));
        },

        updateMetrics: (metrics) => {
          const { currentRun } = get();
          if (!currentRun) return;

          set(derive({
            runs: {
              ...get().runs,
              [currentRun.id]: {
                ...currentRun,
                metrics: { ...currentRun.metrics, ...metrics },
              },
            },
          }, get()));
        },

        completePipeline: (status, runId?) => {
          const targetId = runId || get().selectedRunId;
          if (!targetId) return;
          const run = get().runs[targetId];
          if (!run) return;

          // Add to history
          get().addToHistory({
            id: run.id,
            projectId: run.projectId,
            status,
            cycles: run.cycle,
            metrics: {
              ...run.metrics,
              totalDurationMs: Date.now() - new Date(run.startedAt).getTime(),
            },
            startedAt: run.startedAt,
            completedAt: new Date().toISOString(),
          });

          // Remove from active runs
          const { [targetId]: _, ...remaining } = get().runs;
          const { [targetId]: __, ...remainingLogs } = get().processLogs;
          let { selectedRunId } = get();
          if (selectedRunId === targetId) {
            const ids = Object.keys(remaining);
            selectedRunId = ids[0] || null;
          }

          set(derive({
            runs: remaining,
            processLogs: remainingLogs,
            selectedRunId,
          }, get()));
        },

        // ---- Run Reset ----

        resetRun: () => {
          const targetId = get().selectedRunId;
          if (!targetId) return;

          const { [targetId]: _, ...remaining } = get().runs;
          const { [targetId]: __, ...remainingLogs } = get().processLogs;
          const ids = Object.keys(remaining);

          set(derive({
            runs: remaining,
            processLogs: remainingLogs,
            selectedRunId: ids[0] || null,
          }, get()));
        },

        // ---- Configuration ----

        updateConfig: (partial) => {
          set({ config: { ...get().config, ...partial } });
        },

        resetConfig: () => {
          set({ config: DEFAULT_BALANCING_CONFIG });
        },

        // ---- Self-Healing ----

        recordError: (classification) => {
          const { errorClassifications } = get();
          const existing = errorClassifications.find(
            (e) =>
              e.errorType === classification.errorType &&
              e.stage === classification.stage &&
              !e.resolved
          );

          if (existing) {
            set({
              errorClassifications: errorClassifications.map((e) =>
                e.id === existing.id
                  ? {
                      ...e,
                      occurrenceCount: e.occurrenceCount + 1,
                      lastSeen: new Date().toISOString(),
                      errorMessage: classification.errorMessage,
                    }
                  : e
              ),
            });
          } else {
            set({
              errorClassifications: [...errorClassifications, classification],
            });
          }
        },

        applyHealingPatch: (patch) => {
          const { healingPatches } = get();
          const filtered = healingPatches.filter(
            (p) => p.targetId !== patch.targetId || p.reverted
          );
          set({ healingPatches: [...filtered, patch] });
        },

        revertHealingPatch: (patchId) => {
          set({
            healingPatches: get().healingPatches.map((p) =>
              p.id === patchId ? { ...p, reverted: true } : p
            ),
          });
        },

        clearResolvedErrors: () => {
          set({
            errorClassifications: get().errorClassifications.filter(
              (e) => !e.resolved
            ),
          });
        },

        // ---- UI Preferences ----

        toggleNerdMode: () => {
          set({ nerdMode: !get().nerdMode });
        },

        // ---- History ----

        addToHistory: (summary) => {
          const { runHistory } = get();
          const updated = [summary, ...runHistory].slice(0, 20);
          set({ runHistory: updated });
        },

        clearHistory: () => {
          set({ runHistory: [] });
        },
      }),
      {
        name: 'conductor-pipeline-store',
        version: 2,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          config: state.config,
          runHistory: state.runHistory,
          healingPatches: state.healingPatches,
          errorClassifications: state.errorClassifications,
          nerdMode: state.nerdMode,
          // Persist active runs so they survive refresh (like CLI sessions)
          runs: state.runs,
          processLogs: state.processLogs,
          selectedRunId: state.selectedRunId,
        }),
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<ConductorStoreState> | undefined;

          // Restore persisted runs and recompute derived fields
          const runs = persisted?.runs && typeof persisted.runs === 'object' ? persisted.runs : {};
          const processLogs = persisted?.processLogs && typeof persisted.processLogs === 'object' ? persisted.processLogs : {};
          const selectedRunId = persisted?.selectedRunId && runs[persisted.selectedRunId] ? persisted.selectedRunId : Object.keys(runs)[0] || null;
          const selectedRun = selectedRunId ? runs[selectedRunId] ?? null : null;

          return {
            ...currentState,
            ...persisted,
            // Restore active run state
            runs,
            processLogs,
            selectedRunId,
            // Recompute derived fields from restored runs
            currentRun: selectedRun,
            isRunning: selectedRun?.status === 'running',
            isPaused: selectedRun?.status === 'paused',
            processLog: selectedRunId ? processLogs[selectedRunId] || [] : [],
            // Deep-merge config with defaults so new fields always have values
            config: {
              ...DEFAULT_BALANCING_CONFIG,
              ...(persisted?.config || {}),
              // Ensure arrays are always arrays (guard against corrupt persisted state)
              scanTypes: Array.isArray(persisted?.config?.scanTypes)
                ? persisted.config.scanTypes
                : DEFAULT_BALANCING_CONFIG.scanTypes,
              contextIds: Array.isArray(persisted?.config?.contextIds)
                ? persisted.config.contextIds
                : DEFAULT_BALANCING_CONFIG.contextIds,
              modelRouting: Array.isArray(persisted?.config?.modelRouting)
                ? persisted.config.modelRouting
                : DEFAULT_BALANCING_CONFIG.modelRouting,
            },
          };
        },
        migrate: (persistedState: unknown, version: number) => {
          // v1 -> v2: runs/processLogs/selectedRunId now persisted; old stores don't have them
          if (version < 2) {
            const state = persistedState as Record<string, unknown> | undefined;
            return {
              ...state,
              runs: {},
              processLogs: {},
              selectedRunId: null,
            };
          }
          return persistedState;
        },
      }
    ),
    { name: 'ConductorStore' }
  )
);
