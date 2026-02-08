'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { useSessionCleanup } from '../hooks/useSessionCleanup';
import { OrphanedSessionItem } from './OrphanSessionShared';

interface SessionCleanupPanelProps {
  projectId?: string;
}

/**
 * Session Cleanup Panel Component
 * Displays orphaned sessions and provides cleanup actions.
 * Uses shared OrphanedSessionItem from OrphanSessionShared.
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
