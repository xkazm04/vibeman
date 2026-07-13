/**
 * Fleet Autopilot Store
 *
 * Holds the fleet-wide pause state that the rate-limit autopilot toggles. When
 * a structured rate_limit event arrives on the terminal path, the whole CLI
 * fleet stops launching new tasks until the quota window clears; a banner reads
 * this state to show the paused status + resume ETA.
 *
 * This is intentionally a small, dedicated slice (separate from cliSessionStore)
 * so the pause is a single global truth independent of any one session, and so
 * the banner can subscribe narrowly without re-rendering on session churn.
 */

import { create } from 'zustand';

export interface FleetAutopilotState {
  /** True while the fleet is holding — no new task launches. */
  paused: boolean;
  /** Epoch ms when auto-resume fires (null when not paused). */
  resumeAt: number | null;
  /** Human-readable cause for the banner. */
  reason: string | null;
  /**
   * Consecutive backoff level used when the rate_limit event carries no ETA.
   * Escalates each ETA-less pause and resets when a real ETA is provided.
   */
  backoffLevel: number;
  /** Task IDs re-queued as "waiting" because of the limit (for banner counts). */
  waitingTaskIds: string[];

  setPaused: (info: { resumeAt: number; reason: string; backoffLevel: number }) => void;
  addWaitingTask: (taskId: string) => void;
  clearPause: () => void;
}

export const useFleetAutopilotStore = create<FleetAutopilotState>((set) => ({
  paused: false,
  resumeAt: null,
  reason: null,
  backoffLevel: 0,
  waitingTaskIds: [],

  setPaused: ({ resumeAt, reason, backoffLevel }) =>
    set({ paused: true, resumeAt, reason, backoffLevel }),

  addWaitingTask: (taskId) =>
    set((state) =>
      state.waitingTaskIds.includes(taskId)
        ? state
        : { waitingTaskIds: [...state.waitingTaskIds, taskId] }
    ),

  clearPause: () =>
    set({ paused: false, resumeAt: null, reason: null, waitingTaskIds: [] }),
}));

/** Non-hook getter for use in effects/callbacks/managers (not in render). */
export function isFleetPaused(): boolean {
  return useFleetAutopilotStore.getState().paused;
}
