/**
 * Scan Slice - Manages scan status and settings
 */

import type { StateCreator } from 'zustand';
import type { ScanSlice, DebtPredictionState, ScanStatus } from './types';

export const createScanSlice: StateCreator<
  DebtPredictionState,
  [],
  [],
  ScanSlice
> = (set) => ({
  scanStatus: 'idle',
  scanProgress: 0,
  scanError: null,
  isEnabled: true,
  autoScanOnSave: false,

  setScanStatus: (status: ScanStatus, error?: string) => set({
    scanStatus: status,
    scanError: error || null,
  }),

  setScanProgress: (progress: number) => set({ scanProgress: progress }),

  setEnabled: (enabled: boolean) => set({ isEnabled: enabled }),

  setAutoScanOnSave: (enabled: boolean) => set({ autoScanOnSave: enabled }),
});
