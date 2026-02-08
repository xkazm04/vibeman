'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Trash2,
  Clock,
  Pause,
  HelpCircle,
} from 'lucide-react';
import type { OrphanedSession, OrphanReason } from '../lib/sessionCleanup.types';
import { formatRelativeTime } from '@/lib/formatDate';

// Static icon lookup — pre-computed JSX for reference equality
export const REASON_ICONS: Record<OrphanReason, React.ReactNode> = {
  no_heartbeat: <AlertTriangle className="w-3 h-3 text-red-400" />,
  stale_running: <AlertTriangle className="w-3 h-3 text-red-400" />,
  stale_paused: <Pause className="w-3 h-3 text-amber-400" />,
  stale_pending: <Clock className="w-3 h-3 text-gray-400" />,
  no_polling: <HelpCircle className="w-3 h-3 text-orange-400" />,
};
const DEFAULT_REASON_ICON = <AlertTriangle className="w-3 h-3 text-gray-400" />;

// Static text lookup
export const REASON_TEXT: Record<OrphanReason, string> = {
  no_heartbeat: 'No heartbeat (>30 min)',
  stale_running: 'Stale running state',
  stale_paused: 'Paused too long (>48 hrs)',
  stale_pending: 'Never started (>2 hrs)',
  no_polling: 'Not being polled',
};
const DEFAULT_REASON_TEXT = 'Unknown reason';

export function getReasonIcon(reason: OrphanReason): React.ReactNode {
  return REASON_ICONS[reason] ?? DEFAULT_REASON_ICON;
}

export function getReasonText(reason: OrphanReason): string {
  return REASON_TEXT[reason] ?? DEFAULT_REASON_TEXT;
}

/**
 * Single orphaned session item — shared between TaskMonitor and SessionCleanupPanel
 */
export const OrphanedSessionItem = memo(function OrphanedSessionItem({
  session,
  onCleanup,
  isDisabled,
}: {
  session: OrphanedSession;
  onCleanup: (id: string) => void;
  isDisabled: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center justify-between gap-3 px-2 py-1.5 bg-gray-800/40 rounded-lg transition-all duration-200 hover:bg-gray-800/60 border border-transparent hover:border-gray-700/30"
    >
      <div className="flex items-center gap-2 min-w-0">
        {getReasonIcon(session.reason)}
        <div className="min-w-0">
          <div className="text-xs font-medium text-gray-300 truncate">
            {session.name}
          </div>
          <div className="text-[10px] text-gray-500 flex items-center gap-2">
            <span>{getReasonText(session.reason)}</span>
            <span>|</span>
            <span>{formatRelativeTime(session.lastActivity)}</span>
            <span>|</span>
            <span>{session.taskCount} tasks</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onCleanup(session.id)}
        disabled={isDisabled}
        className="p-1 hover:bg-red-500/20 rounded transition-all duration-200 text-gray-400 hover:text-red-400 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
        title="Clean up this session"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
});
