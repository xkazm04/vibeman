import { create } from 'zustand';
import type React from 'react';
import type { WizardStepAction } from '@/components/DecisionPanel/WizardStepPanel';

export type DecisionType = 'structure-scan' | 'build-fix' | 'context-scan' | 'pre-scan';

export interface DecisionItem {
  id: string;
  type: DecisionType;
  title: string;
  description: string;
  count: number; // Number of changes/errors/contexts found
  severity?: 'info' | 'warning' | 'error';
  projectId: string;
  projectPath: string;
  projectType?: 'nextjs' | 'fastapi';
  data?: Record<string, unknown>; // Type-specific data to complete the action
  customContent?: React.ReactNode; // Optional custom UI content
  titleActions?: WizardStepAction[]; // Optional title bar action buttons
  onAccept: () => Promise<void>;
  onReject?: () => Promise<void>; // Optional - some decisions are info-only
  createdAt: number;
}

interface DecisionQueueState {
  queue: DecisionItem[];
  currentDecision: DecisionItem | null;
  isProcessing: boolean;

  // Actions
  addDecision: (decision: Omit<DecisionItem, 'id' | 'createdAt'>) => string;
  acceptDecision: () => Promise<void>;
  rejectDecision: () => Promise<void>;
  clearQueue: () => void;
  removeDecision: (id: string) => void;
}

/**
 * Decision Queue Store
 * Manages the queue of decisions from various scans
 *
 * Usage:
 * 1. Scan completes and finds changes
 * 2. addDecision() is called with details + onAccept callback
 * 3. Decision appears in Blueprint UI
 * 4. User accepts/rejects
 * 5. onAccept callback executes to save files and create events
 */
export const useDecisionQueueStore = create<DecisionQueueState>((set, get) => ({
  queue: [],
  currentDecision: null,
  isProcessing: false,

  /**
   * Add a new decision to the queue
   * If queue is empty, it becomes the current decision
   */
  addDecision: (decision) => {
    const id = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const newDecision: DecisionItem = {
      ...decision,
      id,
      createdAt: now,
    };

    set((state) => {
      const newQueue = [...state.queue, newDecision];
      const current = state.currentDecision || newDecision;

      return {
        queue: newQueue,
        currentDecision: current,
      };
    });

    return id;
  },

  /**
   * Accept the current decision
   * Executes onAccept callback and moves to next decision
   */
  acceptDecision: async () => {
    const { currentDecision } = get();

    if (!currentDecision) {
      return;
    }

    set({ isProcessing: true });

    try {
      await currentDecision.onAccept();

      // Remove from queue and move to next
      set((state) => {
        const newQueue = state.queue.filter(d => d.id !== currentDecision.id);
        const nextDecision = newQueue.length > 0 ? newQueue[0] : null;

        return {
          queue: newQueue,
          currentDecision: nextDecision,
          isProcessing: false,
        };
      });
    } catch (error) {
      set({ isProcessing: false });
      throw error;
    }
  },

  /**
   * Reject the current decision
   * Executes onReject callback (if provided) and moves to next decision
   */
  rejectDecision: async () => {
    const { currentDecision } = get();

    if (!currentDecision) {
      return;
    }

    set({ isProcessing: true });

    try {
      // Only call onReject if it's defined
      if (currentDecision.onReject) {
        await currentDecision.onReject();
      }

      // Remove from queue and move to next
      set((state) => {
        const newQueue = state.queue.filter(d => d.id !== currentDecision.id);
        const nextDecision = newQueue.length > 0 ? newQueue[0] : null;

        return {
          queue: newQueue,
          currentDecision: nextDecision,
          isProcessing: false,
        };
      });
    } catch (error) {
      set({ isProcessing: false });
      throw error;
    }
  },

  /**
   * Clear all decisions from the queue
   */
  clearQueue: () => {
    set({
      queue: [],
      currentDecision: null,
      isProcessing: false,
    });
  },

  /**
   * Remove a specific decision from the queue
   */
  removeDecision: (id) => {
    set((state) => {
      const newQueue = state.queue.filter(d => d.id !== id);
      const newCurrent = state.currentDecision?.id === id
        ? (newQueue.length > 0 ? newQueue[0] : null)
        : state.currentDecision;

      return {
        queue: newQueue,
        currentDecision: newCurrent,
      };
    });
  },
}));
