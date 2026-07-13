'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useMessageStore, type StoredNotification } from '@/stores/messageStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import NotificationFeed from './NotificationFeed';
import { mapScanNotification, type ScanNotificationRow } from './scanNotifications';

/** How often the bell polls the scan-queue for new notifications. */
const SCAN_NOTIFICATION_POLL_MS = 15_000;

/**
 * NotificationBell - Bell icon with unread badge + dropdown feed.
 * Connects to the /api/annette/stream SSE endpoint to receive
 * real-time notifications and stores them in the notification store.
 */
export default function NotificationBell() {
  const { isOpen, setOpen, addNotification, pruneExpired } = useMessageStore();
  const unreadCount = useMessageStore(s => s.getUnreadCount());
  const activeProject = useClientProjectStore(s => s.activeProject);
  const bellRef = useRef<HTMLDivElement>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  // Ids of notifications sourced from the scan-queue (so mark-read can PATCH the
  // server), and the subset whose read-state we've already persisted.
  const scanIdsRef = useRef<Set<string>>(new Set());
  const persistedReadRef = useRef<Set<string>>(new Set());

  // Defer store-derived UI to avoid hydration mismatch (server renders 0, client may differ)
  useEffect(() => { setMounted(true); }, []);

  // Poll the existing scan-queue notifications endpoint and feed unread rows
  // into the SAME bell/messageStore (no new notification UI). The store dedups
  // by id, so re-polling the same unread row is a no-op. This runs from the
  // global nav, so scan started/completed/failed + auto_merge_* reach the bell
  // even when the Ideas screen is not mounted.
  useEffect(() => {
    const projectId = activeProject?.id;
    if (!projectId) return;

    const persistRead = (id: string) => {
      if (persistedReadRef.current.has(id)) return;
      persistedReadRef.current.add(id);
      // Mark-read persists via the EXISTING PATCH endpoint.
      fetch('/api/scan-queue/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      }).catch(() => {
        // Let a later change/poll retry.
        persistedReadRef.current.delete(id);
      });
    };

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/scan-queue/notifications?projectId=${encodeURIComponent(projectId)}&unreadOnly=true`
        );
        if (!res.ok) return;
        const data = await res.json();
        const rows = (data.notifications ?? []) as ScanNotificationRow[];
        const storeNotifs = useMessageStore.getState().notifications;
        for (const row of rows) {
          scanIdsRef.current.add(row.id);
          addNotification(mapScanNotification(row));
          // Reconcile a row the user already read locally in a prior session
          // (store is persisted) whose read-state never reached the server.
          const local = storeNotifs.find((n) => n.id === row.id);
          if (local?.read) persistRead(row.id);
        }
      } catch {
        // Transient fetch error — the next tick retries.
      }
    };

    poll();
    const interval = setInterval(poll, SCAN_NOTIFICATION_POLL_MS);
    return () => clearInterval(interval);
  }, [activeProject?.id, addNotification]);

  // Persist mark-read the moment a scan-sourced notification is read in the
  // store (single click OR mark-all), by PATCHing the existing endpoint.
  useEffect(() => {
    const unsub = useMessageStore.subscribe((state) => {
      for (const n of state.notifications) {
        if (n.read && scanIdsRef.current.has(n.id) && !persistedReadRef.current.has(n.id)) {
          persistedReadRef.current.add(n.id);
          fetch('/api/scan-queue/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: n.id }),
          }).catch(() => {
            persistedReadRef.current.delete(n.id);
          });
        }
      }
    });
    return unsub;
  }, []);

  // SSE connection management
  useEffect(() => {
    const projectId = activeProject?.id;
    if (!projectId) return;

    // Close existing connection if project changed
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = `/api/annette/stream?projectId=${encodeURIComponent(projectId)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setSseConnected(true);
    });

    const handleNotification = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as Omit<StoredNotification, 'kind' | 'read' | 'receivedAt' | 'createdAt' | 'ttl'>;
        addNotification(data);
      } catch {
        // Ignore parse errors
      }
    };

    // Listen for both generic notifications and task-specific notifications
    es.addEventListener('notification', handleNotification);
    es.addEventListener('task_notification', handleNotification);

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setSseConnected(false);
    };
  }, [activeProject?.id, addNotification]);

  // Prune expired notifications periodically
  useEffect(() => {
    const interval = setInterval(pruneExpired, 60_000);
    return () => clearInterval(interval);
  }, [pruneExpired]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setOpen]);

  return (
    <div ref={bellRef} className="relative">
      {/* Bell button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => setOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/30"
        title={sseConnected ? 'Notifications (connected)' : 'Notifications'}
        data-testid="notification-bell"
      >
        <Bell className="w-4 h-4" />

        {/* Unread badge — only render after mount to avoid hydration mismatch */}
        {mounted && unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-blue-500 text-2xs font-medium text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}

        {/* Connection indicator dot */}
        {sseConnected && (
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />
        )}
      </motion.button>

      {/* Dropdown feed */}
      <AnimatePresence>
        {isOpen && <NotificationFeed />}
      </AnimatePresence>
    </div>
  );
}
