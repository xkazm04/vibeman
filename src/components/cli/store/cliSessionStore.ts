/**
 * CLI Session Store
 *
 * Zustand store with localStorage persistence for CLI sessions.
 * Enables background processing and recovery from browser refresh.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { QueuedTask } from '../types';

// Session IDs
export type CLISessionId = 'cliSession1' | 'cliSession2' | 'cliSession3' | 'cliSession4';

// Session state
export interface CLISessionState {
  id: CLISessionId;
  projectPath: string | null;
  claudeSessionId: string | null; // For --resume flag
  queue: QueuedTask[];
  isRunning: boolean;
  autoStart: boolean;
  createdAt: number;
  lastActivityAt: number;
  completedCount: number; // Tasks completed during this session
}

// Store state
interface CLISessionStoreState {
  sessions: Record<CLISessionId, CLISessionState>;

  // Actions
  initSession: (sessionId: CLISessionId, projectPath: string) => void;
  clearSession: (sessionId: CLISessionId) => void;
  addTasksToSession: (sessionId: CLISessionId, tasks: QueuedTask[]) => void;
  updateTaskStatus: (sessionId: CLISessionId, taskId: string, status: QueuedTask['status']) => void;
  removeTask: (sessionId: CLISessionId, taskId: string) => void;
  setClaudeSessionId: (sessionId: CLISessionId, claudeSessionId: string) => void;
  setRunning: (sessionId: CLISessionId, isRunning: boolean) => void;
  setAutoStart: (sessionId: CLISessionId, autoStart: boolean) => void;
  updateLastActivity: (sessionId: CLISessionId) => void;

  // Recovery
  getActiveSessions: () => CLISessionState[];
  getSessionsNeedingRecovery: () => CLISessionState[];
}

// Default session state
const createDefaultSession = (id: CLISessionId): CLISessionState => ({
  id,
  projectPath: null,
  claudeSessionId: null,
  queue: [],
  isRunning: false,
  autoStart: false,
  createdAt: 0,
  lastActivityAt: 0,
  completedCount: 0,
});

// Session IDs
const SESSION_IDS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

// Create store with persistence
export const useCLISessionStore = create<CLISessionStoreState>()(
  persist(
    (set, get) => ({
      sessions: {
        cliSession1: createDefaultSession('cliSession1'),
        cliSession2: createDefaultSession('cliSession2'),
        cliSession3: createDefaultSession('cliSession3'),
        cliSession4: createDefaultSession('cliSession4'),
      },

      initSession: (sessionId, projectPath) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              projectPath,
              createdAt: Date.now(),
              lastActivityAt: Date.now(),
            },
          },
        }));
      },

      clearSession: (sessionId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: createDefaultSession(sessionId),
          },
        }));
      },

      addTasksToSession: (sessionId, tasks) => {
        set((state) => {
          const session = state.sessions[sessionId];
          const existingIds = new Set(session.queue.map((t) => t.id));
          const newTasks = tasks.filter((t) => !existingIds.has(t.id));

          if (newTasks.length === 0) return state;

          // Use first task's project path if not set
          const projectPath = session.projectPath || newTasks[0]?.projectPath || null;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                projectPath,
                queue: [...session.queue, ...newTasks],
                lastActivityAt: Date.now(),
              },
            },
          };
        });
      },

      updateTaskStatus: (sessionId, taskId, status) => {
        set((state) => {
          const session = state.sessions[sessionId];
          const task = session.queue.find((t) => t.id === taskId);
          // Increment completed count only when transitioning to 'completed'
          const wasCompleted = task?.status === 'completed';
          const isNowCompleted = status === 'completed';
          const incrementCompleted = !wasCompleted && isNowCompleted ? 1 : 0;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                queue: session.queue.map((t) =>
                  t.id === taskId
                    ? {
                        ...t,
                        status,
                        ...(status === 'running' ? { startedAt: Date.now() } : {}),
                        ...(status === 'completed' || status === 'failed'
                          ? { completedAt: Date.now() }
                          : {}),
                      }
                    : t
                ),
                completedCount: session.completedCount + incrementCompleted,
                lastActivityAt: Date.now(),
              },
            },
          };
        });
      },

      removeTask: (sessionId, taskId) => {
        set((state) => {
          const session = state.sessions[sessionId];
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                queue: session.queue.filter((t) => t.id !== taskId),
                lastActivityAt: Date.now(),
              },
            },
          };
        });
      },

      setClaudeSessionId: (sessionId, claudeSessionId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              claudeSessionId,
              lastActivityAt: Date.now(),
            },
          },
        }));
      },

      setRunning: (sessionId, isRunning) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              isRunning,
              lastActivityAt: Date.now(),
            },
          },
        }));
      },

      setAutoStart: (sessionId, autoStart) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              autoStart,
              lastActivityAt: Date.now(),
            },
          },
        }));
      },

      updateLastActivity: (sessionId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              lastActivityAt: Date.now(),
            },
          },
        }));
      },

      getActiveSessions: () => {
        const { sessions } = get();
        return SESSION_IDS.map((id) => sessions[id]).filter(
          (s) => s.isRunning || s.queue.some((t) => t.status === 'running')
        );
      },

      getSessionsNeedingRecovery: () => {
        const { sessions } = get();
        return SESSION_IDS.map((id) => sessions[id]).filter((s) => {
          // Session needs recovery if:
          // 1. It has a running task but isRunning is false (crashed mid-execution)
          // 2. It has pending tasks and autoStart was true
          const hasRunningTask = s.queue.some((t) => t.status === 'running');
          const hasPendingTasks = s.queue.some((t) => t.status === 'pending');

          return hasRunningTask || (hasPendingTasks && s.autoStart);
        });
      },
    }),
    {
      name: 'cli-session-storage',
      version: 2, // Bump when adding new fields
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist session data, not ephemeral state
        sessions: state.sessions,
      }),
      // Handle migration from older versions
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { sessions?: Record<string, CLISessionState> };
        if (version < 2 && state?.sessions) {
          // Add completedCount to sessions from v1
          const migratedSessions = { ...state.sessions };
          for (const id of Object.keys(migratedSessions)) {
            if (migratedSessions[id] && migratedSessions[id].completedCount === undefined) {
              migratedSessions[id] = { ...migratedSessions[id], completedCount: 0 };
            }
          }
          return { sessions: migratedSessions };
        }
        return state;
      },
    }
  )
);

// Session IDs for iteration
const ALL_SESSION_IDS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

// Hooks for common operations
export function useSession(sessionId: CLISessionId) {
  return useCLISessionStore((state) => state.sessions[sessionId]);
}

export function useAllSessions() {
  return useCLISessionStore((state) => state.sessions);
}

/**
 * Get active sessions - NOT a hook, just a getter function.
 * Use in effects or callbacks, not in render.
 */
export function getActiveSessions(): CLISessionState[] {
  return useCLISessionStore.getState().getActiveSessions();
}

/**
 * Get sessions needing recovery - NOT a hook, just a getter function.
 * Use in effects or callbacks, not in render.
 */
export function getSessionsNeedingRecovery(): CLISessionState[] {
  return useCLISessionStore.getState().getSessionsNeedingRecovery();
}
