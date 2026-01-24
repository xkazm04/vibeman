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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>;
  tokensUsed?: { input: number; output: number; total: number };
  quickOptions?: QuickOption[];
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
          // Build conversation history from recent messages
          const conversationHistory = messages.slice(-10).map(m => ({
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

          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            toolCalls: data.toolsUsed,
            tokensUsed: data.tokensUsed,
            quickOptions: data.quickOptions,
            timestamp: new Date().toISOString(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMsg],
            isLoading: false,
          }));

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

        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 10),
          unreadCount: isWidgetOpen ? state.unreadCount : state.unreadCount + 1,
        }));
      },

      dismissNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
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
        set((state) => ({
          snoozedIds: [...state.snoozedIds, id],
          snoozeExpiry: { ...state.snoozeExpiry, [id]: expiry },
        }));
      },

      executeAction: async (notification) => {
        if (!notification.suggestedAction) return;
        const { sendMessage, dismissNotification: dismiss } = get();
        await sendMessage(notification.suggestedAction.description);
        dismiss(notification.id);
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
