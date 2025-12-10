/**
 * Debt Prediction Store
 *
 * Manages state for the debt prediction and prevention system using composable slices.
 * Split into focused sub-stores for better maintainability:
 * - predictionsSlice: Predictions list and selection
 * - opportunityCardsSlice: Opportunity cards management
 * - statsSlice: Statistics and patterns
 * - scanSlice: Scan status and settings
 * - apiActionsSlice: Async operations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  createPredictionsSlice,
  createOpportunityCardsSlice,
  createStatsSlice,
  createScanSlice,
  createApiActionsSlice,
} from './slices/debtPrediction';

import type { DebtPredictionState } from './slices/debtPrediction/types';

// Re-export types for backward compatibility
export type {
  OpportunityCard,
  PredictionSummary,
  DebtStats,
  ScanStatus,
  FilterType,
} from './slices/debtPrediction/types';

export const useDebtPredictionStore = create<DebtPredictionState>()(
  persist(
    (set, get, api) => ({
      // Compose all slices
      ...createPredictionsSlice(set, get, api),
      ...createOpportunityCardsSlice(set, get, api),
      ...createStatsSlice(set, get, api),
      ...createScanSlice(set, get, api),
      ...createApiActionsSlice(set, get, api),
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
