/**
 * History Slice - Manages execution history
 */

import type { StateCreator } from 'zustand';
import type { HistorySlice, BlueprintExecutionState } from './types';

export const createHistorySlice: StateCreator<
  BlueprintExecutionState,
  [],
  [],
  HistorySlice
> = () => ({
  executionHistory: [],
});
