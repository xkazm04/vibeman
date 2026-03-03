/**
 * ProcessLog — Real-time pipeline process log viewer
 *
 * Terminal-style scrollable log showing stage transitions,
 * items flowing through, and errors. Replaces the inline
 * BalancingPanel + HealingPanel area.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, ChevronDown, AlertCircle,
  Play, CheckCircle, XCircle, SkipForward, Info,
} from 'lucide-react';
import type { ProcessLogEntry, PipelineStage } from '../../lib/conductor/types';

interface ProcessLogProps {
  entries: ProcessLogEntry[];
  isRunning: boolean;
}

const STAGE_COLORS: Record<PipelineStage, string> = {
  scout: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  triage: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  batch: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  execute: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  review: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const EVENT_ICONS: Record<ProcessLogEntry['event'], { icon: typeof Play; className: string }> = {
  started: { icon: Play, className: 'text-cyan-400' },
  completed: { icon: CheckCircle, className: 'text-emerald-400' },
  failed: { icon: XCircle, className: 'text-red-400' },
  skipped: { icon: SkipForward, className: 'text-gray-500' },
  info: { icon: Info, className: 'text-blue-400' },
};

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function LogEntry({ entry }: { entry: ProcessLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const stageColor = STAGE_COLORS[entry.stage];
  const eventConfig = EVENT_ICONS[entry.event];
  const EventIcon = eventConfig.icon;
  const isFailed = entry.event === 'failed';
  const isSkipped = entry.event === 'skipped';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors group
        ${isFailed ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-gray-800/30'}
        ${isSkipped ? 'opacity-50' : ''}
      `}
    >
      {/* Timestamp */}
      <span className="text-[10px] text-gray-600 font-mono w-14 shrink-0 pt-0.5 text-right">
        {formatTimeAgo(entry.timestamp)}
      </span>

      {/* Event Icon */}
      <EventIcon className={`w-3 h-3 shrink-0 mt-0.5 ${eventConfig.className}`} />

      {/* Stage Badge */}
      <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border shrink-0 ${stageColor}`}>
        {entry.stage}
      </span>

      {/* Message */}
      <span className={`text-xs flex-1 ${isFailed ? 'text-red-300' : 'text-gray-300'}`}>
        {entry.message}
      </span>

      {/* Metrics */}
      <div className="flex items-center gap-2 shrink-0">
        {entry.itemsOut !== undefined && entry.itemsOut > 0 && (
          <span className="text-[10px] text-gray-500 font-mono">
            {entry.itemsOut} out
          </span>
        )}
        {entry.durationMs !== undefined && (
          <span className="text-[10px] text-gray-600 font-mono">
            {formatDuration(entry.durationMs)}
          </span>
        )}
      </div>

      {/* Error expand button */}
      {entry.error && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-red-500 hover:text-red-400 shrink-0"
        >
          <AlertCircle className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}

export default function ProcessLog({ entries, isRunning }: ProcessLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setAutoScroll(true);
    }
  }, []);

  // Empty state
  if (entries.length === 0) {
    return (
      <motion.div
        className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        data-testid="process-log"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800 bg-gray-900/50">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Process Log</span>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Terminal className="w-8 h-8 text-gray-700 mb-2" />
          <p className="text-xs text-gray-500">Pipeline log will appear here when running</p>
          <p className="text-[10px] text-gray-600 mt-1">
            Each stage transition is logged in real-time
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="process-log"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Process Log</span>
          <span className="text-[10px] text-gray-600 font-mono">{entries.length} entries</span>
          {isRunning && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[300px] overflow-y-auto custom-scrollbar px-1 py-1"
      >
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <LogEntry key={entry.id} entry={entry} />
          ))}
        </AnimatePresence>
      </div>

      {/* Jump to bottom button */}
      <AnimatePresence>
        {!autoScroll && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-2 right-3 flex items-center gap-1 px-2 py-1 rounded-full
              bg-gray-800/90 border border-gray-700 text-[10px] text-gray-400
              hover:bg-gray-700/90 hover:text-gray-300 transition-colors shadow-lg backdrop-blur-sm"
          >
            <ChevronDown className="w-3 h-3" />
            Latest
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
