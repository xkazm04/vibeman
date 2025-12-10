/**
 * Marketplace Store
 *
 * Manages state for the refactoring patterns marketplace using composable slices.
 * Split into focused sub-stores for better maintainability:
 * - viewSlice: Navigation and modal state
 * - dataSlice: Patterns, users, and badges data
 * - filtersSlice: Filtering and pagination
 * - formSlice: Pattern creation/editing form
 * - patternActionsSlice: CRUD operations on patterns
 * - favoritesSlice: Favorite patterns management
 * - utilitySlice: Error handling and reset
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  createViewSlice,
  createDataSlice,
  createFiltersSlice,
  createFormSlice,
  createPatternActionsSlice,
  createFavoritesSlice,
  createUtilitySlice,
} from './slices/marketplace';

import type { MarketplaceState } from './slices/marketplace/types';

// Re-export types for backward compatibility
export type {
  MarketplaceFilters,
  PatternFormData,
  MarketplaceView,
} from './slices/marketplace/types';

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set, get, api) => ({
      // Compose all slices
      ...createViewSlice(set, get, api),
      ...createDataSlice(set, get, api),
      ...createFiltersSlice(set, get, api),
      ...createFormSlice(set, get, api),
      ...createPatternActionsSlice(set, get, api),
      ...createFavoritesSlice(set, get, api),
      ...createUtilitySlice(set, get, api),
    }),
    {
      name: 'marketplace-storage',
      partialize: (state) => ({
        filters: state.filters,
        currentView: state.currentView,
      }),
    }
  )
);
