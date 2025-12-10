/**
 * Opportunities Slice - Manages refactoring opportunities list and selection
 */

import type { StateCreator } from 'zustand';
import type { OpportunitiesSlice, RefactorState, RefactorOpportunity } from './types';

export const createOpportunitiesSlice: StateCreator<
  RefactorState,
  [],
  [],
  OpportunitiesSlice
> = (set, get) => ({
  // Initial state
  opportunities: [],
  selectedOpportunities: new Set(),
  filterCategory: 'all',
  filterSeverity: 'all',

  // Actions
  setOpportunities: (opportunities: RefactorOpportunity[]) => {
    set({ opportunities });
  },

  toggleOpportunity: (id: string) => {
    const selected = new Set(get().selectedOpportunities);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    set({ selectedOpportunities: selected });
  },

  selectAllOpportunities: () => {
    const { opportunities } = get();
    const allIds = new Set(opportunities.map(o => o.id));
    set({ selectedOpportunities: allIds });
  },

  clearSelection: () => {
    set({ selectedOpportunities: new Set() });
  },

  setFilterCategory: (category) => {
    set({ filterCategory: category });
  },

  setFilterSeverity: (severity) => {
    set({ filterSeverity: severity });
  },
});
