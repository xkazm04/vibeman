/**
 * Session Batch Store
 * Manages state for Claude Code sessions with --resume flag support
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export type SessionBatchId = 'sessionBatch1' | 'sessionBatch2' | 'sessionBatch3' | 'sessionBatch4';

export type SessionTaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export type SessionBatchStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface SessionTask {
  id: string;                      // Task ID (projectId:requirementName)
  requirementName: string;         // Human-readable name
  status: SessionTaskStatus;
  claudeSessionId?: string;        // Captured from execution
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
}

export interface SessionBatchState {
  id: string;                      // Database session ID
  internalSessionId: string;       // Internal UUID (created on demand)
  claudeSessionId: string | null;  // Claude CLI session ID (captured after first execution)
  name: string;                    // User-friendly session name
  projectId: string;               // Project this session belongs to
  projectPath: string;             // Project path for execution
  tasks: SessionTask[];
  status: SessionBatchStatus;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Store Interface
// ============================================================================

interface SessionBatchStoreState {
  // Session batches (max 4)
  sessionBatches: Record<SessionBatchId, SessionBatchState | null>;

  // Actions - Session lifecycle
  createSession: (
    batchId: SessionBatchId,
    projectId: string,
    projectPath: string,
    name: string,
    taskId: string,
    requirementName: string
  ) => string; // Returns internal session ID

  addTaskToSession: (
    batchId: SessionBatchId,
    taskId: string,
    requirementName: string
  ) => void;

  removeTaskFromSession: (batchId: SessionBatchId, taskId: string) => void;

  // Actions - Session state
  updateSessionClaudeId: (batchId: SessionBatchId, claudeSessionId: string) => void;
  updateSessionStatus: (batchId: SessionBatchId, status: SessionBatchStatus) => void;
  updateTaskStatus: (
    batchId: SessionBatchId,
    taskId: string,
    status: SessionTaskStatus,
    extras?: { claudeSessionId?: string; errorMessage?: string }
  ) => void;

  // Actions - Session control
  startSession: (batchId: SessionBatchId) => void;
  pauseSession: (batchId: SessionBatchId) => void;
  compactSession: (batchId: SessionBatchId) => void; // Remove completed tasks
  clearSession: (batchId: SessionBatchId) => void;
  clearAllSessions: () => void;
  renameSession: (batchId: SessionBatchId, newName: string) => void;

  // Helpers
  getNextAvailableSessionBatchId: () => SessionBatchId | null;
  getActiveSessionBatches: () => SessionBatchId[];
  getSessionByInternalId: (internalId: string) => { batchId: SessionBatchId; session: SessionBatchState } | null;
  getSessionByClaudeId: (claudeSessionId: string) => { batchId: SessionBatchId; session: SessionBatchState } | null;
  isTaskInSession: (taskId: string) => SessionBatchId | null;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useSessionBatchStore = create<SessionBatchStoreState>()(
  persist(
    (set, get) => ({
      sessionBatches: {
        sessionBatch1: null,
        sessionBatch2: null,
        sessionBatch3: null,
        sessionBatch4: null,
      },

      createSession: (batchId, projectId, projectPath, name, taskId, requirementName) => {
        const internalSessionId = uuidv4();
        const now = Date.now();

        set((state) => ({
          sessionBatches: {
            ...state.sessionBatches,
            [batchId]: {
              id: uuidv4(), // Database ID
              internalSessionId,
              claudeSessionId: null,
              name,
              projectId,
              projectPath,
              tasks: [{
                id: taskId,
                requirementName,
                status: 'pending' as const,
              }],
              status: 'pending' as const,
              createdAt: now,
              updatedAt: now,
            },
          },
        }));

        return internalSessionId;
      },

      addTaskToSession: (batchId, taskId, requirementName) => {
        set((state) => {
          const session = state.sessionBatches[batchId];
          if (!session) return state;

          // Don't add if already in session
          if (session.tasks.some(t => t.id === taskId)) return state;

          return {
            sessionBatches: {
              ...state.sessionBatches,
              [batchId]: {
                ...session,
                tasks: [
                  ...session.tasks,
                  {
                    id: taskId,
                    requirementName,
                    status: 'pending' as const,
                  },
                ],
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      removeTaskFromSession: (batchId, taskId) => {
        set((state) => {
          const session = state.sessionBatches[batchId];
          if (!session) return state;

          const updatedTasks = session.tasks.filter(t => t.id !== taskId);

          // If no tasks left, clear the session
          if (updatedTasks.length === 0) {
            return {
              sessionBatches: {
                ...state.sessionBatches,
                [batchId]: null,
              },
            };
          }

          return {
            sessionBatches: {
              ...state.sessionBatches,
              [batchId]: {
                ...session,
                tasks: updatedTasks,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      updateSessionClaudeId: (batchId, claudeSessionId) => {
        set((state) => {
          const session = state.sessionBatches[batchId];
          if (!session) return state;

          return {
            sessionBatches: {
              ...state.sessionBatches,
              [batchId]: {
                ...session,
                claudeSessionId,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      updateSessionStatus: (batchId, status) => {
        set((state) => {
          const session = state.sessionBatches[batchId];
          if (!session) return state;

          return {
            sessionBatches: {
              ...state.sessionBatches,
              [batchId]: {
                ...session,
                status,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      updateTaskStatus: (batchId, taskId, status, extras) => {
        set((state) => {
          const session = state.sessionBatches[batchId];
          if (!session) return state;

          const updatedTasks = session.tasks.map(task => {
            if (task.id !== taskId) return task;

            return {
              ...task,
              status,
              claudeSessionId: extras?.claudeSessionId ?? task.claudeSessionId,
              errorMessage: extras?.errorMessage,
              startedAt: status === 'running' ? Date.now() : task.startedAt,
              completedAt: (status === 'completed' || status === 'failed') ? Date.now() : task.completedAt,
            };
          });

          // Auto-update session status based on task statuses
          let sessionStatus = session.status;
          const hasRunning = updatedTasks.some(t => t.status === 'running');
          const allCompleted = updatedTasks.every(t => t.status === 'completed');
          const hasFailed = updatedTasks.some(t => t.status === 'failed');

          if (hasRunning) {
            sessionStatus = 'running';
          } else if (allCompleted) {
            sessionStatus = 'completed';
          } else if (hasFailed && !updatedTasks.some(t => t.status === 'pending')) {
            sessionStatus = 'failed';
          }

          return {
            sessionBatches: {
              ...state.sessionBatches,
              [batchId]: {
                ...session,
                tasks: updatedTasks,
                status: sessionStatus,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      startSession: (batchId) => {
        set((state) => {
          const session = state.sessionBatches[batchId];
          if (!session) return state;

          return {
            sessionBatches: {
              ...state.sessionBatches,
              [batchId]: {
                ...session,
                status: 'running',
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      pauseSession: (batchId) => {
        set((state) => {
          const session = state.sessionBatches[batchId];
          if (!session) return state;

          return {
            sessionBatches: {
              ...state.sessionBatches,
              [batchId]: {
                ...session,
                status: 'paused',
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      compactSession: (batchId) => {
        set((state) => {
          const session = state.sessionBatches[batchId];
          if (!session) return state;

          // Remove completed tasks
          const remainingTasks = session.tasks.filter(t => t.status !== 'completed');

          // If no tasks left, clear the session
          if (remainingTasks.length === 0) {
            return {
              sessionBatches: {
                ...state.sessionBatches,
                [batchId]: null,
              },
            };
          }

          return {
            sessionBatches: {
              ...state.sessionBatches,
              [batchId]: {
                ...session,
                tasks: remainingTasks,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      clearSession: (batchId) => {
        set((state) => ({
          sessionBatches: {
            ...state.sessionBatches,
            [batchId]: null,
          },
        }));
      },

      clearAllSessions: () => {
        set({
          sessionBatches: {
            sessionBatch1: null,
            sessionBatch2: null,
            sessionBatch3: null,
            sessionBatch4: null,
          },
        });
      },

      renameSession: (batchId, newName) => {
        set((state) => {
          const session = state.sessionBatches[batchId];
          if (!session) return state;

          return {
            sessionBatches: {
              ...state.sessionBatches,
              [batchId]: {
                ...session,
                name: newName,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      getNextAvailableSessionBatchId: () => {
        const state = get();
        const batchIds: SessionBatchId[] = ['sessionBatch1', 'sessionBatch2', 'sessionBatch3', 'sessionBatch4'];

        for (const id of batchIds) {
          if (!state.sessionBatches[id]) {
            return id;
          }
        }
        return null;
      },

      getActiveSessionBatches: () => {
        const state = get();
        const batchIds: SessionBatchId[] = ['sessionBatch1', 'sessionBatch2', 'sessionBatch3', 'sessionBatch4'];

        return batchIds.filter(id => state.sessionBatches[id] !== null);
      },

      getSessionByInternalId: (internalId) => {
        const state = get();
        const batchIds: SessionBatchId[] = ['sessionBatch1', 'sessionBatch2', 'sessionBatch3', 'sessionBatch4'];

        for (const batchId of batchIds) {
          const session = state.sessionBatches[batchId];
          if (session?.internalSessionId === internalId) {
            return { batchId, session };
          }
        }
        return null;
      },

      getSessionByClaudeId: (claudeSessionId) => {
        const state = get();
        const batchIds: SessionBatchId[] = ['sessionBatch1', 'sessionBatch2', 'sessionBatch3', 'sessionBatch4'];

        for (const batchId of batchIds) {
          const session = state.sessionBatches[batchId];
          if (session?.claudeSessionId === claudeSessionId) {
            return { batchId, session };
          }
        }
        return null;
      },

      isTaskInSession: (taskId) => {
        const state = get();
        const batchIds: SessionBatchId[] = ['sessionBatch1', 'sessionBatch2', 'sessionBatch3', 'sessionBatch4'];

        for (const batchId of batchIds) {
          const session = state.sessionBatches[batchId];
          if (session?.tasks.some(t => t.id === taskId)) {
            return batchId;
          }
        }
        return null;
      },
    }),
    {
      name: 'session-batch-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export function useSessionBatch(batchId: SessionBatchId): SessionBatchState | null {
  return useSessionBatchStore((state) => state.sessionBatches[batchId]);
}

export function useAllSessionBatches(): Record<SessionBatchId, SessionBatchState | null> {
  return useSessionBatchStore((state) => state.sessionBatches);
}

export function useTaskSessionBatchId(taskId: string): SessionBatchId | null {
  return useSessionBatchStore((state) => state.isTaskInSession(taskId));
}
