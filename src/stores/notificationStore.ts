'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig } from '@/stores/utils/persistence';

export interface StoredNotification {
  id: string;
  type: 'insight' | 'outcome' | 'warning' | 'suggestion' | 'status' | 'task_execution';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  actionable: boolean;
  suggestedAction?: {
    tool: string;
    description: string;
  };
  timestamp: string;
  read: boolean;
  receivedAt: number; // Date.now() when received
}

const MAX_NOTIFICATIONS = 50;
const AUTO_DISMISS_LOW_PRIORITY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface NotificationStore {
  notifications: StoredNotification[];
  isOpen: boolean;

  // Actions
  addNotification: (notification: Omit<StoredNotification, 'read' | 'receivedAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  pruneExpired: () => void;

  // Computed
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      isOpen: false,

      addNotification: (notification) => {
        const existing = get().notifications;
        // Deduplicate by id
        if (existing.some(n => n.id === notification.id)) return;

        const stored: StoredNotification = {
          ...notification,
          read: false,
          receivedAt: Date.now(),
        };

        // Prepend new notification, cap at MAX_NOTIFICATIONS
        const updated = [stored, ...existing].slice(0, MAX_NOTIFICATIONS);
        set({ notifications: updated });
      },

      markAsRead: (id) => {
        set({
          notifications: get().notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
        });
      },

      markAllAsRead: () => {
        set({
          notifications: get().notifications.map(n => ({ ...n, read: true })),
        });
      },

      removeNotification: (id) => {
        set({
          notifications: get().notifications.filter(n => n.id !== id),
        });
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      setOpen: (open) => set({ isOpen: open }),

      toggleOpen: () => set({ isOpen: !get().isOpen }),

      pruneExpired: () => {
        const now = Date.now();
        set({
          notifications: get().notifications.filter(n => {
            // Auto-dismiss read low-priority notifications after 24h
            if (n.priority === 'low' && n.read && now - n.receivedAt > AUTO_DISMISS_LOW_PRIORITY_MS) {
              return false;
            }
            return true;
          }),
        });
      },

      getUnreadCount: () => {
        return get().notifications.filter(n => !n.read).length;
      },
    }),
    createPersistConfig<NotificationStore>('notifications', {
      category: 'session_work',
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    })
  )
);
