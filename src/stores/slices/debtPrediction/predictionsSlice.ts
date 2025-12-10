/**
 * Predictions Slice - Manages predictions list and selection
 */

import type { StateCreator } from 'zustand';
import type { PredictionsSlice, DebtPredictionState, FilterType } from './types';
import type { DbDebtPrediction } from '@/app/db/models/debt-prediction.types';

export const createPredictionsSlice: StateCreator<
  DebtPredictionState,
  [],
  [],
  PredictionsSlice
> = (set, get) => ({
  predictions: [],
  selectedPredictionId: null,
  predictionFilter: 'all',

  setPredictions: (predictions: DbDebtPrediction[]) => set({ predictions }),

  addPrediction: (prediction: DbDebtPrediction) => set((state) => ({
    predictions: [...state.predictions, prediction],
  })),

  updatePrediction: (id: string, updates: Partial<DbDebtPrediction>) => set((state) => ({
    predictions: state.predictions.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),

  removePrediction: (id: string) => set((state) => ({
    predictions: state.predictions.filter((p) => p.id !== id),
    selectedPredictionId: state.selectedPredictionId === id ? null : state.selectedPredictionId,
  })),

  selectPrediction: (id: string | null) => set({ selectedPredictionId: id }),

  setPredictionFilter: (filter: FilterType) => set({ predictionFilter: filter }),
});
