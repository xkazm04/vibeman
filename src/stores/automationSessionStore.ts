/**
 * Automation Session Store
 * Global state for standup automation sessions
 * Enables GlobalTaskBar to show automation status across all modules
 */

import { create } from 'zustand';

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

let pollInterval: NodeJS.Timeout | null = null;

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
      get().fetchSessions();
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

// Polling management
function startPolling(get: () => AutomationSessionState) {
  stopPolling();

  const poll = () => {
    const state = get();
    if (!state.isPolling) return;

    // Determine poll interval based on active sessions
    const hasActiveSessions = state.sessions.some(
      (s) => s.phase !== 'complete' && s.phase !== 'failed' && s.phase !== 'paused'
    );
    const interval = hasActiveSessions ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL;

    pollInterval = setTimeout(() => {
      state.fetchSessions().then(() => poll());
    }, interval);
  };

  poll();
}

function stopPolling() {
  if (pollInterval) {
    clearTimeout(pollInterval);
    pollInterval = null;
  }
}

// Initialize polling when store is created
if (typeof window !== 'undefined') {
  // Start polling on client side
  setTimeout(() => {
    const store = useAutomationSessionStore.getState();
    store.fetchSessions();
    startPolling(useAutomationSessionStore.getState);
  }, 1000);
}
