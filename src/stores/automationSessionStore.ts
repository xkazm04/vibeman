/**
 * Automation Session Store
 * Global state for standup automation sessions
 * Enables GlobalTaskBar to show automation status across all modules
 *
 * Uses adaptive polling: faster when sessions are active, slower when idle.
 * Shared polling infrastructure via createActivityAwarePoller from usePolling.
 */

import { create } from 'zustand';
import { createActivityAwarePoller, type ActivityAwarePoller } from '@/hooks/usePolling';
// Session lifecycle is managed by the unified session-lifecycle module.
// This store provides the Zustand reactive layer on top.
// See: src/lib/session-lifecycle/presets.ts (createAutomationLifecycle)
import { createAutomationLifecycle } from '@/lib/session-lifecycle';

// Lifecycle manager instance - available for cleanup/staleness operations
export const automationLifecycle = createAutomationLifecycle();

// ============ Types ============

export type AutomationSessionPhase =
  | 'pending'
  | 'running'
  | 'exploring'
  | 'generating'
  | 'evaluating'
  | 'complete'
  | 'failed'
  | 'paused';

export interface AutomationSession {
  sessionId: string;
  projectId: string;
  projectName?: string;
  phase: AutomationSessionPhase;
  progress: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  hasError: boolean;
  errorMessage?: string;
}

interface AutomationSessionState {
  // Sessions
  sessions: AutomationSession[];
  isLoading: boolean;
  error: string | null;

  // Polling
  isPolling: boolean;
  lastFetchedAt: number | null;

  // Actions
  setSessions: (sessions: AutomationSession[]) => void;
  updateSession: (sessionId: string, updates: Partial<AutomationSession>) => void;
  removeSession: (sessionId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPolling: (enabled: boolean) => void;

  // Async actions
  fetchSessions: () => Promise<void>;
  pauseSession: (sessionId: string) => Promise<boolean>;
  resumeSession: (sessionId: string) => Promise<boolean>;
  deleteSession: (sessionId: string) => Promise<boolean>;
}

// Poll intervals
const ACTIVE_POLL_INTERVAL = 3000; // 3 seconds when sessions running
const IDLE_POLL_INTERVAL = 30000; // 30 seconds when idle

// Polling manager instance (created lazily)
let poller: ActivityAwarePoller | null = null;

export const useAutomationSessionStore = create<AutomationSessionState>((set, get) => ({
  sessions: [],
  isLoading: true,
  error: null,
  isPolling: true,
  lastFetchedAt: null,

  setSessions: (sessions) => set({ sessions, lastFetchedAt: Date.now() }),

  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.sessionId === sessionId ? { ...s, ...updates } : s
      ),
    })),

  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.sessionId !== sessionId),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setPolling: (enabled) => {
    set({ isPolling: enabled });
    if (enabled) {
      startPolling(get);
    } else {
      stopPolling();
    }
  },

  fetchSessions: async () => {
    try {
      const response = await fetch('/api/standup/automation/sessions?status=active');
      const data = await response.json();

      if (data.success) {
        set({
          sessions: data.sessions || [],
          error: null,
          isLoading: false,
          lastFetchedAt: Date.now(),
        });
      } else {
        set({ sessions: [], isLoading: false });
      }
    } catch {
      set({ sessions: [], isLoading: false });
    }
  },

  pauseSession: async (sessionId) => {
    try {
      const response = await fetch(`/api/standup/automation/sessions/${sessionId}/pause`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        get().updateSession(sessionId, { phase: 'paused' });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  resumeSession: async (sessionId) => {
    try {
      const response = await fetch(`/api/standup/automation/sessions/${sessionId}/resume`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        get().updateSession(sessionId, { phase: 'running' });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteSession: async (sessionId) => {
    try {
      const response = await fetch(`/api/standup/automation/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        get().removeSession(sessionId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));

// Polling management using shared activity-aware infrastructure
function hasActiveSessions(sessions: AutomationSession[]): boolean {
  return sessions.some(
    (s) => s.phase !== 'complete' && s.phase !== 'failed' && s.phase !== 'paused'
  );
}

function startPolling(get: () => AutomationSessionState) {
  stopPolling();

  // Create activity-aware poller that adapts interval based on session state
  poller = createActivityAwarePoller(
    async () => {
      const state = get();
      if (!state.isPolling) {
        stopPolling();
        return false;
      }

      await state.fetchSessions();

      // Return true if sessions are active (triggers fast polling)
      const newState = get();
      return hasActiveSessions(newState.sessions);
    },
    {
      activeIntervalMs: ACTIVE_POLL_INTERVAL,
      idleIntervalMs: IDLE_POLL_INTERVAL,
    }
  );

  poller.start();
}

function stopPolling() {
  poller?.stop();
  poller = null;
}

// Export polling control for components that need to trigger polling explicitly
export function initializePolling() {
  if (typeof window === 'undefined') return;
  const store = useAutomationSessionStore.getState();
  store.fetchSessions();
  startPolling(useAutomationSessionStore.getState);
}
