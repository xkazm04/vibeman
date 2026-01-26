'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Lightbulb, Zap, Clock } from 'lucide-react';
import type { StoredNotification } from '@/stores/notificationStore';

interface NotificationItemProps {
  notification: StoredNotification;
  onMarkRead: (id: string) => void;
  onAction?: (tool: string) => void;
}

function getIcon(type: StoredNotification['type']) {
  switch (type) {
    case 'warning': return AlertTriangle;
    case 'insight': return Lightbulb;
    case 'outcome': return CheckCircle;
    case 'suggestion': return Zap;
    case 'task_execution': return Clock;
    case 'status':
    default: return Info;
  }
}

function getIconColor(type: StoredNotification['type'], priority: StoredNotification['priority']) {
  if (priority === 'high') return 'text-red-400';
  switch (type) {
    case 'warning': return 'text-amber-400';
    case 'insight': return 'text-purple-400';
    case 'outcome': return 'text-green-400';
    case 'suggestion': return 'text-blue-400';
    case 'task_execution': return 'text-cyan-400';
    case 'status':
    default: return 'text-gray-400';
  }
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationItem({ notification, onMarkRead, onAction }: NotificationItemProps) {
  const Icon = getIcon(notification.type);
  const iconColor = getIconColor(notification.type, notification.priority);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`px-4 py-3 border-b border-gray-800/50 transition-colors cursor-pointer ${
        notification.read ? 'opacity-60' : 'bg-gray-800/20'
      } hover:bg-gray-800/40`}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white truncate">
              {notification.title}
            </span>
            {!notification.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-gray-500">
              {formatTimeAgo(notification.timestamp)}
            </span>

            {/* Action button */}
            {notification.actionable && notification.suggestedAction && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!notification.read) onMarkRead(notification.id);
                  onAction?.(notification.suggestedAction!.tool);
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white transition-colors"
              >
                {notification.suggestedAction.description}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
