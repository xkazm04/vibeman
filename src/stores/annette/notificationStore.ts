/**
 * Annette Notification Store
 * Manages Annette-specific notifications, snooze state, and decision panel actions.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AnnetteNotification } from '@/lib/annette/notificationEngine';
import type { ChatMessage, DecisionEvent } from './types';

// ============================================================================
// STORE
// ============================================================================

interface NotificationState {
  notifications: AnnetteNotification[];
  notificationsMuted: boolean;
  snoozedIds: string[];
  snoozeExpiry: Record<string, number>;
}

interface NotificationActions {
  addNotification: (notification: AnnetteNotification) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  toggleMute: () => void;
  snoozeNotification: (id: string) => void;
  executeAction: (notification: AnnetteNotification) => Promise<void>;
  getActiveNotifications: () => AnnetteNotification[];
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  notifications: [],
  notificationsMuted: false,
  snoozedIds: [],
  snoozeExpiry: {},
};

export const useAnnetteNotificationStore = create<NotificationStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      addNotification: (notification) => {
        const { notificationsMuted } = get();
        if (notificationsMuted) return;

        const isChatSurfaced = notification.id.startsWith('chat-action-');

        if (isChatSurfaced) {
          // Chat-surfaced suggestions: add to notifications, bump widget unread
          const { useWidgetStore } = require('./widgetStore');
          const isWidgetOpen = useWidgetStore.getState().isWidgetOpen;
          if (!isWidgetOpen) {
            useWidgetStore.getState().incrementUnread();
          }
          set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 10),
          }));
        } else {
          // Inject a system message so the chat reflects the new decision card
          const { useChatStore } = require('./chatStore');
          const { useWidgetStore } = require('./widgetStore');
          const isWidgetOpen = useWidgetStore.getState().isWidgetOpen;
          if (!isWidgetOpen) {
            useWidgetStore.getState().incrementUnread();
          }

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
            } as DecisionEvent,
            timestamp: new Date().toISOString(),
          };

          useChatStore.getState().addMessage(sysMsg);
          set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 10),
          }));
        }
      },

      dismissNotification: (id) => {
        const { notifications } = get();
        const notification = notifications.find(n => n.id === id);

        const { useChatStore } = require('./chatStore');
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
          } as DecisionEvent,
          timestamp: new Date().toISOString(),
        };

        useChatStore.getState().addMessage(sysMsg);
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
      },

      clearNotifications: () => set({ notifications: [] }),
      toggleMute: () => set((state) => ({ notificationsMuted: !state.notificationsMuted })),

      snoozeNotification: (id) => {
        const expiry = Date.now() + 30 * 60 * 1000;
        const { notifications } = get();
        const notification = notifications.find(n => n.id === id);

        const { useChatStore } = require('./chatStore');
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
          } as DecisionEvent,
          timestamp: new Date().toISOString(),
        };

        useChatStore.getState().addMessage(sysMsg);
        set((state) => ({
          snoozedIds: [...state.snoozedIds, id],
          snoozeExpiry: { ...state.snoozeExpiry, [id]: expiry },
        }));
      },

      executeAction: async (notification) => {
        if (!notification.suggestedAction) return;

        const { useChatStore } = require('./chatStore');
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
          } as DecisionEvent,
          timestamp: new Date().toISOString(),
        };

        useChatStore.getState().addMessage(sysMsg);

        try {
          await useChatStore.getState().sendMessage(notification.suggestedAction.description);
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== notification.id),
          }));
        } catch {
          // Error already set in chat store — notification stays so user can retry
        }
      },

      getActiveNotifications: () => {
        const { notifications, snoozedIds, snoozeExpiry } = get();
        const now = Date.now();
        const activeSnoozed = snoozedIds.filter(id => (snoozeExpiry[id] || 0) > now);
        return notifications.filter(n => !activeSnoozed.includes(n.id));
      },

      reset: () => set(initialState),
    }),
    { name: 'annette-notification-store' }
  )
);
