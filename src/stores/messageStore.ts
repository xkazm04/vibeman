'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig } from '@/stores/utils/persistence';

// ── Message types ──

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type NotificationType = 'insight' | 'outcome' | 'warning' | 'suggestion' | 'status' | 'task_execution';
export type MessagePriority = 'low' | 'medium' | 'high';

/**
 * Base fields shared by every message.
 * - `ttl: null` → persistent (notification behavior)
 * - `ttl: number` → auto-dismiss after N ms (toast behavior)
 */
interface MessageBase {
  id: string;
  title: string;
  message?: string;
  createdAt: number;
  /** null = persistent, number = auto-dismiss after ms */
  ttl: number | null;
}

/** A persistent notification displayed in the notification feed. */
export interface StoredNotification extends MessageBase {
  kind: 'notification';
  type: NotificationType;
  priority: MessagePriority;
  actionable: boolean;
  suggestedAction?: { tool: string; description: string };
  timestamp: string;
  read: boolean;
  receivedAt: number;
  ttl: null;
}

/** A transient toast shown as an overlay. */
export interface Toast extends MessageBase {
  kind: 'toast';
  type: ToastType;
  duration: number;
  action?: { label: string; onClick: () => void };
  ttl: number;
}

export type Message = StoredNotification | Toast;

// ── Constants ──

const MAX_NOTIFICATIONS = 50;
const AUTO_DISMISS_LOW_PRIORITY_MS = 24 * 60 * 60 * 1000; // 24 h

function getDefaultDuration(type: ToastType): number {
  switch (type) {
    case 'success': return 3000;
    case 'error':   return 5000;
    case 'warning': return 4000;
    case 'info':    return 3000;
    default:        return 3000;
  }
}

// ── Store interface ──

interface MessageStore {
  // State
  notifications: StoredNotification[];
  toasts: Toast[];
  isOpen: boolean;

  // Notification actions
  addNotification: (notification: Omit<StoredNotification, 'kind' | 'read' | 'receivedAt' | 'createdAt' | 'ttl'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  pruneExpired: () => void;
  getUnreadCount: () => number;

  // Toast actions
  addToast: (toast: Omit<Toast, 'id' | 'kind' | 'createdAt' | 'ttl' | 'duration'> & { duration?: number }) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;

  // Panel
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

let toastIdCounter = 0;

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      toasts: [],
      isOpen: false,

      // ── Notification actions ──

      addNotification: (notification) => {
        const existing = get().notifications;
        if (existing.some(n => n.id === notification.id)) return;

        const stored: StoredNotification = {
          ...notification,
          kind: 'notification',
          read: false,
          receivedAt: Date.now(),
          createdAt: Date.now(),
          ttl: null,
        };

        set({ notifications: [stored, ...existing].slice(0, MAX_NOTIFICATIONS) });
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

      clearAllNotifications: () => {
        set({ notifications: [] });
      },

      pruneExpired: () => {
        const now = Date.now();
        set({
          notifications: get().notifications.filter(n => {
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

      // ── Toast actions ──

      addToast: (toastInput) => {
        const id = `toast-${++toastIdCounter}-${Date.now()}`;
        const duration = toastInput.duration ?? getDefaultDuration(toastInput.type);

        const newToast: Toast = {
          ...toastInput,
          id,
          kind: 'toast',
          createdAt: Date.now(),
          duration,
          ttl: duration,
        };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        if (duration > 0) {
          setTimeout(() => {
            set((state) => ({
              toasts: state.toasts.filter(t => t.id !== id),
            }));
          }, duration);
        }

        return id;
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter(t => t.id !== id),
        }));
      },

      clearAllToasts: () => {
        set({ toasts: [] });
      },

      // ── Panel ──

      setOpen: (open) => set({ isOpen: open }),
      toggleOpen: () => set({ isOpen: !get().isOpen }),
    }),
    createPersistConfig<MessageStore>('notifications', {
      category: 'session_work',
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    })
  )
);

// ── Convenience helpers (drop-in replacement for toast.*) ──

export const toast = {
  success: (title: string, message?: string) =>
    useMessageStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useMessageStore.getState().addToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) =>
    useMessageStore.getState().addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    useMessageStore.getState().addToast({ type: 'info', title, message }),
  custom: (t: Omit<Toast, 'id' | 'kind' | 'createdAt' | 'ttl' | 'duration'> & { duration?: number }) =>
    useMessageStore.getState().addToast(t),
  dismiss: (id: string) =>
    useMessageStore.getState().removeToast(id),
  dismissAll: () =>
    useMessageStore.getState().clearAllToasts(),
};

// ── Re-exports for backwards-compatible type references ──

/** @deprecated Use `useMessageStore` instead */
export const useNotificationStore = useMessageStore;
/** @deprecated Use `useMessageStore` instead */
export const useToastStore = useMessageStore;
