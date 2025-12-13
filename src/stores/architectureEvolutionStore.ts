/**
 * Architecture Evolution Store
 * Zustand store for Living Architecture Evolution Graph state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DbArchitectureNode,
  DbArchitectureEdge,
  DbArchitectureDrift,
  DbArchitectureSuggestion,
  DbArchitectureIdeal,
  DbArchitectureSnapshot,
} from '@/app/db/models/architecture-graph.types';

// Graph visualization settings
interface GraphSettings {
  showLabels: boolean;
  showEdgeLabels: boolean;
  highlightCircular: boolean;
  groupByLayer: boolean;
  filterByType: string | null;
  filterByLayer: string | null;
}

// Selected node/edge state
interface Selection {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
}

// Analysis state
interface AnalysisState {
  isAnalyzing: boolean;
  lastAnalyzedAt: string | null;
  analysisProgress: number;
  analysisError: string | null;
}

// Main store state
interface ArchitectureEvolutionState {
  // Data
  nodes: DbArchitectureNode[];
  edges: DbArchitectureEdge[];
  drifts: DbArchitectureDrift[];
  suggestions: DbArchitectureSuggestion[];
  ideals: DbArchitectureIdeal[];
  snapshots: DbArchitectureSnapshot[];

  // Stats
  stats: {
    totalNodes: number;
    activeNodes: number;
    totalEdges: number;
    circularCount: number;
    avgComplexity: number;
    avgCoupling: number;
    byLayer: Record<string, number>;
    byType: Record<string, number>;
    driftCounts: Record<string, number>;
  };

  // UI State
  settings: GraphSettings;
  selection: Selection;
  analysis: AnalysisState;
  activeTab: 'graph' | 'drifts' | 'suggestions' | 'ideals' | 'history';
  viewMode: 'graph' | 'table' | 'tree';

  // Actions
  setNodes: (nodes: DbArchitectureNode[]) => void;
  setEdges: (edges: DbArchitectureEdge[]) => void;
  setDrifts: (drifts: DbArchitectureDrift[]) => void;
  setSuggestions: (suggestions: DbArchitectureSuggestion[]) => void;
  setIdeals: (ideals: DbArchitectureIdeal[]) => void;
  setSnapshots: (snapshots: DbArchitectureSnapshot[]) => void;
  setStats: (stats: Partial<ArchitectureEvolutionState['stats']>) => void;

  // Selection actions
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  clearSelection: () => void;

  // Settings actions
  updateSettings: (settings: Partial<GraphSettings>) => void;

  // Analysis actions
  setAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisProgress: (progress: number) => void;
  setAnalysisError: (error: string | null) => void;
  setLastAnalyzedAt: (timestamp: string) => void;

  // Tab/view actions
  setActiveTab: (tab: ArchitectureEvolutionState['activeTab']) => void;
  setViewMode: (mode: ArchitectureEvolutionState['viewMode']) => void;

  // Data fetching
  fetchGraph: (projectId: string) => Promise<void>;
  fetchDrifts: (projectId: string) => Promise<void>;
  fetchSuggestions: (projectId: string) => Promise<void>;
  fetchIdeals: (projectId: string) => Promise<void>;
  fetchSnapshots: (projectId: string) => Promise<void>;
  fetchAll: (projectId: string) => Promise<void>;

  // Analysis
  analyzeProject: (projectId: string, includeAI?: boolean) => Promise<void>;

  // Drift actions
  updateDriftStatus: (id: string, status: string) => Promise<void>;

  // Suggestion actions
  updateSuggestionStatus: (id: string, status: string, feedback?: string) => Promise<void>;

  // Snapshot actions
  createSnapshot: (projectId: string, name: string, description?: string) => Promise<void>;

  // Reset
  reset: () => void;
}

const initialStats = {
  totalNodes: 0,
  activeNodes: 0,
  totalEdges: 0,
  circularCount: 0,
  avgComplexity: 0,
  avgCoupling: 0,
  byLayer: {},
  byType: {},
  driftCounts: {},
};

const initialSettings: GraphSettings = {
  showLabels: true,
  showEdgeLabels: false,
  highlightCircular: true,
  groupByLayer: true,
  filterByType: null,
  filterByLayer: null,
};

const initialSelection: Selection = {
  selectedNodeId: null,
  selectedEdgeId: null,
  hoveredNodeId: null,
};

const initialAnalysis: AnalysisState = {
  isAnalyzing: false,
  lastAnalyzedAt: null,
  analysisProgress: 0,
  analysisError: null,
};

export const useArchitectureEvolutionStore = create<ArchitectureEvolutionState>()(
  persist(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      drifts: [],
      suggestions: [],
      ideals: [],
      snapshots: [],
      stats: initialStats,
      settings: initialSettings,
      selection: initialSelection,
      analysis: initialAnalysis,
      activeTab: 'graph',
      viewMode: 'graph',

      // Setters
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setDrifts: (drifts) => set({ drifts }),
      setSuggestions: (suggestions) => set({ suggestions }),
      setIdeals: (ideals) => set({ ideals }),
      setSnapshots: (snapshots) => set({ snapshots }),
      setStats: (newStats) => set((state) => ({
        stats: { ...state.stats, ...newStats },
      })),

      // Selection
      selectNode: (nodeId) => set((state) => ({
        selection: { ...state.selection, selectedNodeId: nodeId, selectedEdgeId: null },
      })),
      selectEdge: (edgeId) => set((state) => ({
        selection: { ...state.selection, selectedEdgeId: edgeId, selectedNodeId: null },
      })),
      setHoveredNode: (nodeId) => set((state) => ({
        selection: { ...state.selection, hoveredNodeId: nodeId },
      })),
      clearSelection: () => set({ selection: initialSelection }),

      // Settings
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),

      // Analysis state
      setAnalyzing: (isAnalyzing) => set((state) => ({
        analysis: { ...state.analysis, isAnalyzing },
      })),
      setAnalysisProgress: (progress) => set((state) => ({
        analysis: { ...state.analysis, analysisProgress: progress },
      })),
      setAnalysisError: (error) => set((state) => ({
        analysis: { ...state.analysis, analysisError: error },
      })),
      setLastAnalyzedAt: (timestamp) => set((state) => ({
        analysis: { ...state.analysis, lastAnalyzedAt: timestamp },
      })),

      // Tab/view
      setActiveTab: (activeTab) => set({ activeTab }),
      setViewMode: (viewMode) => set({ viewMode }),

      // Data fetching
      fetchGraph: async (projectId) => {
        try {
          const response = await fetch(`/api/architecture-graph?projectId=${projectId}&resource=graph`);
          if (!response.ok) throw new Error('Failed to fetch graph');

          const data = await response.json();
          set({
            nodes: data.nodes || [],
            edges: data.edges || [],
            stats: {
              ...get().stats,
              totalNodes: data.stats?.totalNodes || 0,
              activeNodes: data.stats?.activeNodes || 0,
              totalEdges: data.stats?.totalEdges || 0,
              circularCount: data.stats?.circularCount || 0,
              avgComplexity: data.stats?.avgComplexity || 0,
              avgCoupling: data.stats?.avgCoupling || 0,
              byLayer: data.stats?.byLayer || {},
              byType: data.stats?.byType || {},
            },
          });
        } catch (error) {
          console.error('Error fetching graph:', error);
        }
      },

      fetchDrifts: async (projectId) => {
        try {
          const response = await fetch(`/api/architecture-graph?projectId=${projectId}&resource=drifts`);
          if (!response.ok) throw new Error('Failed to fetch drifts');

          const data = await response.json();
          set({
            drifts: data.drifts || [],
            stats: { ...get().stats, driftCounts: data.counts || {} },
          });
        } catch (error) {
          console.error('Error fetching drifts:', error);
        }
      },

      fetchSuggestions: async (projectId) => {
        try {
          const response = await fetch(`/api/architecture-graph?projectId=${projectId}&resource=suggestions`);
          if (!response.ok) throw new Error('Failed to fetch suggestions');

          const data = await response.json();
          set({ suggestions: data.suggestions || [] });
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      },

      fetchIdeals: async (projectId) => {
        try {
          const response = await fetch(`/api/architecture-graph?projectId=${projectId}&resource=ideals`);
          if (!response.ok) throw new Error('Failed to fetch ideals');

          const data = await response.json();
          set({ ideals: data.ideals || [] });
        } catch (error) {
          console.error('Error fetching ideals:', error);
        }
      },

      fetchSnapshots: async (projectId) => {
        try {
          const response = await fetch(`/api/architecture-graph?projectId=${projectId}&resource=snapshots`);
          if (!response.ok) throw new Error('Failed to fetch snapshots');

          const data = await response.json();
          set({ snapshots: data.snapshots || [] });
        } catch (error) {
          console.error('Error fetching snapshots:', error);
        }
      },

      fetchAll: async (projectId) => {
        await Promise.all([
          get().fetchGraph(projectId),
          get().fetchDrifts(projectId),
          get().fetchSuggestions(projectId),
          get().fetchIdeals(projectId),
          get().fetchSnapshots(projectId),
        ]);
      },

      // Analysis
      analyzeProject: async (projectId, includeAI = false) => {
        set((state) => ({
          analysis: {
            ...state.analysis,
            isAnalyzing: true,
            analysisProgress: 0,
            analysisError: null,
          },
        }));

        try {
          const response = await fetch('/api/architecture-graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              action: 'analyze',
              data: { includeAI },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Analysis failed');
          }

          const result = await response.json();

          set((state) => ({
            analysis: {
              ...state.analysis,
              isAnalyzing: false,
              analysisProgress: 100,
              lastAnalyzedAt: new Date().toISOString(),
            },
          }));

          // Refresh data
          await get().fetchAll(projectId);

          return result;
        } catch (error) {
          set((state) => ({
            analysis: {
              ...state.analysis,
              isAnalyzing: false,
              analysisError: error instanceof Error ? error.message : 'Analysis failed',
            },
          }));
          throw error;
        }
      },

      // Drift actions
      updateDriftStatus: async (id, status) => {
        try {
          const response = await fetch('/api/architecture-graph', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resource: 'drift',
              id,
              updates: { status },
            }),
          });

          if (!response.ok) throw new Error('Failed to update drift');

          const data = await response.json();
          set((state) => ({
            drifts: state.drifts.map((d) => (d.id === id ? data.drift : d)),
          }));
        } catch (error) {
          console.error('Error updating drift:', error);
        }
      },

      // Suggestion actions
      updateSuggestionStatus: async (id, status, feedback) => {
        try {
          const response = await fetch('/api/architecture-graph', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resource: 'suggestion',
              id,
              updates: { status, feedback },
            }),
          });

          if (!response.ok) throw new Error('Failed to update suggestion');

          const data = await response.json();
          set((state) => ({
            suggestions: state.suggestions.map((s) => (s.id === id ? data.suggestion : s)),
          }));
        } catch (error) {
          console.error('Error updating suggestion:', error);
        }
      },

      // Snapshot actions
      createSnapshot: async (projectId, name, description) => {
        try {
          const response = await fetch('/api/architecture-graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              action: 'snapshot',
              data: { name, description },
            }),
          });

          if (!response.ok) throw new Error('Failed to create snapshot');

          const data = await response.json();
          set((state) => ({
            snapshots: [data.snapshot, ...state.snapshots],
          }));
        } catch (error) {
          console.error('Error creating snapshot:', error);
        }
      },

      // Reset
      reset: () => set({
        nodes: [],
        edges: [],
        drifts: [],
        suggestions: [],
        ideals: [],
        snapshots: [],
        stats: initialStats,
        selection: initialSelection,
        analysis: initialAnalysis,
      }),
    }),
    {
      name: 'architecture-evolution-store',
      partialize: (state) => ({
        settings: state.settings,
        activeTab: state.activeTab,
        viewMode: state.viewMode,
      }),
    }
  )
);

// Selectors
export const selectActiveNodes = (state: ArchitectureEvolutionState) =>
  state.nodes.filter((n) => n.is_active === 1);

export const selectCircularEdges = (state: ArchitectureEvolutionState) =>
  state.edges.filter((e) => e.is_circular === 1);

export const selectActiveDrifts = (state: ArchitectureEvolutionState) =>
  state.drifts.filter((d) => d.status === 'active');

export const selectPendingSuggestions = (state: ArchitectureEvolutionState) =>
  state.suggestions.filter((s) => s.status === 'pending');

export const selectNodeById = (state: ArchitectureEvolutionState, nodeId: string) =>
  state.nodes.find((n) => n.id === nodeId);

export const selectNodeConnections = (state: ArchitectureEvolutionState, nodeId: string) => ({
  outgoing: state.edges.filter((e) => e.source_node_id === nodeId),
  incoming: state.edges.filter((e) => e.target_node_id === nodeId),
});

export const selectFilteredNodes = (state: ArchitectureEvolutionState) => {
  let filtered = state.nodes.filter((n) => n.is_active === 1);

  if (state.settings.filterByLayer) {
    filtered = filtered.filter((n) => n.layer === state.settings.filterByLayer);
  }

  if (state.settings.filterByType) {
    filtered = filtered.filter((n) => n.node_type === state.settings.filterByType);
  }

  return filtered;
};
