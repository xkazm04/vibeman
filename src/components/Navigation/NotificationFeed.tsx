'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck, Trash2 } from 'lucide-react';
import { useMessageStore } from '@/stores/messageStore';
import NotificationItem from './NotificationItem';

interface NotificationFeedProps {
  onAction?: (tool: string) => void;
}

export default function NotificationFeed({ onAction }: NotificationFeedProps) {
  const { notifications, markAsRead, markAllAsRead, clearAllNotifications } = useMessageStore();
  const unreadCount = useMessageStore(s => s.getUnreadCount());

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute top-full right-0 mt-2 z-50 w-80 max-h-[420px] rounded-lg border border-gray-700/50 bg-gray-900/95 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/50">
        <span className="text-xs font-medium text-white">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-1.5 text-[10px] text-gray-400">
              ({unreadCount} unread)
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-800/50 transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onAction={onAction}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
