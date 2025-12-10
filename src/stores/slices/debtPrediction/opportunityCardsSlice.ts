/**
 * Opportunity Cards Slice - Manages opportunity cards
 */

import type { StateCreator } from 'zustand';
import type { OpportunityCardsSlice, DebtPredictionState, OpportunityCard } from './types';

export const createOpportunityCardsSlice: StateCreator<
  DebtPredictionState,
  [],
  [],
  OpportunityCardsSlice
> = (set) => ({
  opportunityCards: [],
  showOpportunityPanel: true,

  setOpportunityCards: (cards: OpportunityCard[]) => set({
    opportunityCards: cards.map((c) => ({
      ...c,
      affected_files: typeof c.affected_files === 'string'
        ? JSON.parse(c.affected_files)
        : c.affected_files || [],
      clicked: !!c.clicked,
      acted_upon: !!c.acted_upon,
    })),
  }),

  dismissCard: (id: string) => set((state) => ({
    opportunityCards: state.opportunityCards.filter((c) => c.id !== id),
  })),

  markCardActed: (id: string) => set((state) => ({
    opportunityCards: state.opportunityCards.map((c) =>
      c.id === id ? { ...c, acted_upon: true } : c
    ),
  })),

  toggleOpportunityPanel: () => set((state) => ({
    showOpportunityPanel: !state.showOpportunityPanel,
  })),
});
