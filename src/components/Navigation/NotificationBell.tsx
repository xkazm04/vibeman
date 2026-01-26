'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNotificationStore, type StoredNotification } from '@/stores/notificationStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import NotificationFeed from './NotificationFeed';

/**
 * NotificationBell - Bell icon with unread badge + dropdown feed.
 * Connects to the /api/annette/stream SSE endpoint to receive
 * real-time notifications and stores them in the notification store.
 */
export default function NotificationBell() {
  const { isOpen, setOpen, addNotification, pruneExpired } = useNotificationStore();
  const unreadCount = useNotificationStore(s => s.getUnreadCount());
  const activeProject = useClientProjectStore(s => s.activeProject);
  const bellRef = useRef<HTMLDivElement>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

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
        const data = JSON.parse(event.data) as Omit<StoredNotification, 'read' | 'receivedAt'>;
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

        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-blue-500 text-[10px] font-medium text-white"
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
