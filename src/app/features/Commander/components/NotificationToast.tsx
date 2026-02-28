/**
 * Notification Toast
 * Displays proactive Annette notifications as dismissible toasts
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, AlertTriangle, Lightbulb, Activity, Info, Zap } from 'lucide-react';
import { useAnnetteNotificationStore } from '@/stores/annette/notificationStore';
import type { AnnetteNotification } from '@/lib/annette/notificationEngine';

const ICON_MAP = {
  insight: Brain,
  outcome: Activity,
  warning: AlertTriangle,
  suggestion: Lightbulb,
  status: Info,
  task_execution: Activity,
  autonomous_agent: Zap,
};

const COLOR_MAP = {
  insight: 'border-purple-500/30 bg-purple-500/5',
  outcome: 'border-cyan-500/30 bg-cyan-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  suggestion: 'border-green-500/30 bg-green-500/5',
  status: 'border-slate-500/30 bg-slate-500/5',
  task_execution: 'border-blue-500/30 bg-blue-500/5',
  autonomous_agent: 'border-amber-500/30 bg-amber-500/5',
};

const ICON_COLOR_MAP = {
  insight: 'text-purple-400',
  outcome: 'text-cyan-400',
  warning: 'text-amber-400',
  suggestion: 'text-green-400',
  status: 'text-slate-400',
  task_execution: 'text-blue-400',
  autonomous_agent: 'text-amber-400',
};

function ToastItem({ notification, onDismiss }: { notification: AnnetteNotification; onDismiss: () => void }) {
  const executeAction = useAnnetteNotificationStore((s) => s.executeAction);
  const Icon = ICON_MAP[notification.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      className={`relative p-3 rounded-lg border ${COLOR_MAP[notification.type]} backdrop-blur-sm max-w-sm`}
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex gap-2.5 pr-4">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ICON_COLOR_MAP[notification.type]}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200">{notification.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notification.message}</p>
          {notification.suggestedAction && (
            <button
              onClick={() => executeAction(notification)}
              className="mt-1.5 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2 py-1 hover:bg-cyan-500/20 transition-colors cursor-pointer text-left"
            >
              {notification.suggestedAction.description}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function NotificationToast() {
  const notifications = useAnnetteNotificationStore((s) => s.notifications);
  const dismissNotification = useAnnetteNotificationStore((s) => s.dismissNotification);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {notifications.slice(0, 3).map((n) => (
          <ToastItem
            key={n.id}
            notification={n}
            onDismiss={() => dismissNotification(n.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
