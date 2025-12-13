/**
 * Strategic Roadmap Store
 *
 * Manages state for the 6-month development roadmap engine
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DbStrategicInitiative,
  DbRoadmapMilestone,
  DbImpactPrediction,
  DbFeatureInteraction,
  DbRoadmapSimulation,
  RoadmapSummary,
} from '@/app/db/models/strategic-roadmap.types';

// ============================================================================
// TYPES
// ============================================================================

export type ViewMode = 'timeline' | 'kanban' | 'calendar' | 'matrix';
export type FilterType = 'all' | 'feature' | 'refactoring' | 'debt_reduction' | 'security' | 'performance' | 'infrastructure';

interface RoadmapState {
  // Data
  summary: RoadmapSummary | null;
  initiatives: DbStrategicInitiative[];
  milestones: DbRoadmapMilestone[];
  predictions: DbImpactPrediction[];
  interactions: DbFeatureInteraction[];
  simulations: DbRoadmapSimulation[];
  selectedSimulation: DbRoadmapSimulation | null;

  // Selection
  selectedInitiativeId: string | null;
  selectedMilestoneId: string | null;

  // UI State
  viewMode: ViewMode;
  filterType: FilterType;
  showPredictions: boolean;
  showInteractions: boolean;
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;

  // Persisted preferences
  expandedMonths: number[];
  showQuarterView: boolean;
}

interface RoadmapActions {
  // Data setters
  setSummary: (summary: RoadmapSummary | null) => void;
  setInitiatives: (initiatives: DbStrategicInitiative[]) => void;
  addInitiative: (initiative: DbStrategicInitiative) => void;
  updateInitiative: (id: string, updates: Partial<DbStrategicInitiative>) => void;
  removeInitiative: (id: string) => void;
  setMilestones: (milestones: DbRoadmapMilestone[]) => void;
  setPredictions: (predictions: DbImpactPrediction[]) => void;
  setInteractions: (interactions: DbFeatureInteraction[]) => void;
  setSimulations: (simulations: DbRoadmapSimulation[]) => void;
  setSelectedSimulation: (simulation: DbRoadmapSimulation | null) => void;

  // Selection
  selectInitiative: (id: string | null) => void;
  selectMilestone: (id: string | null) => void;

  // UI State
  setViewMode: (mode: ViewMode) => void;
  setFilterType: (filter: FilterType) => void;
  togglePredictions: () => void;
  toggleInteractions: () => void;
  setGenerating: (generating: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Preferences
  toggleMonth: (month: number) => void;
  toggleQuarterView: () => void;

  // API Actions
  fetchRoadmap: (projectId: string) => Promise<void>;
  fetchInitiatives: (projectId: string) => Promise<void>;
  fetchMilestones: (projectId: string) => Promise<void>;
  fetchPredictions: (projectId: string) => Promise<void>;
  fetchInteractions: (projectId: string) => Promise<void>;
  fetchSimulations: (projectId: string) => Promise<void>;
  generateRoadmap: (projectId: string, options?: GenerateOptions) => Promise<void>;
  createInitiative: (projectId: string, data: InitiativeInput) => Promise<DbStrategicInitiative | null>;
  updateInitiativeStatus: (id: string, status: DbStrategicInitiative['status']) => Promise<void>;
  deleteInitiative: (id: string) => Promise<void>;

  // Reset
  reset: () => void;
}

interface GenerateOptions {
  includeDebt?: boolean;
  includeIdeas?: boolean;
  includeGoals?: boolean;
  horizonMonths?: number;
  debtReductionWeight?: number;
  velocityWeight?: number;
  riskWeight?: number;
}

interface InitiativeInput {
  title: string;
  description: string;
  initiativeType: DbStrategicInitiative['initiative_type'];
  priority?: number;
  targetQuarter: string;
  targetMonth?: number;
  estimatedEffortHours?: number;
  estimatedComplexity?: DbStrategicInitiative['estimated_complexity'];
}

type RoadmapStore = RoadmapState & RoadmapActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: RoadmapState = {
  summary: null,
  initiatives: [],
  milestones: [],
  predictions: [],
  interactions: [],
  simulations: [],
  selectedSimulation: null,
  selectedInitiativeId: null,
  selectedMilestoneId: null,
  viewMode: 'timeline',
  filterType: 'all',
  showPredictions: true,
  showInteractions: true,
  isGenerating: false,
  isLoading: false,
  error: null,
  expandedMonths: [1, 2, 3],
  showQuarterView: false,
};

// ============================================================================
// STORE
// ============================================================================

export const useStrategicRoadmapStore = create<RoadmapStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Data setters
      setSummary: (summary) => set({ summary }),
      setInitiatives: (initiatives) => set({ initiatives }),
      addInitiative: (initiative) => set((state) => ({
        initiatives: [...state.initiatives, initiative],
      })),
      updateInitiative: (id, updates) => set((state) => ({
        initiatives: state.initiatives.map((i) =>
          i.id === id ? { ...i, ...updates } : i
        ),
      })),
      removeInitiative: (id) => set((state) => ({
        initiatives: state.initiatives.filter((i) => i.id !== id),
        selectedInitiativeId: state.selectedInitiativeId === id ? null : state.selectedInitiativeId,
      })),
      setMilestones: (milestones) => set({ milestones }),
      setPredictions: (predictions) => set({ predictions }),
      setInteractions: (interactions) => set({ interactions }),
      setSimulations: (simulations) => set({ simulations }),
      setSelectedSimulation: (selectedSimulation) => set({ selectedSimulation }),

      // Selection
      selectInitiative: (selectedInitiativeId) => set({ selectedInitiativeId }),
      selectMilestone: (selectedMilestoneId) => set({ selectedMilestoneId }),

      // UI State
      setViewMode: (viewMode) => set({ viewMode }),
      setFilterType: (filterType) => set({ filterType }),
      togglePredictions: () => set((state) => ({ showPredictions: !state.showPredictions })),
      toggleInteractions: () => set((state) => ({ showInteractions: !state.showInteractions })),
      setGenerating: (isGenerating) => set({ isGenerating }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Preferences
      toggleMonth: (month) => set((state) => ({
        expandedMonths: state.expandedMonths.includes(month)
          ? state.expandedMonths.filter((m) => m !== month)
          : [...state.expandedMonths, month],
      })),
      toggleQuarterView: () => set((state) => ({ showQuarterView: !state.showQuarterView })),

      // API Actions
      fetchRoadmap: async (projectId) => {
        const { setLoading, setError, setSummary } = get();
        setLoading(true);
        setError(null);

        try {
          const res = await fetch(`/api/strategic-roadmap?projectId=${projectId}&type=summary`);
          if (!res.ok) throw new Error('Failed to fetch roadmap');

          const data = await res.json();
          setSummary(data.summary);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
          setLoading(false);
        }
      },

      fetchInitiatives: async (projectId) => {
        const { setLoading, setError, setInitiatives } = get();
        setLoading(true);

        try {
          const res = await fetch(`/api/strategic-roadmap?projectId=${projectId}&type=initiatives`);
          if (!res.ok) throw new Error('Failed to fetch initiatives');

          const data = await res.json();
          setInitiatives(data.initiatives || []);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
          setLoading(false);
        }
      },

      fetchMilestones: async (projectId) => {
        const { setMilestones, setError } = get();

        try {
          const res = await fetch(`/api/strategic-roadmap/milestones?projectId=${projectId}`);
          if (!res.ok) throw new Error('Failed to fetch milestones');

          const data = await res.json();
          setMilestones(data.milestones || []);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        }
      },

      fetchPredictions: async (projectId) => {
        const { setPredictions, setError } = get();

        try {
          const res = await fetch(`/api/strategic-roadmap/predictions?projectId=${projectId}`);
          if (!res.ok) throw new Error('Failed to fetch predictions');

          const data = await res.json();
          setPredictions(data.predictions || []);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        }
      },

      fetchInteractions: async (projectId) => {
        const { setInteractions, setError } = get();

        try {
          const res = await fetch(`/api/strategic-roadmap/interactions?projectId=${projectId}`);
          if (!res.ok) throw new Error('Failed to fetch interactions');

          const data = await res.json();
          setInteractions(data.interactions || []);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        }
      },

      fetchSimulations: async (projectId) => {
        const { setSimulations, setSelectedSimulation, setError } = get();

        try {
          const res = await fetch(`/api/strategic-roadmap/simulations?projectId=${projectId}`);
          if (!res.ok) throw new Error('Failed to fetch simulations');

          const data = await res.json();
          setSimulations(data.simulations || []);

          // Set selected simulation
          const selected = (data.simulations || []).find((s: DbRoadmapSimulation) => s.is_selected === 1);
          if (selected) {
            setSelectedSimulation(selected);
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        }
      },

      generateRoadmap: async (projectId, options = {}) => {
        const {
          setGenerating,
          setError,
          fetchRoadmap,
          fetchInitiatives,
          fetchMilestones,
          fetchPredictions,
          fetchInteractions,
          fetchSimulations,
        } = get();

        setGenerating(true);
        setError(null);

        try {
          const res = await fetch('/api/strategic-roadmap/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, options }),
          });

          if (!res.ok) throw new Error('Failed to generate roadmap');

          // Refresh all data
          await Promise.all([
            fetchRoadmap(projectId),
            fetchInitiatives(projectId),
            fetchMilestones(projectId),
            fetchPredictions(projectId),
            fetchInteractions(projectId),
            fetchSimulations(projectId),
          ]);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
          setGenerating(false);
        }
      },

      createInitiative: async (projectId, data) => {
        const { addInitiative, setError } = get();

        try {
          const res = await fetch('/api/strategic-roadmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, ...data }),
          });

          if (!res.ok) throw new Error('Failed to create initiative');

          const { initiative } = await res.json();
          addInitiative(initiative);
          return initiative;
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
          return null;
        }
      },

      updateInitiativeStatus: async (id, status) => {
        const { updateInitiative, setError } = get();

        try {
          const res = await fetch('/api/strategic-roadmap', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
          });

          if (!res.ok) throw new Error('Failed to update initiative');

          updateInitiative(id, { status });
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        }
      },

      deleteInitiative: async (id) => {
        const { removeInitiative, setError } = get();

        try {
          const res = await fetch(`/api/strategic-roadmap?id=${id}`, {
            method: 'DELETE',
          });

          if (!res.ok) throw new Error('Failed to delete initiative');

          removeInitiative(id);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        }
      },

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'strategic-roadmap-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        filterType: state.filterType,
        showPredictions: state.showPredictions,
        showInteractions: state.showInteractions,
        expandedMonths: state.expandedMonths,
        showQuarterView: state.showQuarterView,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const useFilteredInitiatives = () => {
  const { initiatives, filterType } = useStrategicRoadmapStore();

  if (filterType === 'all') return initiatives;
  return initiatives.filter((i) => i.initiative_type === filterType);
};

export const useInitiativesByMonth = () => {
  const initiatives = useFilteredInitiatives();

  return initiatives.reduce((acc, initiative) => {
    const month = initiative.target_month;
    if (!acc[month]) acc[month] = [];
    acc[month].push(initiative);
    return acc;
  }, {} as Record<number, DbStrategicInitiative[]>);
};

export const useSelectedInitiative = () => {
  const { initiatives, selectedInitiativeId } = useStrategicRoadmapStore();
  if (!selectedInitiativeId) return null;
  return initiatives.find((i) => i.id === selectedInitiativeId) || null;
};

export const useInitiativePredictions = (initiativeId: string | null) => {
  const { predictions } = useStrategicRoadmapStore();
  if (!initiativeId) return [];
  return predictions.filter((p) => p.subject_id === initiativeId);
};

export const useInitiativeInteractions = (initiativeId: string | null) => {
  const { interactions } = useStrategicRoadmapStore();
  if (!initiativeId) return [];
  return interactions.filter(
    (i) => i.feature_a_id === initiativeId || i.feature_b_id === initiativeId
  );
};
