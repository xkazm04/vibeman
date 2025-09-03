import { create } from 'zustand';

interface RealtimeIndicator {
  id: string;
  isActive: boolean;
  pollingInterval?: number; // in milliseconds
  lastUpdated?: Date;
}

interface RealtimeState {
  indicators: Record<string, RealtimeIndicator>;
}

interface RealtimeStore extends RealtimeState {
  // Actions
  setIndicator: (id: string, isActive: boolean, pollingInterval?: number) => void;
  getIndicator: (id: string) => RealtimeIndicator | undefined;
  isIndicatorActive: (id: string) => boolean;
  removeIndicator: (id: string) => void;
  clearAllIndicators: () => void;
}

export const useRealtimeStore = create<RealtimeStore>((set, get) => ({
  // Initial state
  indicators: {},

  // Actions
  setIndicator: (id: string, isActive: boolean, pollingInterval = 10000) => {
    set((state) => ({
      indicators: {
        ...state.indicators,
        [id]: {
          id,
          isActive,
          pollingInterval,
          lastUpdated: new Date()
        }
      }
    }));
  },

  getIndicator: (id: string) => {
    return get().indicators[id];
  },

  isIndicatorActive: (id: string) => {
    const indicator = get().indicators[id];
    return indicator?.isActive ?? false;
  },

  removeIndicator: (id: string) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.indicators;
      return { indicators: rest };
    });
  },

  clearAllIndicators: () => {
    set({ indicators: {} });
  }
}));

// Predefined indicator IDs for consistency
export const REALTIME_INDICATORS = {
  BACKLOG_TASKS: 'backlog_tasks',
  // Add more indicators here as needed
} as const;