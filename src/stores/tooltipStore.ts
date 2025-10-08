'use client';

import { create } from 'zustand';
import { Context } from './contextStore';

interface TooltipState {
  isVisible: boolean;
  context: Context | null;
  groupColor: string;
}

interface TooltipStore extends TooltipState {
  showTooltip: (context: Context, groupColor: string) => void;
  hideTooltip: () => void;
  toggleTooltip: (context: Context, groupColor: string) => void;
}

export const useTooltipStore = create<TooltipStore>((set, get) => ({
  isVisible: false,
  context: null,
  groupColor: '#06b6d4',

  showTooltip: (context: Context, groupColor: string) => {
    set({
      isVisible: true,
      context,
      groupColor,
    });
  },

  hideTooltip: () => {
    set({
      isVisible: false,
      context: null,
    });
  },

  toggleTooltip: (context: Context, groupColor: string) => {
    const state = get();
    
    // If same context is already visible, hide it
    if (state.isVisible && state.context?.id === context.id) {
      set({
        isVisible: false,
        context: null,
      });
    } else {
      // Show new context or switch to different context
      set({
        isVisible: true,
        context,
        groupColor,
      });
    }
  },
}));