/**
 * CLI Session Store
 *
 * Zustand store with localStorage persistence for CLI sessions.
 * Enables background processing and recovery from browser refresh.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { QueuedTask } from '../types';
import type { SkillId } from '../skills';

// Session IDs
export type CLISessionId = 'cliSession1' | 'cliSession2' | 'cliSession3' | 'cliSession4';

// Git config for CLI sessions
export interface CLIGitConfig {
  commands: string[];
  commitMessageTemplate: string;
}

// Recovery state (ephemeral, not persisted)
export interface RecoveryState {
  inProgress: boolean;
  endTime: number;
}

// Session state
export interface CLISessionState {
  id: CLISessionId;
  projectPath: string | null;
  projectId: string | null; // For git API operations
  claudeSessionId: string | null; // For --resume flag
  currentExecutionId: string | null; // Active execution ID for reconnection
  currentTaskId: string | null; // Task ID associated with current execution
  queue: QueuedTask[];
  isRunning: boolean;
  autoStart: boolean;
  createdAt: number;
  lastActivityAt: number;
  completedCount: number; // Tasks completed during this session
  enabledSkills: SkillId[]; // Active skills for this session
  gitEnabled: boolean; // Whether to auto-commit after tasks
  gitConfig: CLIGitConfig | null; // Git commands and template
}

// Store state
interface CLISessionStoreState {
  sessions: Record<CLISessionId, CLISessionState>;
  recoveryState: RecoveryState;

  // Actions
  initSession: (sessionId: CLISessionId, projectPath: string) => void;
  clearSession: (sessionId: CLISessionId) => void;
  addTasksToSession: (sessionId: CLISessionId, tasks: QueuedTask[]) => void;
  updateTaskStatus: (sessionId: CLISessionId, taskId: string, status: QueuedTask['status']) => void;
  removeTask: (sessionId: CLISessionId, taskId: string) => void;
  setClaudeSessionId: (sessionId: CLISessionId, claudeSessionId: string) => void;
  setCurrentExecution: (sessionId: CLISessionId, executionId: string | null, taskId: string | null) => void;
  setRunning: (sessionId: CLISessionId, isRunning: boolean) => void;
  setAutoStart: (sessionId: CLISessionId, autoStart: boolean) => void;
  updateLastActivity: (sessionId: CLISessionId) => void;
  toggleSkill: (sessionId: CLISessionId, skillId: SkillId) => void;
  setSkills: (sessionId: CLISessionId, skillIds: SkillId[]) => void;
  setProjectId: (sessionId: CLISessionId, projectId: string | null) => void;
  setGitEnabled: (sessionId: CLISessionId, enabled: boolean) => void;
  setGitConfig: (sessionId: CLISessionId, config: CLIGitConfig | null) => void;

  // Recovery
  startRecovery: (durationMs?: number) => void;
  endRecovery: () => void;
  getActiveSessions: () => CLISessionState[];
  getSessionsNeedingRecovery: () => CLISessionState[];
}

// Default session state
const createDefaultSession = (id: CLISessionId): CLISessionState => ({
  id,
  projectPath: null,
  projectId: null,
  claudeSessionId: null,
  currentExecutionId: null,
  currentTaskId: null,
  queue: [],
  isRunning: false,
  autoStart: false,
  createdAt: 0,
  lastActivityAt: 0,
  completedCount: 0,
  enabledSkills: [],
  gitEnabled: false,
  gitConfig: null,
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
      recoveryState: {
        inProgress: false,
        endTime: 0,
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

          // Use first task's project path and id if not set
          const projectPath = session.projectPath || newTasks[0]?.projectPath || null;
          const projectId = session.projectId || newTasks[0]?.projectId || null;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                projectPath,
                projectId,
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

      setCurrentExecution: (sessionId, executionId, taskId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              currentExecutionId: executionId,
              currentTaskId: taskId,
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

      toggleSkill: (sessionId, skillId) => {
        set((state) => {
          const session = state.sessions[sessionId];
          const hasSkill = session.enabledSkills.includes(skillId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                enabledSkills: hasSkill
                  ? session.enabledSkills.filter((s) => s !== skillId)
                  : [...session.enabledSkills, skillId],
              },
            },
          };
        });
      },

      setSkills: (sessionId, skillIds) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              enabledSkills: skillIds,
            },
          },
        }));
      },

      setProjectId: (sessionId, projectId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              projectId,
              lastActivityAt: Date.now(),
            },
          },
        }));
      },

      setGitEnabled: (sessionId, enabled) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              gitEnabled: enabled,
              lastActivityAt: Date.now(),
            },
          },
        }));
      },

      setGitConfig: (sessionId, config) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              gitConfig: config,
              lastActivityAt: Date.now(),
            },
          },
        }));
      },

      startRecovery: (durationMs = 10000) => {
        set({
          recoveryState: {
            inProgress: true,
            endTime: Date.now() + durationMs,
          },
        });
      },

      endRecovery: () => {
        set({
          recoveryState: {
            inProgress: false,
            endTime: 0,
          },
        });
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
      version: 5, // Bump when adding new fields
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist session data, not ephemeral state
        sessions: state.sessions,
      }),
      // Handle migration from older versions
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { sessions?: Record<string, CLISessionState> };
        if (state?.sessions) {
          const migratedSessions = { ...state.sessions };
          for (const id of Object.keys(migratedSessions)) {
            const session = migratedSessions[id];
            if (session) {
              // v1 -> v2: Add completedCount
              if (version < 2 && session.completedCount === undefined) {
                migratedSessions[id] = { ...session, completedCount: 0 };
              }
              // v2 -> v3: Add enabledSkills
              if (version < 3 && session.enabledSkills === undefined) {
                migratedSessions[id] = { ...migratedSessions[id], enabledSkills: [] };
              }
              // v3 -> v4: Add currentExecutionId and currentTaskId for background processing
              if (version < 4) {
                const existingSession = migratedSessions[id] as CLISessionState & { currentExecutionId?: string | null; currentTaskId?: string | null };
                migratedSessions[id] = {
                  ...migratedSessions[id],
                  currentExecutionId: existingSession.currentExecutionId ?? null,
                  currentTaskId: existingSession.currentTaskId ?? null,
                };
              }
              // v4 -> v5: Add projectId, gitEnabled, gitConfig for git operations
              if (version < 5) {
                const existingSession = migratedSessions[id] as CLISessionState & {
                  projectId?: string | null;
                  gitEnabled?: boolean;
                  gitConfig?: CLIGitConfig | null;
                };
                migratedSessions[id] = {
                  ...migratedSessions[id],
                  projectId: existingSession.projectId ?? null,
                  gitEnabled: existingSession.gitEnabled ?? false,
                  gitConfig: existingSession.gitConfig ?? null,
                };
              }
            }
          }
          return { sessions: migratedSessions };
        }
        return state;
      },
    }
  )
);

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
