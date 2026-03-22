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
  Play, CheckCircle, XCircle, SkipForward, Info, Activity,
} from 'lucide-react';
import { EmptyLogIllustration } from './ConductorEmptyStates';
import { useThemeStore } from '@/stores/themeStore';
import type { ProcessLogEntry } from '../lib/types';
import { getStageTheme } from '../lib/stageTheme';

interface ProcessLogProps {
  entries: ProcessLogEntry[];
  isRunning: boolean;
}

const EVENT_ICONS: Record<ProcessLogEntry['event'], { icon: typeof Play; className: string }> = {
  started: { icon: Play, className: 'text-cyan-400' },
  completed: { icon: CheckCircle, className: 'text-emerald-400' },
  failed: { icon: XCircle, className: 'text-red-400' },
  skipped: { icon: SkipForward, className: 'text-gray-500' },
  info: { icon: Info, className: 'text-blue-400' },
  metrics: { icon: Activity, className: 'text-cyan-400' },
};

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function LogEntry({ entry }: { entry: ProcessLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const appTheme = useThemeStore((s) => s.theme);
  const stageColor = getStageTheme(entry.stage, appTheme).badge;
  const eventConfig = EVENT_ICONS[entry.event];
  const EventIcon = eventConfig.icon;
  const isFailed = entry.event === 'failed';
  const isSkipped = entry.event === 'skipped';

  return (
  <>
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors group
        ${isFailed ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-gray-800/30'}
        ${isSkipped ? 'opacity-50' : ''}
      `}
    >
      {/* Timestamp */}
      <span className="text-2xs text-gray-600 font-mono w-14 shrink-0 pt-0.5 text-right">
        {formatTime(entry.timestamp)}
      </span>

      {/* Event Icon */}
      <EventIcon className={`w-3 h-3 shrink-0 mt-0.5 ${eventConfig.className}`} />

      {/* Stage Badge */}
      <span className={`text-micro font-semibold uppercase px-1.5 py-0.5 rounded border shrink-0 ${stageColor}`}>
        {entry.stage}
      </span>

      {/* Message */}
      <span className={`text-xs flex-1 ${isFailed ? 'text-red-300' : 'text-gray-300'}`}>
        {entry.message}
      </span>

      {/* Metrics */}
      <div className="flex items-center gap-2 shrink-0">
        {entry.itemsOut !== undefined && entry.itemsOut > 0 && (
          <span className="text-2xs text-gray-500 font-mono">
            {entry.itemsOut} out
          </span>
        )}
        {entry.durationMs !== undefined && (
          <span className="text-2xs text-gray-600 font-mono">
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
          <AlertCircle className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </motion.div>

    {/* Expanded error detail */}
    <AnimatePresence>
      {expanded && entry.error && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-red-950/30 border-l-2 border-red-500 px-3 py-2 font-mono text-2xs text-red-300 whitespace-pre-wrap max-h-32 overflow-y-auto ml-[72px] mr-2 mb-1 rounded-r">
            {entry.error}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
}

export default function ProcessLog({ entries, isRunning }: ProcessLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

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
          <span className="text-base font-semibold tracking-wide text-gray-300">Process Log</span>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <EmptyLogIllustration className="w-28 h-16 mb-2" />
          <p className="text-xs text-gray-500">Pipeline log will appear here when running</p>
          <p className="text-2xs text-gray-600 mt-1">
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
          <span className="text-base font-semibold tracking-wide text-gray-300">Process Log</span>
          <span className="text-2xs text-gray-600 font-mono">{entries.length} entries</span>
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
              bg-gray-800/90 border border-gray-700 text-2xs text-gray-400
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
