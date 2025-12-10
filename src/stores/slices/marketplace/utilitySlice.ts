/**
 * Utility Slice - Error handling and reset
 */

import type { StateCreator } from 'zustand';
import type { UtilitySlice, MarketplaceState } from './types';
import { defaultFilters, defaultFormData } from './types';

export const createUtilitySlice: StateCreator<
  MarketplaceState,
  [],
  [],
  UtilitySlice
> = (set) => ({
  error: null,

  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),

  reset: () => set({
    currentView: 'browse',
    selectedPatternId: null,
    isModalOpen: false,
    patterns: [],
    featuredPatterns: [],
    myPatterns: [],
    favoritePatterns: [],
    filters: defaultFilters,
    offset: 0,
    hasMore: false,
    total: 0,
    formData: defaultFormData,
    formErrors: {},
    error: null,
  }),
});
