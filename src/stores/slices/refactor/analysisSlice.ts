/**
 * Analysis Slice - Manages scanning and analysis state
 */

import type { StateCreator } from 'zustand';
import type { AnalysisSlice, RefactorState, AnalysisStatus } from './types';

export const createAnalysisSlice: StateCreator<
  RefactorState,
  [],
  [],
  AnalysisSlice
> = (set, get) => ({
  // Initial state
  analysisStatus: 'idle',
  analysisProgress: 0,
  analysisError: null,
  analysisProgressMessage: null,
  currentQueueId: null,
  pollingInterval: null,

  // Actions
  setAnalysisStatus: (status: AnalysisStatus, progress?: number) => {
    set({
      analysisStatus: status,
      ...(progress !== undefined && { analysisProgress: progress })
    });
  },

  setAnalysisError: (error: string | null) => {
    set({ analysisError: error });
  },

  setAnalysisProgress: (progress: number, message?: string | null) => {
    set({
      analysisProgress: progress,
      ...(message !== undefined && { analysisProgressMessage: message })
    });
  },

  setCurrentQueueId: (queueId: string | null) => {
    set({ currentQueueId: queueId });
  },

  setPollingInterval: (interval: NodeJS.Timeout | null) => {
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },
});
