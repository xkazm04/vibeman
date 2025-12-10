/**
 * Shared types for debt prediction store slices
 */

import type {
  DbDebtPrediction,
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

// ============================================================================
// SLICE STATE INTERFACES
// ============================================================================

export interface PredictionsSlice {
  predictions: DbDebtPrediction[];
  selectedPredictionId: string | null;
  predictionFilter: FilterType;

  setPredictions: (predictions: DbDebtPrediction[]) => void;
  addPrediction: (prediction: DbDebtPrediction) => void;
  updatePrediction: (id: string, updates: Partial<DbDebtPrediction>) => void;
  removePrediction: (id: string) => void;
  selectPrediction: (id: string | null) => void;
  setPredictionFilter: (filter: FilterType) => void;
}

export interface OpportunityCardsSlice {
  opportunityCards: OpportunityCard[];
  showOpportunityPanel: boolean;

  setOpportunityCards: (cards: OpportunityCard[]) => void;
  dismissCard: (id: string) => void;
  markCardActed: (id: string) => void;
  toggleOpportunityPanel: () => void;
}

export interface StatsSlice {
  stats: DebtStats | null;
  patterns: DbDebtPattern[];

  setStats: (stats: DebtStats) => void;
  setPatterns: (patterns: DbDebtPattern[]) => void;
}

export interface ScanSlice {
  scanStatus: ScanStatus;
  scanProgress: number;
  scanError: string | null;
  isEnabled: boolean;
  autoScanOnSave: boolean;

  setScanStatus: (status: ScanStatus, error?: string) => void;
  setScanProgress: (progress: number) => void;
  setEnabled: (enabled: boolean) => void;
  setAutoScanOnSave: (enabled: boolean) => void;
}

export interface ApiActionsSlice {
  fetchPredictions: (projectId: string) => Promise<void>;
  fetchStats: (projectId: string) => Promise<void>;
  scanProject: (projectId: string, projectPath: string) => Promise<void>;
  dismissPrediction: (id: string, reason: string) => Promise<void>;
  addressPrediction: (id: string) => Promise<void>;
  escalatePrediction: (id: string) => Promise<void>;
  reset: () => void;
}

// Combined store type
export type DebtPredictionState = PredictionsSlice & OpportunityCardsSlice & StatsSlice & ScanSlice & ApiActionsSlice;

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialState = {
  predictions: [] as DbDebtPrediction[],
  selectedPredictionId: null as string | null,
  predictionFilter: 'all' as FilterType,
  opportunityCards: [] as OpportunityCard[],
  showOpportunityPanel: true,
  patterns: [] as DbDebtPattern[],
  stats: null as DebtStats | null,
  scanStatus: 'idle' as ScanStatus,
  scanProgress: 0,
  scanError: null as string | null,
  isEnabled: true,
  autoScanOnSave: false,
};
