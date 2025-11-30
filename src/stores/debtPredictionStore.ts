/**
 * Debt Prediction Store
 * Manages state for the debt prediction and prevention system
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DbDebtPrediction,
  DbOpportunityCard,
  DbDebtPattern,
} from '@/app/db/models/debt-prediction.types';

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityCard {
  id: string;
  project_id: string;
  prediction_id: string;
  card_type: 'prevention' | 'quick-win' | 'warning' | 'suggestion';
  priority: number;
  title: string;
  summary: string;
  action_type: string;
  action_description: string;
  estimated_time_minutes: number;
  affected_files: string[];
  clicked: boolean;
  acted_upon: boolean;
}

export interface PredictionSummary {
  emerging: number;
  accelerating: number;
  imminent: number;
  exists: number;
  urgent: number;
}

export interface DebtStats {
  healthScore: number;
  predictions: {
    total: number;
    active: number;
    addressed: number;
    dismissed: number;
    urgent: number;
    accelerating: number;
    byType: PredictionSummary;
  };
  patterns: {
    total: number;
    predefined: number;
    learned: number;
    topPatterns: Array<{
      name: string;
      category: string;
      occurrenceCount: number;
      severity: string;
    }>;
  };
  opportunityCards: {
    active: number;
    helpfulRate: number;
  };
  prevention: {
    successRate: number;
    totalDebtPrevented: number;
  };
  trends: {
    filesIncreasing: number;
    filesStable: number;
    filesDecreasing: number;
  };
}

export type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';
export type FilterType = 'all' | 'emerging' | 'accelerating' | 'imminent' | 'exists' | 'urgent';

interface DebtPredictionState {
  // Predictions
  predictions: DbDebtPrediction[];
  selectedPredictionId: string | null;
  predictionFilter: FilterType;

  // Opportunity Cards
  opportunityCards: OpportunityCard[];
  showOpportunityPanel: boolean;

  // Patterns
  patterns: DbDebtPattern[];

  // Stats
  stats: DebtStats | null;

  // UI State
  scanStatus: ScanStatus;
  scanProgress: number;
  scanError: string | null;
  isEnabled: boolean;
  autoScanOnSave: boolean;

  // Actions
  setPredictions: (predictions: DbDebtPrediction[]) => void;
  addPrediction: (prediction: DbDebtPrediction) => void;
  updatePrediction: (id: string, updates: Partial<DbDebtPrediction>) => void;
  removePrediction: (id: string) => void;
  selectPrediction: (id: string | null) => void;
  setPredictionFilter: (filter: FilterType) => void;

  setOpportunityCards: (cards: OpportunityCard[]) => void;
  dismissCard: (id: string) => void;
  markCardActed: (id: string) => void;
  toggleOpportunityPanel: () => void;

  setPatterns: (patterns: DbDebtPattern[]) => void;

  setStats: (stats: DebtStats) => void;

  setScanStatus: (status: ScanStatus, error?: string) => void;
  setScanProgress: (progress: number) => void;
  setEnabled: (enabled: boolean) => void;
  setAutoScanOnSave: (enabled: boolean) => void;

  // API Actions
  fetchPredictions: (projectId: string) => Promise<void>;
  fetchStats: (projectId: string) => Promise<void>;
  scanProject: (projectId: string, projectPath: string) => Promise<void>;
  dismissPrediction: (id: string, reason: string) => Promise<void>;
  addressPrediction: (id: string) => Promise<void>;
  escalatePrediction: (id: string) => Promise<void>;

  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  predictions: [],
  selectedPredictionId: null,
  predictionFilter: 'all' as FilterType,
  opportunityCards: [],
  showOpportunityPanel: true,
  patterns: [],
  stats: null,
  scanStatus: 'idle' as ScanStatus,
  scanProgress: 0,
  scanError: null,
  isEnabled: true,
  autoScanOnSave: false,
};

// ============================================================================
// STORE
// ============================================================================

export const useDebtPredictionStore = create<DebtPredictionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // SYNCHRONOUS ACTIONS
      // ========================================================================

      setPredictions: (predictions) => set({ predictions }),

      addPrediction: (prediction) => set((state) => ({
        predictions: [...state.predictions, prediction],
      })),

      updatePrediction: (id, updates) => set((state) => ({
        predictions: state.predictions.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      })),

      removePrediction: (id) => set((state) => ({
        predictions: state.predictions.filter((p) => p.id !== id),
        selectedPredictionId: state.selectedPredictionId === id ? null : state.selectedPredictionId,
      })),

      selectPrediction: (id) => set({ selectedPredictionId: id }),

      setPredictionFilter: (filter) => set({ predictionFilter: filter }),

      setOpportunityCards: (cards) => set({
        opportunityCards: cards.map((c) => ({
          ...c,
          affected_files: typeof c.affected_files === 'string'
            ? JSON.parse(c.affected_files)
            : c.affected_files || [],
          clicked: !!c.clicked,
          acted_upon: !!c.acted_upon,
        })),
      }),

      dismissCard: (id) => set((state) => ({
        opportunityCards: state.opportunityCards.filter((c) => c.id !== id),
      })),

      markCardActed: (id) => set((state) => ({
        opportunityCards: state.opportunityCards.map((c) =>
          c.id === id ? { ...c, acted_upon: true } : c
        ),
      })),

      toggleOpportunityPanel: () => set((state) => ({
        showOpportunityPanel: !state.showOpportunityPanel,
      })),

      setPatterns: (patterns) => set({ patterns }),

      setStats: (stats) => set({ stats }),

      setScanStatus: (status, error) => set({
        scanStatus: status,
        scanError: error || null,
      }),

      setScanProgress: (progress) => set({ scanProgress: progress }),

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      setAutoScanOnSave: (enabled) => set({ autoScanOnSave: enabled }),

      reset: () => set(initialState),

      // ========================================================================
      // ASYNC API ACTIONS
      // ========================================================================

      fetchPredictions: async (projectId) => {
        try {
          const response = await fetch(
            `/api/debt-predictions?projectId=${projectId}&status=active`
          );

          if (!response.ok) {
            throw new Error('Failed to fetch predictions');
          }

          const data = await response.json();
          set({
            predictions: data.predictions || [],
            opportunityCards: (data.opportunityCards || []).map((c: any) => ({
              ...c,
              affected_files: typeof c.affected_files === 'string'
                ? JSON.parse(c.affected_files)
                : c.affected_files || [],
              clicked: !!c.clicked,
              acted_upon: !!c.acted_upon,
            })),
          });
        } catch (error) {
          console.error('[DebtPredictionStore] fetchPredictions error:', error);
        }
      },

      fetchStats: async (projectId) => {
        try {
          const response = await fetch(
            `/api/debt-predictions/stats?projectId=${projectId}`
          );

          if (!response.ok) {
            throw new Error('Failed to fetch stats');
          }

          const stats = await response.json();
          set({ stats });
        } catch (error) {
          console.error('[DebtPredictionStore] fetchStats error:', error);
        }
      },

      scanProject: async (projectId, projectPath) => {
        set({
          scanStatus: 'scanning',
          scanProgress: 0,
          scanError: null,
        });

        try {
          // Simulate progress
          const progressInterval = setInterval(() => {
            set((state) => ({
              scanProgress: Math.min(state.scanProgress + 10, 90),
            }));
          }, 500);

          const response = await fetch('/api/debt-predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, projectPath }),
          });

          clearInterval(progressInterval);

          if (!response.ok) {
            throw new Error('Failed to scan project');
          }

          const data = await response.json();

          set({
            predictions: data.predictions || [],
            opportunityCards: (data.opportunityCards || []).map((c: any) => ({
              id: `temp-${Date.now()}-${Math.random()}`,
              project_id: projectId,
              prediction_id: '',
              card_type: c.cardType,
              priority: c.priority,
              title: c.title,
              summary: c.summary,
              action_type: c.actionType,
              action_description: c.actionDescription,
              estimated_time_minutes: c.estimatedTimeMinutes,
              affected_files: [],
              clicked: false,
              acted_upon: false,
            })),
            scanStatus: 'completed',
            scanProgress: 100,
          });

          // Fetch updated stats
          get().fetchStats(projectId);
        } catch (error) {
          set({
            scanStatus: 'error',
            scanError: error instanceof Error ? error.message : 'Unknown error',
            scanProgress: 0,
          });
        }
      },

      dismissPrediction: async (id, reason) => {
        try {
          const response = await fetch(`/api/debt-predictions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dismiss', reason }),
          });

          if (!response.ok) {
            throw new Error('Failed to dismiss prediction');
          }

          get().removePrediction(id);
        } catch (error) {
          console.error('[DebtPredictionStore] dismissPrediction error:', error);
        }
      },

      addressPrediction: async (id) => {
        try {
          const response = await fetch(`/api/debt-predictions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'address' }),
          });

          if (!response.ok) {
            throw new Error('Failed to address prediction');
          }

          get().removePrediction(id);
        } catch (error) {
          console.error('[DebtPredictionStore] addressPrediction error:', error);
        }
      },

      escalatePrediction: async (id) => {
        try {
          const response = await fetch(`/api/debt-predictions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'escalate' }),
          });

          if (!response.ok) {
            throw new Error('Failed to escalate prediction');
          }

          get().updatePrediction(id, { status: 'escalated' });
        } catch (error) {
          console.error('[DebtPredictionStore] escalatePrediction error:', error);
        }
      },
    }),
    {
      name: 'debt-prediction-storage',
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        autoScanOnSave: state.autoScanOnSave,
        showOpportunityPanel: state.showOpportunityPanel,
        predictionFilter: state.predictionFilter,
      }),
    }
  )
);
