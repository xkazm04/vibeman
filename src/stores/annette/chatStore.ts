/**
 * Annette Chat Store
 * Manages chat messages, session state, and message delivery.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AnnetteNotification } from '@/lib/annette/notificationEngine';
import type {
  ChatMessage,
  CLIExecutionInfo,
  QuickOption,
  DecisionEvent
} from './types';

// Lazy singletons — resolved once on first use, synchronous access thereafter.
// Avoids re-entering the microtask queue on every sendMessage call.
let _voiceStore: typeof import('./voiceStore') | null = null;
let _notificationStore: typeof import('./notificationStore') | null = null;

async function getVoiceStore() {
  if (!_voiceStore) _voiceStore = await import('./voiceStore');
  return _voiceStore;
}

async function getNotificationStore() {
  if (!_notificationStore) _notificationStore = await import('./notificationStore');
  return _notificationStore;
}

// ============================================================================
// STORE
// ============================================================================

interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  projectId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface ChatActions {
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  updateLastAssistant: (content: string) => void;
  clearMessages: () => void;
  setSession: (sessionId: string, projectId: string) => void;
  clearSession: () => void;
  sendMessage: (text: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  messages: [],
  sessionId: null,
  projectId: null,
  isLoading: false,
  error: null,
};

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      addMessage: (message) => {
        set((state) => ({ messages: [...state.messages, message] }));
      },

      setMessages: (messages) => set({ messages }),

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

      setSession: (sessionId, projectId) => set({ sessionId, projectId }),
      clearSession: () => set({ sessionId: null, projectId: null, messages: [] }),

      sendMessage: async (text) => {
        const { projectId, messages, sessionId } = get();
        const { useVoiceStore } = await getVoiceStore();
        const audioEnabled = useVoiceStore.getState().audioEnabled;

        if (!projectId) {
          set({ error: 'No project selected' });
          return;
        }

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
          const conversationHistory = messages
            .filter(m => m.role !== 'system')
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content }));

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
            const { useAnnetteNotificationStore } = await getNotificationStore();
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
            useAnnetteNotificationStore.getState().addNotification(notif);
          }

          // Auto-play TTS if audio mode is on
          if (audioEnabled && data.response) {
            try {
              useVoiceStore.getState().setSpeaking(true);
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
                  useVoiceStore.getState().setSpeaking(false);
                  URL.revokeObjectURL(audioUrl);
                };
                audio.onerror = () => {
                  useVoiceStore.getState().setSpeaking(false);
                  URL.revokeObjectURL(audioUrl);
                };
                audio.play().catch(() => useVoiceStore.getState().setSpeaking(false));
              } else {
                useVoiceStore.getState().setSpeaking(false);
              }
            } catch {
              useVoiceStore.getState().setSpeaking(false);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          set((state) => ({
            messages: state.messages.filter((m) => m.id !== userMsg.id),
            isLoading: false,
            error: errorMessage,
          }));
          throw error;
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    { name: 'annette-chat-store' }
  )
);
