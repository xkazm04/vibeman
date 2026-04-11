/**
 * Manual Session Store
 *
 * Manages interactive Claude Code CLI sessions where the user
 * sends messages directly to Claude (multi-turn conversation).
 * Separate from the automated cliSessionStore's 4-slot system.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig } from '@/stores/utils/persistence';
import type {
  ManualSession,
  ManualSessionEvent,
  ManualSessionStatus,
  PendingToolApproval,
} from '../lib/manualSession.types';
import {
  startInteractiveClaude,
  writeToClaudeStdin,
  listenToExecution,
  isTauriTerminalAvailable,
  interactiveSessionAlive,
} from '@/lib/tauri/tauriTerminalStrategy';
import type { ExecutionEvent } from '@/lib/tauri/tauriTerminalStrategy';

const MAX_PERSISTED_EVENTS = 100;
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Store state
// ============================================================================

interface ManualSessionState {
  sessions: Record<string, ManualSession>;
  activeSessionId: string | null;
  /** Unlisten handles for Tauri event listeners, keyed by session ID */
  _unlisteners: Record<string, (() => void) | null>;
}

interface ManualSessionActions {
  /** Create and start a new interactive session */
  createSession: (params: {
    projectId: string;
    projectPath: string;
    projectName: string;
    label?: string;
  }) => Promise<string | null>;

  /** Send a user message to an active session */
  sendMessage: (sessionId: string, text: string) => Promise<void>;

  /** Select a session as active (for modal display) */
  selectSession: (sessionId: string | null) => void;

  /** Close and clean up a session */
  closeSession: (sessionId: string) => void;

  /** Update session status */
  updateStatus: (sessionId: string, status: ManualSessionStatus) => void;

  /** Approve all pending tool uses (write "y" to stdin) */
  approveToolUse: (sessionId: string) => Promise<void>;

  /** Deny all pending tool uses (write "n" to stdin) */
  denyToolUse: (sessionId: string) => Promise<void>;

  /** Recover persisted sessions on page load — reconnect or mark dead */
  recoverSessions: () => Promise<void>;

  /** Get ordered list of sessions (newest first) */
  getSessionList: () => ManualSession[];
}

// ============================================================================
// Event processing
// ============================================================================

function processExecutionEvent(event: ExecutionEvent): ManualSessionEvent {
  const data = event.data as Record<string, unknown>;
  const timestamp = Date.now();

  if (event.event_type === 'input_needed') {
    return { timestamp, type: 'input_needed', data };
  }
  if (event.event_type === 'approval_needed') {
    return { timestamp, type: 'approval_needed', data };
  }
  if (event.event_type === 'error') {
    return { timestamp, type: 'error', data };
  }
  if (event.event_type === 'data' && data) {
    // Parse stream-json event type from the data payload
    const eventType = (data.type as string) || 'raw';
    if (eventType === 'system' || eventType === 'assistant' || eventType === 'user' || eventType === 'result') {
      return { timestamp, type: eventType, data };
    }
  }

  return { timestamp, type: 'raw', data: event.data };
}

/** Extract pending tool approvals from an approval_needed event */
function extractPendingApprovals(event: ManualSessionEvent): PendingToolApproval[] {
  if (event.type !== 'approval_needed') return [];
  const data = event.data as Record<string, unknown>;
  const tools = data?.tools as Array<Record<string, unknown>> | undefined;
  if (!tools) return [];
  return tools.map((t) => ({
    toolUseId: (t.toolUseId as string) || '',
    toolName: (t.toolName as string) || 'unknown',
    toolInput: (t.toolInput as Record<string, unknown>) || {},
  }));
}

function extractSessionId(event: ManualSessionEvent): string | null {
  const data = event.data as Record<string, unknown>;
  if (event.type === 'system' && data?.session_id) {
    return data.session_id as string;
  }
  if (event.type === 'result' && data?.session_id) {
    return data.session_id as string;
  }
  return null;
}

// ============================================================================
// Store
// ============================================================================

export const useManualSessionStore = create<ManualSessionState & ManualSessionActions>()(
  persist(
  (set, get) => ({
    sessions: {},
    activeSessionId: null,
    _unlisteners: {},

    createSession: async ({ projectId, projectPath, projectName, label }) => {
      if (!isTauriTerminalAvailable()) {
        console.warn('Manual sessions require Tauri runtime');
        return null;
      }

      const sessionId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const now = Date.now();

      const session: ManualSession = {
        id: sessionId,
        executionId: null,
        pid: null,
        projectId,
        projectPath,
        projectName,
        status: 'starting',
        events: [],
        createdAt: now,
        lastActivityAt: now,
        claudeSessionId: null,
        label: label || `Session ${Object.keys(get().sessions).length + 1}`,
        pendingApprovals: [],
      };

      set((state) => ({
        sessions: { ...state.sessions, [sessionId]: session },
        activeSessionId: sessionId,
      }));

      try {
        const result = await startInteractiveClaude({
          project_path: projectPath,
          project_id: projectId,
        });

        // Listen to execution events
        const unlisten = await listenToExecution(result.execution_id, (event) => {
          const processed = processExecutionEvent(event);
          const claudeSessionId = extractSessionId(processed);

          set((state) => {
            const s = state.sessions[sessionId];
            if (!s) return state;

            let newStatus = s.status;
            let newPendingApprovals = s.pendingApprovals;

            if (event.event_type === 'approval_needed') {
              newStatus = 'waiting_approval';
              newPendingApprovals = extractPendingApprovals(processed);
            } else if (event.event_type === 'input_needed') {
              newStatus = 'waiting_input';
              newPendingApprovals = [];
            } else if (event.event_type === 'data') {
              newStatus = 'running';
            } else if (event.event_type === 'completed') {
              newStatus = 'completed';
            } else if (event.event_type === 'error') {
              newStatus = 'failed';
            }

            return {
              sessions: {
                ...state.sessions,
                [sessionId]: {
                  ...s,
                  status: newStatus,
                  pendingApprovals: newPendingApprovals,
                  events: [...s.events, processed],
                  lastActivityAt: Date.now(),
                  claudeSessionId: claudeSessionId || s.claudeSessionId,
                },
              },
            };
          });
        });

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              executionId: result.execution_id,
              pid: result.pid,
              status: 'waiting_input', // Interactive session starts waiting for first message
            },
          },
          _unlisteners: { ...state._unlisteners, [sessionId]: unlisten },
        }));

        return sessionId;
      } catch (err) {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              status: 'failed',
              events: [
                ...state.sessions[sessionId].events,
                {
                  timestamp: Date.now(),
                  type: 'error' as const,
                  data: { error: String(err) },
                },
              ],
            },
          },
        }));
        return null;
      }
    },

    sendMessage: async (sessionId, text) => {
      const session = get().sessions[sessionId];
      if (!session?.executionId) return;

      // Add user message to events immediately
      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...state.sessions[sessionId],
            status: 'running',
            events: [
              ...state.sessions[sessionId].events,
              {
                timestamp: Date.now(),
                type: 'user' as const,
                data: { text },
              },
            ],
            lastActivityAt: Date.now(),
          },
        },
      }));

      try {
        await writeToClaudeStdin(session.executionId, text);
      } catch (err) {
        console.error('Failed to write to Claude stdin:', err);
      }
    },

    approveToolUse: async (sessionId) => {
      const session = get().sessions[sessionId];
      if (!session?.executionId || session.status !== 'waiting_approval') return;

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...state.sessions[sessionId],
            status: 'running',
            pendingApprovals: [],
          },
        },
      }));

      try {
        await writeToClaudeStdin(session.executionId, 'y');
      } catch (err) {
        console.error('Failed to approve tool use:', err);
      }
    },

    denyToolUse: async (sessionId) => {
      const session = get().sessions[sessionId];
      if (!session?.executionId || session.status !== 'waiting_approval') return;

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...state.sessions[sessionId],
            status: 'running',
            pendingApprovals: [],
          },
        },
      }));

      try {
        await writeToClaudeStdin(session.executionId, 'n');
      } catch (err) {
        console.error('Failed to deny tool use:', err);
      }
    },

    selectSession: (sessionId) => {
      set({ activeSessionId: sessionId });
    },

    closeSession: (sessionId) => {
      const unlistener = get()._unlisteners[sessionId];
      if (unlistener) unlistener();

      set((state) => {
        const { [sessionId]: _removed, ...remaining } = state.sessions;
        const { [sessionId]: _removedUl, ...remainingUl } = state._unlisteners;
        return {
          sessions: remaining,
          _unlisteners: remainingUl,
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
        };
      });
    },

    updateStatus: (sessionId, status) => {
      set((state) => {
        const s = state.sessions[sessionId];
        if (!s) return state;
        return {
          sessions: {
            ...state.sessions,
            [sessionId]: { ...s, status, lastActivityAt: Date.now() },
          },
        };
      });
    },

    recoverSessions: async () => {
      const sessions = get().sessions;
      const now = Date.now();

      for (const [sessionId, session] of Object.entries(sessions)) {
        // Remove stale sessions (> 24h)
        if (now - session.createdAt > SESSION_MAX_AGE_MS) {
          set((state) => {
            const { [sessionId]: _, ...remaining } = state.sessions;
            return { sessions: remaining };
          });
          continue;
        }

        // Check if active sessions are still running
        const activeStatuses: ManualSessionStatus[] = ['running', 'waiting_input', 'waiting_approval', 'starting'];
        if (!activeStatuses.includes(session.status) || !session.executionId) continue;

        try {
          const alive = await interactiveSessionAlive(session.executionId);
          if (alive) {
            // Reconnect event listener
            const unlisten = await listenToExecution(session.executionId, (event) => {
              const processed = processExecutionEvent(event);
              const claudeSessionId = extractSessionId(processed);
              const approvals = extractPendingApprovals(processed);

              set((state) => {
                const s = state.sessions[sessionId];
                if (!s) return state;

                let newStatus = s.status;
                let newPendingApprovals = s.pendingApprovals;

                if (event.event_type === 'approval_needed') {
                  newStatus = 'waiting_approval';
                  newPendingApprovals = approvals;
                } else if (event.event_type === 'input_needed') {
                  newStatus = 'waiting_input';
                  newPendingApprovals = [];
                } else if (event.event_type === 'data') {
                  newStatus = 'running';
                } else if (event.event_type === 'completed') {
                  newStatus = 'completed';
                } else if (event.event_type === 'error') {
                  newStatus = 'failed';
                }

                return {
                  sessions: {
                    ...state.sessions,
                    [sessionId]: {
                      ...s,
                      status: newStatus,
                      pendingApprovals: newPendingApprovals,
                      events: [...s.events, processed],
                      lastActivityAt: Date.now(),
                      claudeSessionId: claudeSessionId || s.claudeSessionId,
                    },
                  },
                };
              });
            });

            set((state) => ({
              _unlisteners: { ...state._unlisteners, [sessionId]: unlisten },
            }));
          } else {
            // Process died — mark as completed
            set((state) => ({
              sessions: {
                ...state.sessions,
                [sessionId]: {
                  ...state.sessions[sessionId],
                  status: 'completed',
                  lastActivityAt: now,
                },
              },
            }));
          }
        } catch {
          // Can't check (Tauri not available) — mark as completed
          set((state) => ({
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...state.sessions[sessionId],
                status: 'completed',
                lastActivityAt: now,
              },
            },
          }));
        }
      }
    },

    getSessionList: () => {
      return Object.values(get().sessions).sort(
        (a, b) => b.createdAt - a.createdAt,
      );
    },
  })),
  createPersistConfig<ManualSessionState & ManualSessionActions>('manual-sessions', {
    category: 'session_work',
    version: 1,
    partialize: (state) => ({
      // Only persist sessions, not ephemeral state
      sessions: Object.fromEntries(
        Object.entries(state.sessions).map(([id, session]) => [
          id,
          { ...session, events: session.events.slice(-MAX_PERSISTED_EVENTS) },
        ]),
      ),
    }) as Partial<ManualSessionState & ManualSessionActions>,
  }),
);
