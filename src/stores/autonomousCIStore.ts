/**
 * Autonomous CI Store
 * Manages state for the CI automation dashboard
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DbCIPipeline,
  DbBuildExecution,
  DbCIPrediction,
  DbFlakyTest,
  DbCIConfig,
  CIDashboardStats,
  BuildStatus,
} from '@/app/db/models/autonomous-ci.types';

// ============================================================================
// TYPES
// ============================================================================

export type ViewMode = 'dashboard' | 'pipelines' | 'builds' | 'predictions' | 'flaky-tests';

interface AutonomousCIState {
  // Data
  pipelines: DbCIPipeline[];
  selectedPipelineId: string | null;
  selectedPipeline: DbCIPipeline | null;
  builds: DbBuildExecution[];
  predictions: DbCIPrediction[];
  flakyTests: DbFlakyTest[];
  config: DbCIConfig | null;
  stats: CIDashboardStats | null;

  // Build trend data
  buildTrend: Array<{
    date: string;
    success: number;
    failure: number;
    total: number;
  }>;

  // UI State
  viewMode: ViewMode;
  loading: boolean;
  generating: boolean;
  error: string | null;
  showConfigModal: boolean;
  showCreatePipelineModal: boolean;

  // Filters
  filterStatus: 'all' | BuildStatus;
  filterActive: boolean;
  dateRange: 'week' | 'month' | 'quarter';

  // Preferences (persisted)
  expandedSections: string[];
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}

interface AutonomousCIActions {
  // Data setters
  setPipelines: (pipelines: DbCIPipeline[]) => void;
  addPipeline: (pipeline: DbCIPipeline) => void;
  updatePipeline: (id: string, updates: Partial<DbCIPipeline>) => void;
  removePipeline: (id: string) => void;

  setSelectedPipelineId: (id: string | null) => void;
  setSelectedPipeline: (pipeline: DbCIPipeline | null) => void;
  setBuilds: (builds: DbBuildExecution[]) => void;
  addBuild: (build: DbBuildExecution) => void;
  updateBuild: (id: string, updates: Partial<DbBuildExecution>) => void;
  setPredictions: (predictions: DbCIPrediction[]) => void;
  setFlakyTests: (flakyTests: DbFlakyTest[]) => void;
  setConfig: (config: DbCIConfig | null) => void;
  setStats: (stats: CIDashboardStats | null) => void;
  setBuildTrend: (trend: AutonomousCIState['buildTrend']) => void;

  // UI State
  setViewMode: (mode: ViewMode) => void;
  setLoading: (loading: boolean) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setShowConfigModal: (show: boolean) => void;
  setShowCreatePipelineModal: (show: boolean) => void;

  // Filters
  setFilterStatus: (status: AutonomousCIState['filterStatus']) => void;
  setFilterActive: (active: boolean) => void;
  setDateRange: (range: AutonomousCIState['dateRange']) => void;

  // Preferences
  toggleSection: (section: string) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (seconds: number) => void;

  // Async actions
  fetchDashboard: (projectId: string) => Promise<void>;
  fetchPipelines: (projectId: string) => Promise<void>;
  fetchPipelineDetail: (pipelineId: string) => Promise<void>;
  fetchBuilds: (pipelineId: string, limit?: number) => Promise<void>;
  fetchRecentBuilds: (projectId: string, days?: number) => Promise<void>;
  fetchPredictions: (pipelineId: string) => Promise<void>;
  fetchFlakyTests: (projectId: string) => Promise<void>;
  fetchConfig: (projectId: string) => Promise<void>;

  createPipeline: (data: {
    projectId: string;
    name: string;
    description?: string;
    triggerType?: string;
    scheduleCron?: string;
  }) => Promise<DbCIPipeline | null>;

  updatePipelineConfig: (pipelineId: string, updates: Partial<DbCIPipeline>) => Promise<void>;
  deletePipeline: (pipelineId: string) => Promise<void>;

  startBuild: (pipelineId: string, projectId: string) => Promise<DbBuildExecution | null>;
  completeBuild: (buildId: string, result: {
    status: BuildStatus;
    durationMs: number;
    testCount?: number;
    testPassed?: number;
    testFailures?: number;
    testCoverage?: number;
  }) => Promise<void>;

  saveConfig: (projectId: string, config: Partial<DbCIConfig>) => Promise<void>;

  reset: () => void;
}

type AutonomousCIStore = AutonomousCIState & AutonomousCIActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AutonomousCIState = {
  pipelines: [],
  selectedPipelineId: null,
  selectedPipeline: null,
  builds: [],
  predictions: [],
  flakyTests: [],
  config: null,
  stats: null,
  buildTrend: [],

  viewMode: 'dashboard',
  loading: false,
  generating: false,
  error: null,
  showConfigModal: false,
  showCreatePipelineModal: false,

  filterStatus: 'all',
  filterActive: true,
  dateRange: 'week',

  expandedSections: [],
  autoRefresh: false,
  refreshInterval: 30,
};

// ============================================================================
// STORE
// ============================================================================

export const useAutonomousCIStore = create<AutonomousCIStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ===== SIMPLE SETTERS =====
      setPipelines: (pipelines) => set({ pipelines }),
      addPipeline: (pipeline) =>
        set((state) => ({ pipelines: [pipeline, ...state.pipelines] })),
      updatePipeline: (id, updates) =>
        set((state) => ({
          pipelines: state.pipelines.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          selectedPipeline:
            state.selectedPipeline?.id === id
              ? { ...state.selectedPipeline, ...updates }
              : state.selectedPipeline,
        })),
      removePipeline: (id) =>
        set((state) => ({
          pipelines: state.pipelines.filter((p) => p.id !== id),
          selectedPipelineId:
            state.selectedPipelineId === id ? null : state.selectedPipelineId,
          selectedPipeline:
            state.selectedPipeline?.id === id ? null : state.selectedPipeline,
        })),

      setSelectedPipelineId: (id) => set({ selectedPipelineId: id }),
      setSelectedPipeline: (pipeline) => set({ selectedPipeline: pipeline }),
      setBuilds: (builds) => set({ builds }),
      addBuild: (build) =>
        set((state) => ({ builds: [build, ...state.builds] })),
      updateBuild: (id, updates) =>
        set((state) => ({
          builds: state.builds.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        })),
      setPredictions: (predictions) => set({ predictions }),
      setFlakyTests: (flakyTests) => set({ flakyTests }),
      setConfig: (config) => set({ config }),
      setStats: (stats) => set({ stats }),
      setBuildTrend: (buildTrend) => set({ buildTrend }),

      setViewMode: (viewMode) => set({ viewMode }),
      setLoading: (loading) => set({ loading }),
      setGenerating: (generating) => set({ generating }),
      setError: (error) => set({ error }),
      setShowConfigModal: (showConfigModal) => set({ showConfigModal }),
      setShowCreatePipelineModal: (showCreatePipelineModal) =>
        set({ showCreatePipelineModal }),

      setFilterStatus: (filterStatus) => set({ filterStatus }),
      setFilterActive: (filterActive) => set({ filterActive }),
      setDateRange: (dateRange) => set({ dateRange }),

      toggleSection: (section) =>
        set((state) => ({
          expandedSections: state.expandedSections.includes(section)
            ? state.expandedSections.filter((s) => s !== section)
            : [...state.expandedSections, section],
        })),
      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),
      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),

      // ===== ASYNC ACTIONS =====
      fetchDashboard: async (projectId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(
            `/api/autonomous-ci?projectId=${projectId}&includeStats=true`
          );
          if (!response.ok) throw new Error('Failed to fetch CI dashboard');

          const data = await response.json();
          set({
            pipelines: data.pipelines || [],
            stats: data.stats || null,
            config: data.config || null,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      fetchPipelines: async (projectId) => {
        set({ loading: true, error: null });
        try {
          const activeOnly = get().filterActive;
          const response = await fetch(
            `/api/autonomous-ci?projectId=${projectId}&activeOnly=${activeOnly}`
          );
          if (!response.ok) throw new Error('Failed to fetch pipelines');

          const data = await response.json();
          set({ pipelines: data.pipelines || [], loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      fetchPipelineDetail: async (pipelineId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(
            `/api/autonomous-ci?pipelineId=${pipelineId}`
          );
          if (!response.ok) throw new Error('Failed to fetch pipeline');

          const data = await response.json();
          set({
            selectedPipeline: data.pipeline,
            selectedPipelineId: pipelineId,
            loading: false,
          });

          // Also fetch builds for this pipeline
          get().fetchBuilds(pipelineId);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      fetchBuilds: async (pipelineId, limit = 50) => {
        try {
          const response = await fetch(
            `/api/autonomous-ci/builds?pipelineId=${pipelineId}&limit=${limit}`
          );
          if (!response.ok) throw new Error('Failed to fetch builds');

          const data = await response.json();
          set({ builds: data.builds || [] });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      fetchRecentBuilds: async (projectId, days = 7) => {
        try {
          const response = await fetch(
            `/api/autonomous-ci/builds?projectId=${projectId}&days=${days}`
          );
          if (!response.ok) throw new Error('Failed to fetch recent builds');

          const data = await response.json();
          set({
            builds: data.builds || [],
            buildTrend: data.trend || [],
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      fetchPredictions: async (pipelineId) => {
        try {
          const response = await fetch(
            `/api/autonomous-ci/predictions?pipelineId=${pipelineId}`
          );
          if (!response.ok) throw new Error('Failed to fetch predictions');

          const data = await response.json();
          set({ predictions: data.predictions || [] });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      fetchFlakyTests: async (projectId) => {
        try {
          const response = await fetch(
            `/api/autonomous-ci/flaky-tests?projectId=${projectId}`
          );
          if (!response.ok) throw new Error('Failed to fetch flaky tests');

          const data = await response.json();
          set({ flakyTests: data.flakyTests || [] });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      fetchConfig: async (projectId) => {
        try {
          const response = await fetch(
            `/api/autonomous-ci/config?projectId=${projectId}`
          );
          if (!response.ok) throw new Error('Failed to fetch config');

          const data = await response.json();
          set({ config: data.config || null });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      createPipeline: async (data) => {
        set({ generating: true, error: null });
        try {
          const response = await fetch('/api/autonomous-ci', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) throw new Error('Failed to create pipeline');

          const result = await response.json();
          get().addPipeline(result.pipeline);
          set({ generating: false, showCreatePipelineModal: false });
          return result.pipeline;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            generating: false,
          });
          return null;
        }
      },

      updatePipelineConfig: async (pipelineId, updates) => {
        set({ generating: true, error: null });
        try {
          const response = await fetch('/api/autonomous-ci', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pipelineId, ...updates }),
          });

          if (!response.ok) throw new Error('Failed to update pipeline');

          const data = await response.json();
          get().updatePipeline(pipelineId, data.pipeline);
          set({ generating: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            generating: false,
          });
        }
      },

      deletePipeline: async (pipelineId) => {
        try {
          const response = await fetch('/api/autonomous-ci', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pipelineId }),
          });

          if (!response.ok) throw new Error('Failed to delete pipeline');

          get().removePipeline(pipelineId);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      startBuild: async (pipelineId, projectId) => {
        set({ generating: true, error: null });
        try {
          const response = await fetch('/api/autonomous-ci/builds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              pipelineId,
              trigger: 'manual',
              startImmediately: true,
            }),
          });

          if (!response.ok) throw new Error('Failed to start build');

          const data = await response.json();
          get().addBuild(data.build);
          set({ generating: false });
          return data.build;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            generating: false,
          });
          return null;
        }
      },

      completeBuild: async (buildId, result) => {
        try {
          const response = await fetch('/api/autonomous-ci/builds', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: buildId,
              action: 'complete',
              ...result,
            }),
          });

          if (!response.ok) throw new Error('Failed to complete build');

          const data = await response.json();
          get().updateBuild(buildId, data.build);

          // Update pipeline stats
          const build = data.build as DbBuildExecution;
          get().updatePipeline(build.pipeline_id, {
            last_build_status: result.status,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      saveConfig: async (projectId, config) => {
        set({ generating: true, error: null });
        try {
          const response = await fetch('/api/autonomous-ci/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, ...config }),
          });

          if (!response.ok) throw new Error('Failed to save config');

          const data = await response.json();
          set({ config: data.config, generating: false, showConfigModal: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            generating: false,
          });
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'autonomous-ci-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        filterStatus: state.filterStatus,
        filterActive: state.filterActive,
        dateRange: state.dateRange,
        expandedSections: state.expandedSections,
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
      }),
    }
  )
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useActivePipelines = () =>
  useAutonomousCIStore((state) =>
    state.filterActive
      ? state.pipelines.filter((p) => p.is_active === 1)
      : state.pipelines
  );

export const useFilteredPipelines = () =>
  useAutonomousCIStore((state) => {
    let filtered = state.pipelines;

    // Filter by active status
    if (state.filterActive) {
      filtered = filtered.filter((p) => p.is_active === 1);
    }

    // Filter by build status
    if (state.filterStatus !== 'all') {
      filtered = filtered.filter((p) => p.last_build_status === state.filterStatus);
    }

    return filtered;
  });

export const useCILoading = () =>
  useAutonomousCIStore((state) => state.loading || state.generating);

export const useCIStats = () =>
  useAutonomousCIStore((state) => state.stats);

export const useSelectedPipeline = () =>
  useAutonomousCIStore((state) => state.selectedPipeline);

export const usePipelineBuilds = () =>
  useAutonomousCIStore((state) => state.builds);

export const useBuildTrend = () =>
  useAutonomousCIStore((state) => state.buildTrend);
