/**
 * Annette 2.0 Store
 * Zustand store for Annette chat UI state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AnnetteNotification } from '@/lib/annette/notificationEngine';

// ============================================================================
// TYPES
// ============================================================================

export interface QuickOption {
  label: string;
  message: string;
}

/**
 * CLI Execution info for inline terminal display
 */
export interface CLIExecutionInfo {
  showCLI: boolean;
  requirementName: string;
  projectPath: string;
  projectId: string;
  executionId?: string;
  autoStart: boolean;
}

/** Payload attached to system messages that represent decision events */
export interface DecisionEvent {
  action: 'accepted' | 'dismissed' | 'snoozed' | 'arrived';
  notificationType: AnnetteNotification['type'];
  notificationTitle: string;
  notificationMessage: string;
  suggestedAction?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{ name: string; input: Record<string, unknown>; result?: string }>;
  tokensUsed?: { input: number; output: number; total: number };
  quickOptions?: QuickOption[];
  /** CLI executions to display inline (parsed from tool results) */
  cliExecutions?: CLIExecutionInfo[];
  /** Decision event metadata for system messages */
  decisionEvent?: DecisionEvent;
  timestamp: string;
  isStreaming?: boolean;
}

interface AnnetteState {
  // Chat messages
  messages: ChatMessage[];

  // Session
  sessionId: string | null;
  projectId: string | null;

  // UI state
  isLoading: boolean;
  isRecording: boolean;
  error: string | null;

  // Notifications
  notifications: AnnetteNotification[];
  notificationsMuted: boolean;

  // Voice
  isSpeaking: boolean;

  // Audio
  audioEnabled: boolean;

  // Widget (TopBar minimized)
  isWidgetOpen: boolean;
  unreadCount: number;

  // Decision panel
  snoozedIds: string[];
  snoozeExpiry: Record<string, number>; // id -> timestamp when snooze expires
}

interface AnnetteActions {
  // Messages
  addMessage: (message: ChatMessage) => void;
  updateLastAssistant: (content: string) => void;
  clearMessages: () => void;

  // Session
  setSession: (sessionId: string, projectId: string) => void;
  clearSession: () => void;

  // Chat
  sendMessage: (text: string) => Promise<void>;

  // UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Voice
  setRecording: (recording: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  toggleAudio: () => void;

  // Notifications
  addNotification: (notification: AnnetteNotification) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  toggleMute: () => void;

  // Widget
  toggleWidget: () => void;
  closeWidget: () => void;
  markAllRead: () => void;

  // Decision panel
  snoozeNotification: (id: string) => void;
  executeAction: (notification: AnnetteNotification) => Promise<void>;
  getActiveNotifications: () => AnnetteNotification[];

  // Reset
  reset: () => void;
}

type AnnetteStore = AnnetteState & AnnetteActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AnnetteState = {
  messages: [],
  sessionId: null,
  projectId: null,
  isLoading: false,
  isRecording: false,
  error: null,
  notifications: [],
  notificationsMuted: false,
  isSpeaking: false,
  audioEnabled: false,
  isWidgetOpen: false,
  unreadCount: 0,
  snoozedIds: [],
  snoozeExpiry: {},
};

// ============================================================================
// STORE
// ============================================================================

export const useAnnetteStore = create<AnnetteStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ─── Messages ───

      addMessage: (message) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      updateLastAssistant: (content) => {
        set((state) => {
          const msgs = [...state.messages];
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
            msgs[lastIdx] = { ...msgs[lastIdx], content, isStreaming: false };
          }
          return { messages: msgs };
        });
      },

      clearMessages: () => set({ messages: [] }),

      // ─── Session ───

      setSession: (sessionId, projectId) => set({ sessionId, projectId }),
      clearSession: () => set({ sessionId: null, projectId: null, messages: [] }),

      // ─── Chat ───

      sendMessage: async (text) => {
        const { projectId, messages, sessionId, audioEnabled } = get();
        if (!projectId) {
          set({ error: 'No project selected' });
          return;
        }

        // Add user message
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: text,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, userMsg],
          isLoading: true,
          error: null,
        }));

        try {
          // Build conversation history from recent messages (exclude system messages)
          const conversationHistory = messages
            .filter(m => m.role !== 'system')
            .slice(-10)
            .map(m => ({
              role: m.role,
              content: m.content,
            }));

          const response = await fetch('/api/annette/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              projectId,
              sessionId,
              conversationHistory,
              audioMode: audioEnabled,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();

          // Parse tool results for CLI execution info
          const cliExecutions: CLIExecutionInfo[] = [];
          if (data.toolsUsed && Array.isArray(data.toolsUsed)) {
            for (const tool of data.toolsUsed) {
              if (tool.result) {
                try {
                  const parsed = JSON.parse(tool.result);
                  if (parsed.cliExecution?.showCLI) {
                    cliExecutions.push(parsed.cliExecution);
                  }
                } catch {
                  // Not JSON, ignore
                }
              }
            }
          }

          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            toolCalls: data.toolsUsed,
            tokensUsed: data.tokensUsed,
            quickOptions: data.quickOptions,
            cliExecutions: cliExecutions.length > 0 ? cliExecutions : undefined,
            timestamp: new Date().toISOString(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMsg],
            isLoading: false,
          }));

          // Auto-surface actionable assistant responses as DecisionCards
          if (data.quickOptions && data.quickOptions.length > 0) {
            const { addNotification: addNotif } = get();
            // Create a suggestion card from the first actionable quick option
            const firstOpt = data.quickOptions[0];
            const notif: AnnetteNotification = {
              id: `chat-action-${Date.now()}`,
              type: 'suggestion',
              priority: 'low',
              title: 'Suggested Next Step',
              message: data.response.length > 120
                ? data.response.substring(0, 120) + '...'
                : data.response,
              actionable: true,
              suggestedAction: {
                tool: 'chat_suggestion',
                description: firstOpt.message,
              },
              timestamp: new Date().toISOString(),
            };
            addNotif(notif);
          }

          // Auto-play TTS if audio mode is on
          if (audioEnabled && data.response) {
            try {
              set({ isSpeaking: true });
              const ttsRes = await fetch('/api/voicebot/text-to-speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: data.response }),
              });
              if (ttsRes.ok) {
                const audioBlob = await ttsRes.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.onended = () => {
                  set({ isSpeaking: false });
                  URL.revokeObjectURL(audioUrl);
                };
                audio.onerror = () => {
                  set({ isSpeaking: false });
                  URL.revokeObjectURL(audioUrl);
                };
                audio.play().catch(() => set({ isSpeaking: false }));
              } else {
                set({ isSpeaking: false });
              }
            } catch {
              set({ isSpeaking: false });
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          set({ isLoading: false, error: errorMessage });
        }
      },

      // ─── UI ───

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // ─── Voice ───

      setRecording: (recording) => set({ isRecording: recording }),
      setSpeaking: (speaking) => set({ isSpeaking: speaking }),
      toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

      // ─── Notifications ───

      addNotification: (notification) => {
        const { notificationsMuted, isWidgetOpen } = get();
        if (notificationsMuted) return;

        // Skip arrival system message for chat-surfaced suggestions (response is already visible)
        const isChatSurfaced = notification.id.startsWith('chat-action-');

        if (isChatSurfaced) {
          set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 10),
            unreadCount: isWidgetOpen ? state.unreadCount : state.unreadCount + 1,
          }));
        } else {
          // Inject a system message so the chat reflects the new decision card
          const sysMsg: ChatMessage = {
            id: `sys-arrival-${notification.id}-${Date.now()}`,
            role: 'system',
            content: `${notification.title}: ${notification.message}`,
            decisionEvent: {
              action: 'arrived',
              notificationType: notification.type,
              notificationTitle: notification.title,
              notificationMessage: notification.message,
              suggestedAction: notification.suggestedAction?.description,
            },
            timestamp: new Date().toISOString(),
          };

          set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 10),
            unreadCount: isWidgetOpen ? state.unreadCount : state.unreadCount + 1,
            messages: [...state.messages, sysMsg],
          }));
        }
      },

      dismissNotification: (id) => {
        const { notifications } = get();
        const notification = notifications.find(n => n.id === id);

        // Inject a system message noting the dismissal
        const sysMsg: ChatMessage = {
          id: `sys-dismiss-${id}-${Date.now()}`,
          role: 'system',
          content: notification
            ? `Dismissed: ${notification.title}`
            : `Dismissed notification`,
          decisionEvent: {
            action: 'dismissed',
            notificationType: notification?.type ?? 'status',
            notificationTitle: notification?.title ?? 'Notification',
            notificationMessage: notification?.message ?? '',
          },
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
          messages: [...state.messages, sysMsg],
        }));
      },

      clearNotifications: () => set({ notifications: [] }),
      toggleMute: () => set((state) => ({ notificationsMuted: !state.notificationsMuted })),

      // ─── Widget ───

      toggleWidget: () => {
        const { isWidgetOpen } = get();
        set({ isWidgetOpen: !isWidgetOpen, unreadCount: isWidgetOpen ? get().unreadCount : 0 });
      },
      closeWidget: () => set({ isWidgetOpen: false }),
      markAllRead: () => set({ unreadCount: 0 }),

      // ─── Decision Panel ───

      snoozeNotification: (id) => {
        const expiry = Date.now() + 30 * 60 * 1000; // 30 minutes
        const { notifications } = get();
        const notification = notifications.find(n => n.id === id);

        const sysMsg: ChatMessage = {
          id: `sys-snooze-${id}-${Date.now()}`,
          role: 'system',
          content: notification
            ? `Snoozed: ${notification.title} (30 min)`
            : `Snoozed notification (30 min)`,
          decisionEvent: {
            action: 'snoozed',
            notificationType: notification?.type ?? 'status',
            notificationTitle: notification?.title ?? 'Notification',
            notificationMessage: notification?.message ?? '',
          },
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          snoozedIds: [...state.snoozedIds, id],
          snoozeExpiry: { ...state.snoozeExpiry, [id]: expiry },
          messages: [...state.messages, sysMsg],
        }));
      },

      executeAction: async (notification) => {
        if (!notification.suggestedAction) return;

        // Inject acceptance system message before executing
        const sysMsg: ChatMessage = {
          id: `sys-accept-${notification.id}-${Date.now()}`,
          role: 'system',
          content: `Accepted: ${notification.title} — ${notification.suggestedAction.description}`,
          decisionEvent: {
            action: 'accepted',
            notificationType: notification.type,
            notificationTitle: notification.title,
            notificationMessage: notification.message,
            suggestedAction: notification.suggestedAction.description,
          },
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, sysMsg],
        }));

        const { sendMessage } = get();
        await sendMessage(notification.suggestedAction.description);
        // Silently remove the notification (no extra "dismissed" system message)
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== notification.id),
        }));
      },

      getActiveNotifications: () => {
        const { notifications, snoozedIds, snoozeExpiry } = get();
        const now = Date.now();
        // Filter out snoozed (unless snooze expired)
        const activeSnoozed = snoozedIds.filter(id => (snoozeExpiry[id] || 0) > now);
        return notifications.filter(n => !activeSnoozed.includes(n.id));
      },

      // ─── Reset ───

      reset: () => set(initialState),
    }),
    { name: 'annette-store' }
  )
);
