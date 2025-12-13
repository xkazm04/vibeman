import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  FocusSessionResponse,
  FocusStatsResponse,
  FocusTimerState,
  FocusModeSettings,
  PomodoroConfig,
  DEFAULT_FOCUS_SETTINGS,
  DEFAULT_POMODORO_CONFIG,
} from '@/app/db/models/focus-mode.types';

// Timer interval ID type
let timerIntervalId: NodeJS.Timeout | null = null;

interface FocusModeStore {
  // Current session
  currentSession: FocusSessionResponse | null;
  sessions: FocusSessionResponse[];

  // Timer state
  timer: FocusTimerState;

  // Stats
  todayStats: FocusStatsResponse | null;
  recentStats: FocusStatsResponse[];

  // Settings
  settings: FocusModeSettings;

  // UI State
  isLoading: boolean;
  isActive: boolean; // Focus mode is active (hiding UI)
  error: string | null;

  // Filter state
  projectId: string | null;

  // Actions - Session management
  setProjectId: (projectId: string | null) => void;
  loadSessions: () => Promise<void>;
  loadCurrentSession: () => Promise<void>;
  createSession: (data: {
    title: string;
    description?: string;
    durationMinutes: number;
    sessionType: 'pomodoro' | 'deep_work' | 'custom';
    goalId?: string;
    contextId?: string;
    pomodoroTarget?: number;
  }) => Promise<FocusSessionResponse | null>;
  startSession: (sessionId?: string) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  completeSession: (productivityScore?: number, focusQuality?: 'excellent' | 'good' | 'fair' | 'poor') => Promise<void>;
  abandonSession: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  // Actions - Timer
  startTimer: () => void;
  stopTimer: () => void;
  tickTimer: () => void;
  completePomodoro: () => Promise<void>;
  startBreak: (breakType: 'short' | 'long') => void;
  endBreak: () => void;
  skipBreak: () => void;

  // Actions - Stats
  loadStats: () => Promise<void>;

  // Actions - Settings
  updateSettings: (settings: Partial<FocusModeSettings>) => void;
  updatePomodoroConfig: (config: Partial<PomodoroConfig>) => void;

  // Actions - Focus Mode
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  toggleFocusMode: () => void;

  // Actions - Distractions
  reportDistraction: () => Promise<void>;

  // Reset
  reset: () => void;
}

const initialTimerState: FocusTimerState = {
  isRunning: false,
  isPaused: false,
  elapsedSeconds: 0,
  remainingSeconds: 0,
  currentPomodoroNumber: 1,
  isOnBreak: false,
  breakRemainingSeconds: 0,
};

const initialState: Pick<
  FocusModeStore,
  'currentSession' | 'sessions' | 'timer' | 'todayStats' | 'recentStats' | 'settings' | 'isLoading' | 'isActive' | 'error' | 'projectId'
> = {
  currentSession: null,
  sessions: [],
  timer: initialTimerState,
  todayStats: null,
  recentStats: [],
  settings: DEFAULT_FOCUS_SETTINGS,
  isLoading: false,
  isActive: false,
  error: null,
  projectId: null,
};

export const useFocusModeStore = create<FocusModeStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Set project ID
        setProjectId: (projectId) => {
          set({ projectId, currentSession: null, sessions: [], error: null });
        },

        // Load sessions for current project
        loadSessions: async () => {
          const { projectId } = get();
          if (!projectId) return;

          set({ isLoading: true, error: null });

          try {
            const res = await fetch(`/api/focus-mode?projectId=${projectId}`);
            const data = await res.json();

            if (data.success) {
              set({ sessions: data.sessions, isLoading: false });
            } else {
              set({ error: data.error, isLoading: false });
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load sessions',
              isLoading: false,
            });
          }
        },

        // Load current active session
        loadCurrentSession: async () => {
          const { projectId } = get();
          if (!projectId) return;

          try {
            const res = await fetch(`/api/focus-mode/active?projectId=${projectId}`);
            const data = await res.json();

            if (data.success && data.session) {
              set({ currentSession: data.session });

              // Resume timer if session is active
              if (data.session.status === 'active') {
                const elapsed = data.session.totalElapsedSeconds;
                const durationSeconds = data.session.durationMinutes * 60;
                const remaining = Math.max(0, durationSeconds - elapsed);

                set({
                  timer: {
                    ...get().timer,
                    isRunning: true,
                    isPaused: false,
                    elapsedSeconds: elapsed,
                    remainingSeconds: remaining,
                    currentPomodoroNumber: data.session.pomodoroCount + 1,
                  },
                });

                get().startTimer();
              } else if (data.session.status === 'paused') {
                const elapsed = data.session.totalElapsedSeconds;
                const durationSeconds = data.session.durationMinutes * 60;
                const remaining = Math.max(0, durationSeconds - elapsed);

                set({
                  timer: {
                    ...get().timer,
                    isRunning: false,
                    isPaused: true,
                    elapsedSeconds: elapsed,
                    remainingSeconds: remaining,
                    currentPomodoroNumber: data.session.pomodoroCount + 1,
                  },
                });
              }
            }
          } catch (error) {
            console.error('Failed to load current session:', error);
          }
        },

        // Create a new session
        createSession: async (data) => {
          const { projectId } = get();
          if (!projectId) return null;

          set({ isLoading: true, error: null });

          try {
            const res = await fetch('/api/focus-mode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, ...data }),
            });

            const result = await res.json();

            if (result.success) {
              const session = result.session;
              set({
                currentSession: session,
                sessions: [session, ...get().sessions],
                timer: {
                  ...initialTimerState,
                  remainingSeconds: session.durationMinutes * 60,
                },
                isLoading: false,
              });
              return session;
            } else {
              set({ error: result.error, isLoading: false });
              return null;
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create session',
              isLoading: false,
            });
            return null;
          }
        },

        // Start session
        startSession: async (sessionId?: string) => {
          const session = sessionId
            ? get().sessions.find((s) => s.id === sessionId)
            : get().currentSession;

          if (!session) return;

          try {
            const res = await fetch('/api/focus-mode/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: session.id }),
            });

            const data = await res.json();

            if (data.success) {
              set({
                currentSession: data.session,
                timer: {
                  ...get().timer,
                  isRunning: true,
                  isPaused: false,
                  remainingSeconds: data.session.durationMinutes * 60,
                },
              });

              get().startTimer();
              get().enterFocusMode();
            }
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to start session' });
          }
        },

        // Pause session
        pauseSession: async () => {
          const { currentSession } = get();
          if (!currentSession) return;

          get().stopTimer();

          try {
            const res = await fetch('/api/focus-mode/pause', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: currentSession.id }),
            });

            const data = await res.json();

            if (data.success) {
              set({
                currentSession: data.session,
                timer: {
                  ...get().timer,
                  isRunning: false,
                  isPaused: true,
                },
              });
            }
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to pause session' });
          }
        },

        // Resume session
        resumeSession: async () => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            const res = await fetch('/api/focus-mode/resume', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: currentSession.id }),
            });

            const data = await res.json();

            if (data.success) {
              set({
                currentSession: data.session,
                timer: {
                  ...get().timer,
                  isRunning: true,
                  isPaused: false,
                },
              });

              get().startTimer();
            }
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to resume session' });
          }
        },

        // Complete session
        completeSession: async (productivityScore?: number, focusQuality?: 'excellent' | 'good' | 'fair' | 'poor') => {
          const { currentSession } = get();
          if (!currentSession) return;

          get().stopTimer();

          try {
            const res = await fetch('/api/focus-mode/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: currentSession.id,
                productivityScore,
                focusQuality,
              }),
            });

            const data = await res.json();

            if (data.success) {
              set({
                currentSession: null,
                sessions: get().sessions.map((s) =>
                  s.id === data.session.id ? data.session : s
                ),
                timer: initialTimerState,
              });

              get().exitFocusMode();
              get().loadStats();
            }
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to complete session' });
          }
        },

        // Abandon session
        abandonSession: async () => {
          const { currentSession } = get();
          if (!currentSession) return;

          get().stopTimer();

          try {
            const res = await fetch('/api/focus-mode/abandon', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: currentSession.id }),
            });

            const data = await res.json();

            if (data.success) {
              set({
                currentSession: null,
                sessions: get().sessions.map((s) =>
                  s.id === data.session.id ? data.session : s
                ),
                timer: initialTimerState,
              });

              get().exitFocusMode();
            }
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to abandon session' });
          }
        },

        // Delete session
        deleteSession: async (id: string) => {
          try {
            const res = await fetch(`/api/focus-mode?sessionId=${id}`, {
              method: 'DELETE',
            });

            const data = await res.json();

            if (data.success) {
              set({
                sessions: get().sessions.filter((s) => s.id !== id),
                currentSession: get().currentSession?.id === id ? null : get().currentSession,
              });
            }
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete session' });
          }
        },

        // Start timer
        startTimer: () => {
          if (timerIntervalId) {
            clearInterval(timerIntervalId);
          }

          timerIntervalId = setInterval(() => {
            get().tickTimer();
          }, 1000);
        },

        // Stop timer
        stopTimer: () => {
          if (timerIntervalId) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
          }
        },

        // Tick timer
        tickTimer: () => {
          const { timer, currentSession, settings } = get();

          if (timer.isOnBreak) {
            // Handle break timer
            if (timer.breakRemainingSeconds <= 1) {
              // Break complete
              set({
                timer: {
                  ...timer,
                  isOnBreak: false,
                  breakRemainingSeconds: 0,
                },
              });

              if (settings.playCompletionSound) {
                // Play break end sound
              }
            } else {
              set({
                timer: {
                  ...timer,
                  breakRemainingSeconds: timer.breakRemainingSeconds - 1,
                },
              });
            }
          } else {
            // Handle work timer
            const newElapsed = timer.elapsedSeconds + 1;
            const newRemaining = timer.remainingSeconds - 1;

            // Check if current pomodoro is complete
            const pomodoroMinutes = settings.pomodoroConfig.workMinutes;
            const pomodoroSeconds = pomodoroMinutes * 60;
            const currentPomodoroElapsed = newElapsed % pomodoroSeconds;

            if (currentSession?.sessionType === 'pomodoro' && currentPomodoroElapsed === 0 && newElapsed > 0) {
              // Pomodoro complete
              get().completePomodoro();
            } else if (newRemaining <= 0) {
              // Session complete
              get().completeSession();
            } else {
              set({
                timer: {
                  ...timer,
                  elapsedSeconds: newElapsed,
                  remainingSeconds: newRemaining,
                },
              });
            }
          }
        },

        // Complete pomodoro
        completePomodoro: async () => {
          const { currentSession, timer, settings } = get();
          if (!currentSession) return;

          const newPomodoroNumber = timer.currentPomodoroNumber + 1;

          // Update session on server
          try {
            await fetch('/api/focus-mode/pomodoro', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: currentSession.id }),
            });
          } catch (error) {
            console.error('Failed to update pomodoro count:', error);
          }

          // Check if we've reached the target
          if (currentSession.pomodoroTarget && newPomodoroNumber > currentSession.pomodoroTarget) {
            get().completeSession();
            return;
          }

          set({
            timer: {
              ...timer,
              currentPomodoroNumber: newPomodoroNumber,
            },
            currentSession: {
              ...currentSession,
              pomodoroCount: currentSession.pomodoroCount + 1,
            },
          });

          // Auto-start break if enabled
          if (settings.autoStartBreaks) {
            const isLongBreak = (newPomodoroNumber - 1) % settings.pomodoroConfig.longBreakAfter === 0;
            get().startBreak(isLongBreak ? 'long' : 'short');
          }

          if (settings.playCompletionSound) {
            // Play completion sound
          }
        },

        // Start break
        startBreak: (breakType: 'short' | 'long') => {
          const { settings, timer } = get();
          const breakMinutes = breakType === 'long'
            ? settings.pomodoroConfig.longBreakMinutes
            : settings.pomodoroConfig.shortBreakMinutes;

          set({
            timer: {
              ...timer,
              isOnBreak: true,
              breakRemainingSeconds: breakMinutes * 60,
            },
          });
        },

        // End break
        endBreak: () => {
          set({
            timer: {
              ...get().timer,
              isOnBreak: false,
              breakRemainingSeconds: 0,
            },
          });
        },

        // Skip break
        skipBreak: () => {
          get().endBreak();
        },

        // Load stats
        loadStats: async () => {
          const { projectId } = get();
          if (!projectId) return;

          try {
            const res = await fetch(`/api/focus-mode/stats?projectId=${projectId}`);
            const data = await res.json();

            if (data.success) {
              set({
                todayStats: data.todayStats,
                recentStats: data.recentStats || [],
              });
            }
          } catch (error) {
            console.error('Failed to load stats:', error);
          }
        },

        // Update settings
        updateSettings: (newSettings) => {
          set({
            settings: { ...get().settings, ...newSettings },
          });
        },

        // Update pomodoro config
        updatePomodoroConfig: (config) => {
          set({
            settings: {
              ...get().settings,
              pomodoroConfig: { ...get().settings.pomodoroConfig, ...config },
            },
          });
        },

        // Enter focus mode
        enterFocusMode: () => {
          set({ isActive: true });
        },

        // Exit focus mode
        exitFocusMode: () => {
          set({ isActive: false });
        },

        // Toggle focus mode
        toggleFocusMode: () => {
          set({ isActive: !get().isActive });
        },

        // Report distraction
        reportDistraction: async () => {
          const { currentSession } = get();
          if (!currentSession) return;

          try {
            await fetch('/api/focus-mode/distraction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: currentSession.id }),
            });

            set({
              currentSession: {
                ...currentSession,
                distractionsCount: currentSession.distractionsCount + 1,
              },
            });
          } catch (error) {
            console.error('Failed to report distraction:', error);
          }
        },

        // Reset store
        reset: () => {
          get().stopTimer();
          set(initialState);
        },
      }),
      {
        name: 'focus-mode-store',
        version: 1,
        partialize: (state) => ({
          settings: state.settings,
          projectId: state.projectId,
        }),
      }
    )
  )
);

export default useFocusModeStore;
