/**
 * Annette Store — Backward-Compatible Facade
 *
 * Re-exports domain stores and types so existing imports keep working.
 * Prefer importing directly from the domain stores for new code:
 *   - @/stores/annette/chatStore
 *   - @/stores/annette/notificationStore
 *   - @/stores/annette/voiceStore
 *   - @/stores/annette/widgetStore
 *   - @/stores/annette/editingStore
 */

// Re-export types from types.ts
export type {
  QuickOption,
  CLIExecutionInfo,
  DecisionEvent,
  ChatMessage,
  ConversationBranch,
} from './annette/types';

// Re-export domain stores
export { useChatStore } from './annette/chatStore';
export { useAnnetteNotificationStore } from './annette/notificationStore';
export { useVoiceStore } from './annette/voiceStore';
export { useWidgetStore } from './annette/widgetStore';
export { useEditingStore } from './annette/editingStore';

// ============================================================================
// Unified useAnnetteStore for backward compatibility
// ============================================================================
//
// Consumers that call useAnnetteStore((s) => s.foo) need a single store
// that surfaces all state and actions. We build this as a composed selector
// over the domain stores using Zustand's vanilla subscribe API.
//
// NOTE: This is a compatibility shim. Migrate consumers to use the domain
// stores directly for better bundle splitting and fewer re-renders.
// ============================================================================

import { useSyncExternalStore, useCallback } from 'react';
import { useChatStore } from './annette/chatStore';
import { useAnnetteNotificationStore } from './annette/notificationStore';
import { useVoiceStore } from './annette/voiceStore';
import { useWidgetStore } from './annette/widgetStore';
import { useEditingStore } from './annette/editingStore';

type AnnetteSnapshot = ReturnType<typeof buildSnapshot>;

function buildSnapshot() {
  const chat = useChatStore.getState();
  const notif = useAnnetteNotificationStore.getState();
  const voice = useVoiceStore.getState();
  const widget = useWidgetStore.getState();
  const editing = useEditingStore.getState();

  return {
    // Chat state
    messages: chat.messages,
    sessionId: chat.sessionId,
    projectId: chat.projectId,
    isLoading: chat.isLoading,
    error: chat.error,

    // Editing/Branch state
    editingMessageId: editing.editingMessageId,
    branches: editing.branches,
    previewBranchId: editing.previewBranchId,

    // Notification state
    notifications: notif.notifications,
    notificationsMuted: notif.notificationsMuted,
    snoozedIds: notif.snoozedIds,
    snoozeExpiry: notif.snoozeExpiry,

    // Voice state
    isRecording: voice.isRecording,
    isSpeaking: voice.isSpeaking,
    audioEnabled: voice.audioEnabled,

    // Widget state
    isWidgetOpen: widget.isWidgetOpen,
    unreadCount: widget.unreadCount,

    // Chat actions
    addMessage: chat.addMessage,
    updateLastAssistant: chat.updateLastAssistant,
    clearMessages: chat.clearMessages,
    setSession: chat.setSession,
    clearSession: chat.clearSession,
    sendMessage: chat.sendMessage,
    setLoading: chat.setLoading,
    setError: chat.setError,

    // Editing actions
    setEditingMessage: editing.setEditingMessage,
    editMessageAndResend: editing.editMessageAndResend,
    previewBranch: editing.previewBranch,
    restoreBranch: editing.restoreBranch,
    deleteBranch: editing.deleteBranch,

    // Notification actions
    addNotification: notif.addNotification,
    dismissNotification: notif.dismissNotification,
    clearNotifications: notif.clearNotifications,
    toggleMute: notif.toggleMute,
    snoozeNotification: notif.snoozeNotification,
    executeAction: notif.executeAction,
    getActiveNotifications: notif.getActiveNotifications,

    // Voice actions
    setRecording: voice.setRecording,
    setSpeaking: voice.setSpeaking,
    toggleAudio: voice.toggleAudio,

    // Widget actions
    toggleWidget: widget.toggleWidget,
    closeWidget: widget.closeWidget,
    markAllRead: widget.markAllRead,

    // Reset all
    reset: () => {
      chat.reset();
      notif.reset();
      voice.reset();
      widget.reset();
      editing.reset();
    },
  };
}

// Subscribe to all stores and rebuild snapshot on any change
function subscribe(callback: () => void) {
  const unsubs = [
    useChatStore.subscribe(callback),
    useAnnetteNotificationStore.subscribe(callback),
    useVoiceStore.subscribe(callback),
    useWidgetStore.subscribe(callback),
    useEditingStore.subscribe(callback),
  ];
  return () => unsubs.forEach(u => u());
}

/**
 * @deprecated Prefer importing domain stores directly:
 *   useChatStore, useAnnetteNotificationStore, useVoiceStore, useWidgetStore, useEditingStore
 */
export function useAnnetteStore<T>(selector: (state: AnnetteSnapshot) => T): T {
  const getSnapshot = useCallback(() => selector(buildSnapshot()), [selector]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Static getState for non-React contexts
useAnnetteStore.getState = buildSnapshot;
