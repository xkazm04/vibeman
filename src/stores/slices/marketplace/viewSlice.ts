/**
 * View Slice - Manages navigation and modal state
 */

import type { StateCreator } from 'zustand';
import type { ViewSlice, MarketplaceState, MarketplaceView } from './types';

export const createViewSlice: StateCreator<
  MarketplaceState,
  [],
  [],
  ViewSlice
> = (set, get) => ({
  currentView: 'browse',
  selectedPatternId: null,
  isModalOpen: false,

  setCurrentView: (view: MarketplaceView) => set({
    currentView: view,
    selectedPatternId: null
  }),

  setSelectedPattern: (patternId: string | null) => set({
    selectedPatternId: patternId,
    currentView: patternId ? 'detail' : get().currentView,
  }),

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
});
