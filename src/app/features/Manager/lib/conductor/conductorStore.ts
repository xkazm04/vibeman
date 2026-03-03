/**
 * Conductor Pipeline Store
 *
 * Zustand store managing autonomous pipeline state, configuration,
 * and self-healing data. Config and run history are persisted to localStorage.
 * Current run state is volatile (rebuilt from server on reconnect).
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
  // Pipeline state (volatile — not persisted)
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
  pauseRun: () => void;
  resumeRun: () => void;
  stopRun: () => void;
  setRunFromServer: (run: PipelineRun) => void;

  // Actions — Stage Updates
  advanceStage: (stage: PipelineStage, stageState: Partial<StageState>) => void;
  updateMetrics: (metrics: Partial<PipelineMetrics>) => void;
  completePipeline: (status: PipelineStatus) => void;

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

  // Actions — History
  addToHistory: (summary: PipelineRunSummary) => void;
  clearHistory: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useConductorStore = create<ConductorStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
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
          const run: PipelineRun = {
            id: runId,
            projectId,
            status: 'running',
            currentStage: 'scout',
            cycle: 1,
            config,
            stages: createEmptyStages(),
            startedAt: new Date().toISOString(),
            metrics: createEmptyMetrics(),
          };

          set({
            currentRun: run,
            isRunning: true,
            isPaused: false,
          });

          return runId;
        },

        pauseRun: () => {
          const { currentRun } = get();
          if (!currentRun || currentRun.status !== 'running') return;

          set({
            currentRun: { ...currentRun, status: 'paused' },
            isPaused: true,
          });
        },

        resumeRun: () => {
          const { currentRun } = get();
          if (!currentRun || currentRun.status !== 'paused') return;

          set({
            currentRun: { ...currentRun, status: 'running' },
            isPaused: false,
          });
        },

        stopRun: () => {
          const { currentRun } = get();
          if (!currentRun) return;

          set({
            currentRun: { ...currentRun, status: 'stopping' },
          });
        },

        setRunFromServer: (run) => {
          // Parse process log from server response (comes as raw JSON or already parsed)
          const rawLog = (run as any).processLog || (run as any).process_log;
          let parsedLog: ProcessLogEntry[] = [];
          if (typeof rawLog === 'string') {
            try { parsedLog = JSON.parse(rawLog); } catch { /* ignore */ }
          } else if (Array.isArray(rawLog)) {
            parsedLog = rawLog;
          }

          set({
            currentRun: run,
            isRunning: run.status === 'running',
            isPaused: run.status === 'paused',
            processLog: parsedLog,
          });
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

          set({
            currentRun: {
              ...currentRun,
              currentStage: stage,
              stages: updatedStages,
            },
          });
        },

        updateMetrics: (metrics) => {
          const { currentRun } = get();
          if (!currentRun) return;

          set({
            currentRun: {
              ...currentRun,
              metrics: { ...currentRun.metrics, ...metrics },
            },
          });
        },

        completePipeline: (status) => {
          const { currentRun, addToHistory } = get();
          if (!currentRun) return;

          const completedRun: PipelineRun = {
            ...currentRun,
            status,
            completedAt: new Date().toISOString(),
            metrics: {
              ...currentRun.metrics,
              totalDurationMs: Date.now() - new Date(currentRun.startedAt).getTime(),
            },
          };

          // Add to history
          addToHistory({
            id: completedRun.id,
            projectId: completedRun.projectId,
            status: completedRun.status,
            cycles: completedRun.cycle,
            metrics: completedRun.metrics,
            startedAt: completedRun.startedAt,
            completedAt: completedRun.completedAt,
          });

          set({
            currentRun: null,
            isRunning: false,
            isPaused: false,
            processLog: [],
          });
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
          // Check if same error type + stage already exists — increment count
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
          // Replace existing patch for same targetId, or add new
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
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          config: state.config,
          runHistory: state.runHistory,
          healingPatches: state.healingPatches,
          errorClassifications: state.errorClassifications,
          nerdMode: state.nerdMode,
        }),
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<ConductorStoreState> | undefined;
          return {
            ...currentState,
            ...persisted,
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
      }
    ),
    { name: 'ConductorStore' }
  )
);
