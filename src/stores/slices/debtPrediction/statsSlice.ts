/**
 * Stats Slice - Manages statistics and patterns
 */

import type { StateCreator } from 'zustand';
import type { StatsSlice, DebtPredictionState, DebtStats } from './types';
import type { DbDebtPattern } from '@/app/db/models/debt-prediction.types';

export const createStatsSlice: StateCreator<
  DebtPredictionState,
  [],
  [],
  StatsSlice
> = (set) => ({
  stats: null,
  patterns: [],

  setStats: (stats: DebtStats) => set({ stats }),

  setPatterns: (patterns: DbDebtPattern[]) => set({ patterns }),
});
