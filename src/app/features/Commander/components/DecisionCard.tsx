/**
 * Decision Card
 * Individual notification rendered as an actionable card with quick-action buttons
 */

'use client';

import { motion } from 'framer-motion';
import { Brain, Activity, AlertTriangle, Lightbulb, Info, Check, X, Clock, Zap } from 'lucide-react';
import { useAnnetteNotificationStore } from '@/stores/annette/notificationStore';
import type { AnnetteNotification } from '@/lib/annette/notificationEngine';

const DECISION_CONFIG = {
  insight: {
    icon: Brain,
    color: 'border-purple-500/30 bg-purple-500/5',
    iconColor: 'text-purple-400',
  },
  outcome: {
    icon: Activity,
    color: 'border-cyan-500/30 bg-cyan-500/5',
    iconColor: 'text-cyan-400',
  },
  warning: {
    icon: AlertTriangle,
    color: 'border-amber-500/30 bg-amber-500/5',
    iconColor: 'text-amber-400',
  },
  suggestion: {
    icon: Lightbulb,
    color: 'border-green-500/30 bg-green-500/5',
    iconColor: 'text-green-400',
  },
  status: {
    icon: Info,
    color: 'border-slate-500/30 bg-slate-500/5',
    iconColor: 'text-slate-400',
  },
  task_execution: {
    icon: Activity,
    color: 'border-blue-500/30 bg-blue-500/5',
    iconColor: 'text-blue-400',
  },
  autonomous_agent: {
    icon: Zap,
    color: 'border-amber-500/30 bg-amber-500/5',
    iconColor: 'text-amber-400',
  },
} satisfies Record<AnnetteNotification['type'], { icon: any; color: string; iconColor: string }>;

const PRIORITY_COLOR = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-500',
};

export default function DecisionCard({ notification }: { notification: AnnetteNotification }) {
  const executeAction = useAnnetteNotificationStore((s) => s.executeAction);
  const dismissNotification = useAnnetteNotificationStore((s) => s.dismissNotification);
  const snoozeNotification = useAnnetteNotificationStore((s) => s.snoozeNotification);

  const config = DECISION_CONFIG[notification.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={`p-3 rounded-lg border ${config.color}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200 truncate">{notification.title}</span>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLOR[notification.priority]}`} />
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notification.message}</p>

          {notification.suggestedAction && (
            <button
              onClick={() => executeAction(notification)}
              className="mt-2 w-full text-left px-2.5 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors truncate"
            >
              {notification.suggestedAction.description}
            </button>
          )}

          <div className="flex items-center gap-1.5 mt-2">
            {notification.actionable && (
              <button
                onClick={() => executeAction(notification)}
                className="p-1.5 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                title="Accept"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => dismissNotification(notification.id)}
              className="p-1.5 rounded-md border border-slate-600/40 text-slate-400 hover:bg-slate-500/10 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => snoozeNotification(notification.id)}
              className="p-1.5 rounded-md border border-amber-500/25 text-amber-400/70 hover:bg-amber-500/10 transition-colors"
              title="Snooze 30 min"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
