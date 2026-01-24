/**
 * Decision Card
 * Individual notification rendered as an actionable card with quick-action buttons
 */

'use client';

import { motion } from 'framer-motion';
import { Brain, Activity, AlertTriangle, Lightbulb, Info, Check, X, Clock } from 'lucide-react';
import { useAnnetteStore } from '@/stores/annetteStore';
import type { AnnetteNotification } from '@/lib/annette/notificationEngine';

const ICON_MAP = {
  insight: Brain,
  outcome: Activity,
  warning: AlertTriangle,
  suggestion: Lightbulb,
  status: Info,
};

const COLOR_MAP = {
  insight: 'border-purple-500/30 bg-purple-500/5',
  outcome: 'border-cyan-500/30 bg-cyan-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  suggestion: 'border-green-500/30 bg-green-500/5',
  status: 'border-slate-500/30 bg-slate-500/5',
};

const ICON_COLOR_MAP = {
  insight: 'text-purple-400',
  outcome: 'text-cyan-400',
  warning: 'text-amber-400',
  suggestion: 'text-green-400',
  status: 'text-slate-400',
};

const PRIORITY_COLOR = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-500',
};

export default function DecisionCard({ notification }: { notification: AnnetteNotification }) {
  const executeAction = useAnnetteStore((s) => s.executeAction);
  const dismissNotification = useAnnetteStore((s) => s.dismissNotification);
  const snoozeNotification = useAnnetteStore((s) => s.snoozeNotification);

  const Icon = ICON_MAP[notification.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={`p-3 rounded-lg border ${COLOR_MAP[notification.type]}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ICON_COLOR_MAP[notification.type]}`} />
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
                className="p-1.5 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                title="Accept"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => dismissNotification(notification.id)}
              className="p-1.5 rounded-md bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => snoozeNotification(notification.id)}
              className="p-1.5 rounded-md bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 transition-colors"
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
