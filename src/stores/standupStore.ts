import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  StandupSummaryResponse,
  StandupFilters,
  StandupLoadingState,
  StandupHistoryItem,
  PeriodType,
} from '@/app/features/DailyStandup/lib/types';
import {
  fetchStandupSummary,
  generateStandupSummary,
  fetchStandupHistory,
  deleteStandupSummary,
} from '@/app/features/DailyStandup/lib/standupApi';

interface StandupStore extends StandupLoadingState {
  // Current summary
  currentSummary: StandupSummaryResponse | null;

  // History
  history: StandupHistoryItem[];

  // Filters
  filters: StandupFilters;

  // Actions
  setFilters: (filters: Partial<StandupFilters>) => void;
  setProjectId: (projectId: string | null) => void;
  setPeriodType: (periodType: PeriodType) => void;
  setDateOffset: (offset: number) => void;
  navigatePreviousPeriod: () => void;
  navigateNextPeriod: () => void;
  navigateToCurrentPeriod: () => void;

  // Data fetching
  loadSummary: () => Promise<void>;
  generateSummary: (forceRegenerate?: boolean) => Promise<void>;
  loadHistory: () => Promise<void>;
  deleteSummary: (id: string) => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState: Pick<
  StandupStore,
  'currentSummary' | 'history' | 'filters' | 'isLoading' | 'isGenerating' | 'error'
> = {
  currentSummary: null,
  history: [],
  filters: {
    projectId: null,
    periodType: 'daily',
    dateOffset: 0,
  },
  isLoading: false,
  isGenerating: false,
  error: null,
};

export const useStandupStore = create<StandupStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Set multiple filters at once
        setFilters: (newFilters) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters },
            error: null,
          }));
        },

        // Set project ID
        setProjectId: (projectId) => {
          set((state) => ({
            filters: { ...state.filters, projectId },
            currentSummary: null,
            history: [],
            error: null,
          }));
        },

        // Set period type
        setPeriodType: (periodType) => {
          set((state) => ({
            filters: { ...state.filters, periodType, dateOffset: 0 },
            currentSummary: null,
            error: null,
          }));
        },

        // Set date offset
        setDateOffset: (dateOffset) => {
          set((state) => ({
            filters: { ...state.filters, dateOffset },
            error: null,
          }));
        },

        // Navigate to previous period
        navigatePreviousPeriod: () => {
          set((state) => ({
            filters: { ...state.filters, dateOffset: state.filters.dateOffset - 1 },
            error: null,
          }));
        },

        // Navigate to next period (only if not already at current)
        navigateNextPeriod: () => {
          const { filters } = get();
          if (filters.dateOffset < 0) {
            set((state) => ({
              filters: { ...state.filters, dateOffset: state.filters.dateOffset + 1 },
              error: null,
            }));
          }
        },

        // Navigate to current period
        navigateToCurrentPeriod: () => {
          set((state) => ({
            filters: { ...state.filters, dateOffset: 0 },
            error: null,
          }));
        },

        // Load summary for current filters
        loadSummary: async () => {
          const { filters } = get();

          if (!filters.projectId) {
            set({ error: 'No project selected', isLoading: false });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const summary = await fetchStandupSummary(
              filters.projectId,
              filters.periodType,
              filters.dateOffset
            );

            set({ currentSummary: summary, isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load summary',
              isLoading: false,
            });
          }
        },

        // Generate summary for current filters
        generateSummary: async (forceRegenerate = false) => {
          const { filters } = get();

          if (!filters.projectId) {
            set({ error: 'No project selected', isGenerating: false });
            return;
          }

          set({ isGenerating: true, error: null });

          try {
            const summary = await generateStandupSummary(
              filters.projectId,
              filters.periodType,
              filters.dateOffset,
              forceRegenerate
            );

            set({ currentSummary: summary, isGenerating: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to generate summary',
              isGenerating: false,
            });
          }
        },

        // Load history for current project
        loadHistory: async () => {
          const { filters } = get();

          if (!filters.projectId) {
            set({ history: [] });
            return;
          }

          try {
            const history = await fetchStandupHistory(filters.projectId);
            set({ history });
          } catch (error) {
            console.error('Failed to load standup history:', error);
          }
        },

        // Delete a summary
        deleteSummary: async (id) => {
          try {
            await deleteStandupSummary(id);

            // Remove from history
            set((state) => ({
              history: state.history.filter((h) => h.id !== id),
              // Clear current summary if it was the deleted one
              currentSummary:
                state.currentSummary?.id === id ? null : state.currentSummary,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete summary',
            });
          }
        },

        // Reset store
        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'standup-store',
        version: 1,
        partialize: (state) => ({
          filters: state.filters,
        }),
      }
    )
  )
);

export default useStandupStore;
