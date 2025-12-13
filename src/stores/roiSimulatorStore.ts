/**
 * ROI Simulator Store
 * State management for development economics ROI simulation
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DbRefactoringEconomics,
  DbROISimulation,
  DbPortfolioOptimization,
  DbVelocityPrediction,
  DbDebtPaydownStrategy,
  ROISimulatorSummary,
  RefactoringCategory,
  RefactoringWithROI,
} from '@/app/db';

// ============================================================================
// TYPES
// ============================================================================

export type SimulationViewMode = 'dashboard' | 'refactorings' | 'simulations' | 'portfolio' | 'predictions' | 'strategies';
export type RefactoringFilter = {
  category: RefactoringCategory | 'all';
  status: DbRefactoringEconomics['status'] | 'all';
  minROI: number | null;
  maxPayback: number | null;
};

export interface ROISimulatorState {
  // View state
  viewMode: SimulationViewMode;
  selectedProjectId: string | null;

  // Data
  refactorings: RefactoringWithROI[];
  simulations: DbROISimulation[];
  portfolioOptimizations: DbPortfolioOptimization[];
  velocityPredictions: DbVelocityPrediction[];
  debtStrategies: DbDebtPaydownStrategy[];
  summary: ROISimulatorSummary | null;

  // Selection state
  selectedRefactoringIds: Set<string>;
  selectedSimulationId: string | null;
  selectedStrategyId: string | null;

  // Filters
  refactoringFilter: RefactoringFilter;

  // Loading/error states
  isLoading: boolean;
  isSimulating: boolean;
  error: string | null;

  // Simulation builder
  simulationBuilder: {
    name: string;
    description: string;
    type: DbROISimulation['simulation_type'];
    timeHorizon: number;
    teamSize: number;
    hourlyRate: number;
  };

  // Actions
  setViewMode: (mode: SimulationViewMode) => void;
  setSelectedProjectId: (projectId: string | null) => void;

  // Data loading
  loadRefactorings: (projectId: string) => Promise<void>;
  loadSimulations: (projectId: string) => Promise<void>;
  loadSummary: (projectId: string) => Promise<void>;
  loadPortfolioOptimizations: (projectId: string) => Promise<void>;
  loadVelocityPredictions: (projectId: string) => Promise<void>;
  loadDebtStrategies: (projectId: string) => Promise<void>;
  loadAll: (projectId: string) => Promise<void>;

  // Refactoring management
  createRefactoring: (data: Partial<DbRefactoringEconomics>) => Promise<DbRefactoringEconomics | null>;
  updateRefactoring: (id: string, updates: Partial<DbRefactoringEconomics>) => Promise<void>;
  deleteRefactoring: (id: string) => Promise<void>;
  toggleRefactoringSelection: (id: string) => void;
  selectAllRefactorings: () => void;
  clearRefactoringSelection: () => void;
  setRefactoringFilter: (filter: Partial<RefactoringFilter>) => void;

  // Simulation management
  createSimulation: () => Promise<DbROISimulation | null>;
  runSimulation: (simulationId: string) => Promise<void>;
  selectSimulation: (simulationId: string) => Promise<void>;
  deleteSimulation: (id: string) => Promise<void>;
  updateSimulationBuilder: (updates: Partial<ROISimulatorState['simulationBuilder']>) => void;

  // Portfolio optimization
  optimizePortfolio: (type: DbPortfolioOptimization['optimization_type'], budget: number) => Promise<DbPortfolioOptimization | null>;
  applyPortfolio: (portfolioId: string) => Promise<void>;

  // Debt strategy management
  createStrategy: (data: Partial<DbDebtPaydownStrategy>) => Promise<DbDebtPaydownStrategy | null>;
  activateStrategy: (strategyId: string) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;

  // Import from other sources
  importFromTechDebt: (techDebtIds: string[]) => Promise<number>;
  importFromIdeas: (ideaIds: string[]) => Promise<number>;

  // Utility
  getFilteredRefactorings: () => RefactoringWithROI[];
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  viewMode: 'dashboard' as SimulationViewMode,
  selectedProjectId: null,

  refactorings: [],
  simulations: [],
  portfolioOptimizations: [],
  velocityPredictions: [],
  debtStrategies: [],
  summary: null,

  selectedRefactoringIds: new Set<string>(),
  selectedSimulationId: null,
  selectedStrategyId: null,

  refactoringFilter: {
    category: 'all' as const,
    status: 'all' as const,
    minROI: null,
    maxPayback: null,
  },

  isLoading: false,
  isSimulating: false,
  error: null,

  simulationBuilder: {
    name: 'New Simulation',
    description: '',
    type: 'baseline' as const,
    timeHorizon: 12,
    teamSize: 5,
    hourlyRate: 100,
  },
};

// ============================================================================
// STORE
// ============================================================================

export const useROISimulatorStore = create<ROISimulatorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========================================
      // View Actions
      // ========================================

      setViewMode: (mode) => set({ viewMode: mode }),

      setSelectedProjectId: (projectId) => {
        set({ selectedProjectId: projectId });
        if (projectId) {
          get().loadAll(projectId);
        }
      },

      // ========================================
      // Data Loading
      // ========================================

      loadRefactorings: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/roi-simulator/refactorings?projectId=${projectId}`);
          if (!response.ok) throw new Error('Failed to load refactorings');
          const data = await response.json();
          set({ refactorings: data.refactorings || [], isLoading: false });
        } catch (error) {
          set({ error: String(error), isLoading: false });
        }
      },

      loadSimulations: async (projectId) => {
        try {
          const response = await fetch(`/api/roi-simulator/simulations?projectId=${projectId}`);
          if (!response.ok) throw new Error('Failed to load simulations');
          const data = await response.json();
          set({
            simulations: data.simulations || [],
            selectedSimulationId: data.simulations?.find((s: DbROISimulation) => s.is_selected)?.id || null
          });
        } catch (error) {
          set({ error: String(error) });
        }
      },

      loadSummary: async (projectId) => {
        try {
          const response = await fetch(`/api/roi-simulator/summary?projectId=${projectId}`);
          if (!response.ok) throw new Error('Failed to load summary');
          const data = await response.json();
          set({ summary: data.summary || null });
        } catch (error) {
          set({ error: String(error) });
        }
      },

      loadPortfolioOptimizations: async (projectId) => {
        try {
          const response = await fetch(`/api/roi-simulator/portfolio?projectId=${projectId}`);
          if (!response.ok) throw new Error('Failed to load portfolios');
          const data = await response.json();
          set({ portfolioOptimizations: data.portfolios || [] });
        } catch (error) {
          set({ error: String(error) });
        }
      },

      loadVelocityPredictions: async (projectId) => {
        try {
          const response = await fetch(`/api/roi-simulator/predictions?projectId=${projectId}`);
          if (!response.ok) throw new Error('Failed to load predictions');
          const data = await response.json();
          set({ velocityPredictions: data.predictions || [] });
        } catch (error) {
          set({ error: String(error) });
        }
      },

      loadDebtStrategies: async (projectId) => {
        try {
          const response = await fetch(`/api/roi-simulator/strategies?projectId=${projectId}`);
          if (!response.ok) throw new Error('Failed to load strategies');
          const data = await response.json();
          set({
            debtStrategies: data.strategies || [],
            selectedStrategyId: data.strategies?.find((s: DbDebtPaydownStrategy) => s.is_active)?.id || null
          });
        } catch (error) {
          set({ error: String(error) });
        }
      },

      loadAll: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          await Promise.all([
            get().loadRefactorings(projectId),
            get().loadSimulations(projectId),
            get().loadSummary(projectId),
            get().loadPortfolioOptimizations(projectId),
            get().loadVelocityPredictions(projectId),
            get().loadDebtStrategies(projectId),
          ]);
        } finally {
          set({ isLoading: false });
        }
      },

      // ========================================
      // Refactoring Management
      // ========================================

      createRefactoring: async (data) => {
        const { selectedProjectId } = get();
        if (!selectedProjectId) return null;

        try {
          const response = await fetch('/api/roi-simulator/refactorings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, project_id: selectedProjectId }),
          });
          if (!response.ok) throw new Error('Failed to create refactoring');
          const result = await response.json();
          await get().loadRefactorings(selectedProjectId);
          await get().loadSummary(selectedProjectId);
          return result.refactoring;
        } catch (error) {
          set({ error: String(error) });
          return null;
        }
      },

      updateRefactoring: async (id, updates) => {
        const { selectedProjectId } = get();
        try {
          const response = await fetch('/api/roi-simulator/refactorings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          if (!response.ok) throw new Error('Failed to update refactoring');
          if (selectedProjectId) {
            await get().loadRefactorings(selectedProjectId);
            await get().loadSummary(selectedProjectId);
          }
        } catch (error) {
          set({ error: String(error) });
        }
      },

      deleteRefactoring: async (id) => {
        const { selectedProjectId, selectedRefactoringIds } = get();
        try {
          const response = await fetch(`/api/roi-simulator/refactorings?id=${id}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete refactoring');

          // Remove from selection
          const newSelection = new Set(selectedRefactoringIds);
          newSelection.delete(id);
          set({ selectedRefactoringIds: newSelection });

          if (selectedProjectId) {
            await get().loadRefactorings(selectedProjectId);
            await get().loadSummary(selectedProjectId);
          }
        } catch (error) {
          set({ error: String(error) });
        }
      },

      toggleRefactoringSelection: (id) => {
        const { selectedRefactoringIds } = get();
        const newSelection = new Set(selectedRefactoringIds);
        if (newSelection.has(id)) {
          newSelection.delete(id);
        } else {
          newSelection.add(id);
        }
        set({ selectedRefactoringIds: newSelection });
      },

      selectAllRefactorings: () => {
        const filtered = get().getFilteredRefactorings();
        set({ selectedRefactoringIds: new Set(filtered.map(r => r.id)) });
      },

      clearRefactoringSelection: () => {
        set({ selectedRefactoringIds: new Set() });
      },

      setRefactoringFilter: (filter) => {
        set({ refactoringFilter: { ...get().refactoringFilter, ...filter } });
      },

      // ========================================
      // Simulation Management
      // ========================================

      createSimulation: async () => {
        const { selectedProjectId, simulationBuilder, selectedRefactoringIds, summary } = get();
        if (!selectedProjectId) return null;

        try {
          const response = await fetch('/api/roi-simulator/simulations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: selectedProjectId,
              name: simulationBuilder.name,
              description: simulationBuilder.description,
              simulation_type: simulationBuilder.type,
              time_horizon_months: simulationBuilder.timeHorizon,
              team_size: simulationBuilder.teamSize,
              average_hourly_rate: simulationBuilder.hourlyRate,
              selected_refactoring_ids: JSON.stringify(Array.from(selectedRefactoringIds)),
              current_health_score: summary?.portfolio?.averageROI || 50,
              current_debt_score: 50,
            }),
          });
          if (!response.ok) throw new Error('Failed to create simulation');
          const result = await response.json();
          await get().loadSimulations(selectedProjectId);
          return result.simulation;
        } catch (error) {
          set({ error: String(error) });
          return null;
        }
      },

      runSimulation: async (simulationId) => {
        set({ isSimulating: true });
        try {
          const response = await fetch('/api/roi-simulator/simulations/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulationId }),
          });
          if (!response.ok) throw new Error('Failed to run simulation');
          const { selectedProjectId } = get();
          if (selectedProjectId) {
            await get().loadSimulations(selectedProjectId);
          }
        } catch (error) {
          set({ error: String(error) });
        } finally {
          set({ isSimulating: false });
        }
      },

      selectSimulation: async (simulationId) => {
        try {
          const response = await fetch('/api/roi-simulator/simulations/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulationId }),
          });
          if (!response.ok) throw new Error('Failed to select simulation');
          set({ selectedSimulationId: simulationId });
          const { selectedProjectId } = get();
          if (selectedProjectId) {
            await get().loadSimulations(selectedProjectId);
          }
        } catch (error) {
          set({ error: String(error) });
        }
      },

      deleteSimulation: async (id) => {
        const { selectedProjectId } = get();
        try {
          const response = await fetch(`/api/roi-simulator/simulations?id=${id}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete simulation');
          if (selectedProjectId) {
            await get().loadSimulations(selectedProjectId);
          }
        } catch (error) {
          set({ error: String(error) });
        }
      },

      updateSimulationBuilder: (updates) => {
        set({ simulationBuilder: { ...get().simulationBuilder, ...updates } });
      },

      // ========================================
      // Portfolio Optimization
      // ========================================

      optimizePortfolio: async (type, budget) => {
        const { selectedProjectId, selectedRefactoringIds } = get();
        if (!selectedProjectId) return null;

        set({ isSimulating: true });
        try {
          const response = await fetch('/api/roi-simulator/portfolio/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: selectedProjectId,
              optimization_type: type,
              budget_constraint: budget,
              refactoring_ids: Array.from(selectedRefactoringIds),
            }),
          });
          if (!response.ok) throw new Error('Failed to optimize portfolio');
          const result = await response.json();
          await get().loadPortfolioOptimizations(selectedProjectId);
          return result.portfolio;
        } catch (error) {
          set({ error: String(error) });
          return null;
        } finally {
          set({ isSimulating: false });
        }
      },

      applyPortfolio: async (portfolioId) => {
        try {
          const response = await fetch('/api/roi-simulator/portfolio/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portfolioId }),
          });
          if (!response.ok) throw new Error('Failed to apply portfolio');
          const { selectedProjectId } = get();
          if (selectedProjectId) {
            await get().loadRefactorings(selectedProjectId);
            await get().loadPortfolioOptimizations(selectedProjectId);
          }
        } catch (error) {
          set({ error: String(error) });
        }
      },

      // ========================================
      // Debt Strategy Management
      // ========================================

      createStrategy: async (data) => {
        const { selectedProjectId } = get();
        if (!selectedProjectId) return null;

        try {
          const response = await fetch('/api/roi-simulator/strategies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, project_id: selectedProjectId }),
          });
          if (!response.ok) throw new Error('Failed to create strategy');
          const result = await response.json();
          await get().loadDebtStrategies(selectedProjectId);
          return result.strategy;
        } catch (error) {
          set({ error: String(error) });
          return null;
        }
      },

      activateStrategy: async (strategyId) => {
        try {
          const response = await fetch('/api/roi-simulator/strategies/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strategyId }),
          });
          if (!response.ok) throw new Error('Failed to activate strategy');
          set({ selectedStrategyId: strategyId });
          const { selectedProjectId } = get();
          if (selectedProjectId) {
            await get().loadDebtStrategies(selectedProjectId);
          }
        } catch (error) {
          set({ error: String(error) });
        }
      },

      deleteStrategy: async (id) => {
        const { selectedProjectId } = get();
        try {
          const response = await fetch(`/api/roi-simulator/strategies?id=${id}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete strategy');
          if (selectedProjectId) {
            await get().loadDebtStrategies(selectedProjectId);
          }
        } catch (error) {
          set({ error: String(error) });
        }
      },

      // ========================================
      // Import Functions
      // ========================================

      importFromTechDebt: async (techDebtIds) => {
        const { selectedProjectId } = get();
        if (!selectedProjectId) return 0;

        try {
          const response = await fetch('/api/roi-simulator/import/tech-debt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: selectedProjectId, techDebtIds }),
          });
          if (!response.ok) throw new Error('Failed to import tech debt');
          const result = await response.json();
          await get().loadRefactorings(selectedProjectId);
          await get().loadSummary(selectedProjectId);
          return result.imported || 0;
        } catch (error) {
          set({ error: String(error) });
          return 0;
        }
      },

      importFromIdeas: async (ideaIds) => {
        const { selectedProjectId } = get();
        if (!selectedProjectId) return 0;

        try {
          const response = await fetch('/api/roi-simulator/import/ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: selectedProjectId, ideaIds }),
          });
          if (!response.ok) throw new Error('Failed to import ideas');
          const result = await response.json();
          await get().loadRefactorings(selectedProjectId);
          await get().loadSummary(selectedProjectId);
          return result.imported || 0;
        } catch (error) {
          set({ error: String(error) });
          return 0;
        }
      },

      // ========================================
      // Utility
      // ========================================

      getFilteredRefactorings: () => {
        const { refactorings, refactoringFilter } = get();
        return refactorings.filter(r => {
          if (refactoringFilter.category !== 'all' && r.category !== refactoringFilter.category) {
            return false;
          }
          if (refactoringFilter.status !== 'all' && r.status !== refactoringFilter.status) {
            return false;
          }
          if (refactoringFilter.minROI !== null && r.roi_percentage < refactoringFilter.minROI) {
            return false;
          }
          if (refactoringFilter.maxPayback !== null && r.payback_months > refactoringFilter.maxPayback) {
            return false;
          }
          return true;
        });
      },

      clearError: () => set({ error: null }),

      reset: () => set({
        ...initialState,
        selectedRefactoringIds: new Set(),
      }),
    }),
    {
      name: 'roi-simulator-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        refactoringFilter: state.refactoringFilter,
        simulationBuilder: state.simulationBuilder,
      }),
    }
  )
);
