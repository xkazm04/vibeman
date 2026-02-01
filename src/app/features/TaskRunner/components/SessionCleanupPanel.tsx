'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Pause,
  HelpCircle,
  X,
} from 'lucide-react';
import { useSessionCleanup } from '../hooks/useSessionCleanup';
import type { OrphanedSession, OrphanReason } from '../lib/sessionCleanup.types';
import { formatRelativeTime } from '@/lib/formatDate';

// Static icon components - pre-computed to enable reference equality and avoid creating new JSX on every render
const REASON_ICONS: Record<OrphanReason, React.ReactNode> = {
  no_heartbeat: <AlertTriangle className="w-3 h-3 text-red-400" />,
  stale_running: <AlertTriangle className="w-3 h-3 text-red-400" />,
  stale_paused: <Pause className="w-3 h-3 text-amber-400" />,
  stale_pending: <Clock className="w-3 h-3 text-gray-400" />,
  no_polling: <HelpCircle className="w-3 h-3 text-orange-400" />,
};
const DEFAULT_REASON_ICON = <AlertTriangle className="w-3 h-3 text-gray-400" />;

// Static text lookup map - eliminates switch statement overhead
const REASON_TEXT: Record<OrphanReason, string> = {
  no_heartbeat: 'No heartbeat (>30 min)',
  stale_running: 'Stale running state',
  stale_paused: 'Paused too long (>48 hrs)',
  stale_pending: 'Never started (>2 hrs)',
  no_polling: 'Not being polled',
};
const DEFAULT_REASON_TEXT = 'Unknown reason';

interface SessionCleanupPanelProps {
  projectId?: string;
}

/**
 * Get icon for orphan reason - uses static lookup map
 */
function getReasonIcon(reason: OrphanReason): React.ReactNode {
  return REASON_ICONS[reason] ?? DEFAULT_REASON_ICON;
}

/**
 * Get human-readable reason text - uses static lookup map
 */
function getReasonText(reason: OrphanReason): string {
  return REASON_TEXT[reason] ?? DEFAULT_REASON_TEXT;
}

/**
 * Single orphaned session item
 */
const OrphanedSessionItem = memo(function OrphanedSessionItem({
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
      className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-800/40 rounded-lg transition-all duration-200 hover:bg-gray-800/60 hover:shadow-sm border border-transparent hover:border-gray-700/30"
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
        className="p-1.5 hover:bg-red-500/20 rounded transition-all duration-200 text-gray-400 hover:text-red-400 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
        title="Clean up this session"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
});

/**
 * Session Cleanup Panel Component
 * Displays orphaned sessions and provides cleanup actions
 */
export const SessionCleanupPanel = memo(function SessionCleanupPanel({
  projectId,
}: SessionCleanupPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    orphanedSessions,
    isScanning,
    isCleaning,
    error,
    scanForOrphans,
    cleanupSessions,
    cleanupAll,
  } = useSessionCleanup({ projectId, autoScan: true });

  // Don't render if no orphans
  if (orphanedSessions.length === 0 && !isScanning && !error) {
    return null;
  }

  const handleCleanupSingle = async (sessionId: string) => {
    await cleanupSessions([sessionId]);
  };

  const handleCleanupAll = async () => {
    await cleanupAll();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-lg overflow-hidden backdrop-blur-sm shadow-sm shadow-amber-500/5"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-amber-500/10 transition-all duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">
            {orphanedSessions.length} orphaned session{orphanedSessions.length !== 1 ? 's' : ''} detected
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Scan button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              scanForOrphans();
            }}
            disabled={isScanning}
            className="p-1.5 hover:bg-amber-500/20 rounded transition-all duration-200 text-amber-400 hover:scale-110 active:scale-95 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
            title="Scan for orphaned sessions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          </button>

          {/* Clean All button */}
          {orphanedSessions.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCleanupAll();
              }}
              disabled={isCleaning}
              className="px-2 py-1 text-[10px] font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded text-amber-400 transition-all duration-200 hover:shadow-sm hover:shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
            >
              {isCleaning ? 'Cleaning...' : 'Clean All'}
            </button>
          )}

          {/* Expand/collapse toggle */}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-amber-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-400" />
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
            <X className="w-3 h-3" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && orphanedSessions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
              {orphanedSessions.map((session) => (
                <OrphanedSessionItem
                  key={session.id}
                  session={session}
                  onCleanup={handleCleanupSingle}
                  isDisabled={isCleaning}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default SessionCleanupPanel;
