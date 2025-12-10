/**
 * Settings Slice - Manages user preferences
 */

import type { StateCreator } from 'zustand';
import type { SettingsSlice, BlueprintExecutionState, ExecutionSettings } from './types';

export const createSettingsSlice: StateCreator<
  BlueprintExecutionState,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  settings: {
    requireDecisionBeforeExecution: true,
    showToastNotifications: true,
    autoExpandGlobalTaskBar: true,
  },

  setSettings: (newSettings: Partial<ExecutionSettings>) => {
    set(state => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },
});
