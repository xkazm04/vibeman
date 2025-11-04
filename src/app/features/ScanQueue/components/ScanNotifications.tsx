'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DbScanNotification } from '@/app/db/models/types';
import { Bell, CheckCircle2, XCircle, Loader2, Zap, X } from 'lucide-react';

interface ScanNotificationsProps {
  projectId: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  maxDisplay?: number;
}

export function ScanNotifications({
  projectId,
  autoRefresh = true,
  refreshIntervalMs = 3000,
  maxDisplay = 5
}: ScanNotificationsProps) {
  const [notifications, setNotifications] = useState<DbScanNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/scan-queue/notifications?projectId=${projectId}&unreadOnly=true`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }

      setNotifications(data.notifications.slice(0, maxDisplay));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/scan-queue/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (err) {
      // Failed to mark notification as read - silently handle
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/scan-queue/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, markAll: true })
      });

      if (response.ok) {
        setNotifications([]);
      }
    } catch (err) {
      // Failed to mark all notifications as read - silently handle
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (autoRefresh) {
      const interval = setInterval(fetchNotifications, refreshIntervalMs);
      return () => clearInterval(interval);
    }
  }, [projectId, autoRefresh, refreshIntervalMs]);

  if (loading) {
    return null; // Don't show loading state for notifications
  }

  if (error || notifications.length === 0) {
    return null; // Don't show errors or empty state
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Mark all as read button */}
      {notifications.length > 1 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={markAllAsRead}
          className="w-full px-3 py-2 bg-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-700/90 transition-colors"
        >
          Mark all as read ({notifications.length})
        </motion.button>
      )}

      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onDismiss={() => markAsRead(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface NotificationCardProps {
  notification: DbScanNotification;
  onDismiss: () => void;
}

function NotificationCard({ notification, onDismiss }: NotificationCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = () => {
    switch (notification.notification_type) {
      case 'scan_started':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'scan_completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'scan_failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'auto_merge_completed':
        return <Zap className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.notification_type) {
      case 'scan_started':
        return 'border-blue-500/50';
      case 'scan_completed':
        return 'border-green-500/50';
      case 'scan_failed':
        return 'border-red-500/50';
      case 'auto_merge_completed':
        return 'border-purple-500/50';
      default:
        return 'border-gray-500/50';
    }
  };

  // Auto-dismiss after 10 seconds for completed/failed notifications
  useEffect(() => {
    if (notification.notification_type === 'scan_completed' || notification.notification_type === 'scan_failed') {
      const timer = setTimeout(onDismiss, 10000);
      return () => clearTimeout(timer);
    }
  }, [notification.notification_type, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`p-4 bg-gray-900/95 backdrop-blur-sm border ${getBorderColor()} rounded-lg shadow-xl`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white mb-1">
            {notification.title}
          </h4>
          <p className="text-xs text-gray-400">
            {notification.message}
          </p>

          {/* Additional data */}
          {notification.data && (
            <div className="mt-2 text-xs text-gray-500">
              {(() => {
                try {
                  const data = JSON.parse(notification.data);
                  if (data.ideaCount !== undefined) {
                    return `Generated ${data.ideaCount} ideas`;
                  }
                  if (data.autoAcceptedCount !== undefined) {
                    return `Auto-accepted ${data.autoAcceptedCount} ideas`;
                  }
                  return null;
                } catch {
                  return null;
                }
              })()}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-1 rounded hover:bg-gray-700/50 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </motion.div>
  );
}
