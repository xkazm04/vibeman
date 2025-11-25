/**
 * Annette Actions Store
 * Manages dynamic action buttons and AI interaction state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SupportedProvider } from '@/lib/llm/types';

export type ActionButtonMode = 'default' | 'yesno' | 'custom';

export interface ActionButton {
  id: string;
  label: string;
  message?: string;  // Message to send when clicked
  command?: string;  // Command identifier
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

export interface ActionMetadata {
  // Structured metadata from AI response
  // Separated from the audio message
  recommendedAction?: 'refactor' | 'fix' | 'improve' | 'review' | 'build';
  contextId?: string;
  requirementName?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort?: string;
  [key: string]: unknown;  // Allow additional metadata
}

interface AnnetteActionsState {
  // Current button mode
  buttonMode: ActionButtonMode;

  // Custom action buttons
  actionButtons: ActionButton[];

  // Metadata from last AI response
  lastMetadata: ActionMetadata | null;

  // Loading state
  isProcessingAction: boolean;

  // Selected LLM provider (persistent)
  selectedProvider: SupportedProvider;

  // Actions
  setButtonMode: (mode: ActionButtonMode) => void;
  setActionButtons: (buttons: ActionButton[]) => void;
  setMetadata: (metadata: ActionMetadata | null) => void;
  setProcessingAction: (isProcessing: boolean) => void;
  setSelectedProvider: (provider: SupportedProvider) => void;
  resetToDefault: () => void;
}

export const useAnnetteActionsStore = create<AnnetteActionsState>()(
  persist(
    (set) => ({
      buttonMode: 'default',
      actionButtons: [],
      lastMetadata: null,
      isProcessingAction: false,
      selectedProvider: 'gemini',  // Default provider

      setButtonMode: (mode) => set({ buttonMode: mode }),

      setActionButtons: (buttons) => set({ actionButtons: buttons }),

      setMetadata: (metadata) => set({ lastMetadata: metadata }),

      setProcessingAction: (isProcessing) => set({ isProcessingAction: isProcessing }),

      setSelectedProvider: (provider) => set({ selectedProvider: provider }),

      resetToDefault: () => set({
        buttonMode: 'default',
        actionButtons: [],
        lastMetadata: null,
        isProcessingAction: false,
        // Keep selectedProvider persisted
      }),
    }),
    {
      name: 'annette-actions-storage',
      partialize: (state) => ({ selectedProvider: state.selectedProvider }),  // Only persist provider
    }
  )
);
