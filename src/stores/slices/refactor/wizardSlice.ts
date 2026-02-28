/**
 * Wizard Slice - Manages wizard UI state and configuration
 */

import type { StateCreator } from 'zustand';
import type { WizardSlice, RefactorState, WizardStep } from './types';
import type { WizardPlan } from '@/app/features/RefactorWizard/lib/wizardOptimizer';

export const createWizardSlice: StateCreator<
  RefactorState,
  [],
  [],
  WizardSlice
> = (set, get) => ({
  // Initial state
  wizardPlan: null,
  selectedScanGroups: new Set(),
  techniqueOverrides: new Map(),
  selectedFolders: [],
  llmProvider: 'gemini',
  llmModel: '',
  isWizardOpen: false,
  currentStep: 'settings',

  // Actions
  setWizardPlan: (plan: WizardPlan | null) => {
    set({ wizardPlan: plan });
  },

  toggleScanGroup: (groupId: string) => {
    const selected = new Set(get().selectedScanGroups);
    if (selected.has(groupId)) {
      selected.delete(groupId);
    } else {
      selected.add(groupId);
    }
    set({ selectedScanGroups: selected });
  },

  toggleTechnique: (groupId: string, techniqueId: string) => {
    const overrides = new Map(get().techniqueOverrides);
    const key = `${groupId}:${techniqueId}`;
    const currentValue = overrides.get(key) ?? true;
    overrides.set(key, !currentValue);
    set({ techniqueOverrides: overrides });
  },

  selectAllGroups: () => {
    const { wizardPlan } = get();
    if (wizardPlan) {
      const allIds = new Set<string>(wizardPlan.steps.map(g => g.id));
      set({ selectedScanGroups: allIds });
    } else {
      // If no wizard plan, select all available groups
      import('@/app/features/RefactorWizard/lib/scanTechniques').then(({ getScanTechniques }) => {
        const allGroupIds = new Set(getScanTechniques().map(g => g.id));
        set({ selectedScanGroups: allGroupIds });
      });
    }
  },

  clearGroupSelection: () => {
    set({ selectedScanGroups: new Set() });
  },

  setSelectedFolders: (folders: string[]) => {
    set({ selectedFolders: folders });
  },

  setLLMProvider: (provider: string) => {
    set({ llmProvider: provider });
  },

  setLLMModel: (model: string) => {
    set({ llmModel: model });
  },

  openWizard: () => {
    // Initialize with all groups selected by default
    const { selectedScanGroups } = get();
    if (selectedScanGroups.size === 0) {
      import('@/app/features/RefactorWizard/lib/scanTechniques').then(({ getScanTechniques }) => {
        const allGroupIds = new Set(getScanTechniques().map(g => g.id));
        set({ selectedScanGroups: allGroupIds });
      });
    }
    set({ isWizardOpen: true });
  },

  closeWizard: () => {
    set({ isWizardOpen: false });
  },

  setCurrentStep: (step: WizardStep) => {
    set({ currentStep: step });
  },

  resetWizard: () => {
    // Stop polling first
    get().stopPolling();

    set({
      analysisStatus: 'idle',
      analysisProgress: 0,
      analysisError: null,
      analysisProgressMessage: null,
      currentQueueId: null,
      selectedOpportunities: new Set(),
      wizardPlan: null,
      selectedScanGroups: new Set(),
      techniqueOverrides: new Map(),
      currentStep: 'settings',
    });
  },
});
