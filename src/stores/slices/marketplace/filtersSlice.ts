/**
 * Filters Slice - Manages filtering and pagination
 */

import type { StateCreator } from 'zustand';
import type { FiltersSlice, MarketplaceState, MarketplaceFilters, PatternCategory, PatternScope } from './types';
import { defaultFilters } from './types';

export const createFiltersSlice: StateCreator<
  MarketplaceState,
  [],
  [],
  FiltersSlice
> = (set, get) => ({
  filters: defaultFilters,
  offset: 0,
  limit: 20,
  hasMore: false,
  total: 0,

  setFilter: (key: keyof MarketplaceFilters, value: string | PatternCategory | PatternScope | 'all' | null) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
    // Refetch patterns when filter changes
    get().fetchPatterns();
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().fetchPatterns();
  },

  loadMore: async () => {
    const { filters, limit, offset, patterns, hasMore } = get();
    if (!hasMore) return;

    const newOffset = offset + limit;
    set({ isLoadingPatterns: true });

    try {
      const params = new URLSearchParams();
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.scope !== 'all') params.set('scope', filters.scope);
      if (filters.language) params.set('language', filters.language);
      if (filters.framework) params.set('framework', filters.framework);
      if (filters.search) params.set('search', filters.search);
      params.set('sortBy', filters.sortBy);
      params.set('limit', String(limit));
      params.set('offset', String(newOffset));

      const response = await fetch(`/api/marketplace/patterns?${params}`);
      if (!response.ok) throw new Error('Failed to load more patterns');

      const data = await response.json();
      set({
        patterns: [...patterns, ...data.patterns],
        offset: newOffset,
        hasMore: data.patterns.length === limit,
        isLoadingPatterns: false,
      });
    } catch (error) {
      set({ isLoadingPatterns: false });
      get().setError(error instanceof Error ? error.message : 'Unknown error');
    }
  },
});
