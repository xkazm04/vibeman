/**
 * Decision Sync Store
 *
 * State management for decision polling from Butler.
 * Tracks polling status, recent decisions, and badge count for notifications.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig } from './utils/persistence';

export interface DecisionRecord {
  directionId: string;
  action: 'accept_direction' | 'reject_direction' | 'skip_direction';
  timestamp: Date;
}

interface DecisionSyncState {
  // Polling state (volatile - not persisted)
  isPolling: boolean;
  pollIntervalId: ReturnType<typeof setInterval> | null;

  // Tracked data (cache - persisted)
  lastPollAt: Date | null;
  newDecisionCount: number;
  recentDecisions: DecisionRecord[];

  // Actions
  startPolling: () => void;
  stopPolling: () => void;
  pollNow: () => Promise<void>;
  clearNewDecisionCount: () => void;
  addDecisions: (decisions: DecisionRecord[]) => void;
}

// Polling interval in milliseconds (60 seconds)
const POLL_INTERVAL_MS = 60000;

// Maximum recent decisions to keep
const MAX_RECENT_DECISIONS = 50;

export const useDecisionSyncStore = create<DecisionSyncState>()(
  persist(
    (set, get) => ({
      // Initial state
      isPolling: false,
      pollIntervalId: null,
      lastPollAt: null,
      newDecisionCount: 0,
      recentDecisions: [],

      /**
       * Start automatic polling
       */
      startPolling: () => {
        const state = get();
        if (state.isPolling || state.pollIntervalId) {
          console.log('[DecisionSyncStore] Already polling');
          return;
        }

        console.log('[DecisionSyncStore] Starting decision polling');

        // Immediate poll on start
        get().pollNow();

        // Set up interval
        const intervalId = setInterval(() => {
          get().pollNow();
        }, POLL_INTERVAL_MS);

        set({
          isPolling: true,
          pollIntervalId: intervalId,
        });
      },

      /**
       * Stop automatic polling
       */
      stopPolling: () => {
        const state = get();
        if (state.pollIntervalId) {
          clearInterval(state.pollIntervalId);
        }

        console.log('[DecisionSyncStore] Stopped decision polling');

        set({
          isPolling: false,
          pollIntervalId: null,
        });
      },

      /**
       * Trigger an immediate poll
       */
      pollNow: async () => {
        try {
          const response = await fetch('/api/remote/poll-decisions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          const result = await response.json();

          if (result.success && result.processed > 0) {
            // Convert string timestamps back to Date objects
            const newDecisions: DecisionRecord[] = result.decisions.map(
              (d: { directionId: string; action: string; timestamp: string }) => ({
                directionId: d.directionId,
                action: d.action as DecisionRecord['action'],
                timestamp: new Date(d.timestamp),
              })
            );

            get().addDecisions(newDecisions);
          }

          set({
            lastPollAt: new Date(),
          });
        } catch (error) {
          console.error('[DecisionSyncStore] Poll error:', error);
        }
      },

      /**
       * Clear the new decision count (user acknowledged)
       */
      clearNewDecisionCount: () => {
        set({ newDecisionCount: 0 });
      },

      /**
       * Add new decisions to the store
       */
      addDecisions: (decisions: DecisionRecord[]) => {
        if (decisions.length === 0) return;

        set((state) => {
          // Prepend new decisions and limit to max
          const updatedDecisions = [...decisions, ...state.recentDecisions].slice(
            0,
            MAX_RECENT_DECISIONS
          );

          return {
            recentDecisions: updatedDecisions,
            newDecisionCount: state.newDecisionCount + decisions.length,
          };
        });
      },
    }),
    createPersistConfig('decision-sync', {
      category: 'cache',
      partialize: (state) => ({
        // Only persist cache data, not volatile polling state
        lastPollAt: state.lastPollAt,
        newDecisionCount: state.newDecisionCount,
        recentDecisions: state.recentDecisions,
      }),
    })
  )
);

/**
 * Helper to get human-readable time since last poll
 */
export function getTimeSinceLastPoll(lastPollAt: Date | null): string {
  if (!lastPollAt) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - new Date(lastPollAt).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}

/**
 * Helper to format action for display
 */
export function formatDecisionAction(action: DecisionRecord['action']): string {
  switch (action) {
    case 'accept_direction':
      return 'Accepted';
    case 'reject_direction':
      return 'Rejected';
    case 'skip_direction':
      return 'Skipped';
    default:
      return action;
  }
}
