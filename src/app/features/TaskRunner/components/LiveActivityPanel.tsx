'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  FileText,
  Pencil,
  FilePlus,
  Search,
  Terminal,
  ListChecks,
  Brain,
  Pause,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';
import { useState } from 'react';
import { useExecutionStream, type LiveToolEvent } from '../hooks/useExecutionStream';
import type { ActivityType, TaskPhase } from '../lib/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Phase theming — drives border/bg colors per requirement
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_THEME: Record<TaskPhase, { border: string; bg: string; text: string; dot: string; label: string }> = {
  analyzing:     { border: 'border-blue-500/30',   bg: 'bg-blue-500/5',   text: 'text-blue-400',   dot: 'bg-blue-400',   label: 'Analyzing' },
  planning:      { border: 'border-violet-500/30', bg: 'bg-violet-500/5', text: 'text-violet-400', dot: 'bg-violet-400', label: 'Planning' },
  implementing:  { border: 'border-emerald-500/30',bg: 'bg-emerald-500/5',text: 'text-emerald-400',dot: 'bg-emerald-400',label: 'Implementing' },
  validating:    { border: 'border-amber-500/30',  bg: 'bg-amber-500/5',  text: 'text-amber-400',  dot: 'bg-amber-400',  label: 'Validating' },
  idle:          { border: 'border-gray-600/30',   bg: 'bg-gray-800/20',  text: 'text-gray-500',   dot: 'bg-gray-500',   label: 'Idle' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool icons — matches activityClassifier output
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_ICON: Record<ActivityType, typeof FileText> = {
  reading:   FileText,
  editing:   Pencil,
  writing:   FilePlus,
  searching: Search,
  executing: Terminal,
  planning:  ListChecks,
  thinking:  Brain,
  idle:      Pause,
};

const TOOL_COLOR: Record<ActivityType, string> = {
  reading:   'text-blue-400',
  editing:   'text-emerald-400',
  writing:   'text-green-400',
  searching: 'text-cyan-400',
  executing: 'text-orange-400',
  planning:  'text-violet-400',
  thinking:  'text-gray-400',
  idle:      'text-gray-500',
};

// ─────────────────────────────────────────────────────────────────────────────
// Single event row
// ─────────────────────────────────────────────────────────────────────────────

const EventRow = memo(function EventRow({ event, isLatest }: { event: LiveToolEvent; isLatest: boolean }) {
  const Icon = TOOL_ICON[event.activityType] || Brain;
  const color = TOOL_COLOR[event.activityType] || 'text-gray-400';

  // Truncate target to filename for readability
  const displayTarget = event.target
    ? event.target.split(/[/\\]/).pop() || event.target
    : null;

  return (
    <div className={`flex items-center gap-2 py-0.5 px-1 rounded text-2xs font-mono ${isLatest ? 'bg-white/5' : ''}`}>
      <Icon className={`w-3 h-3 flex-shrink-0 ${color}`} />
      <span className={`flex-shrink-0 w-14 ${color} font-medium`}>
        {event.tool}
      </span>
      {displayTarget && (
        <span className="text-gray-500 truncate" title={event.target}>
          {displayTarget}
        </span>
      )}
      {!displayTarget && (
        <span className="text-gray-600 italic">
          {event.activityType}
        </span>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main panel — renders inside TaskMonitor for each running task
// ─────────────────────────────────────────────────────────────────────────────

interface LiveActivityPanelProps {
  taskId: string;
  requirementName: string;
}

export const LiveActivityPanel = memo(function LiveActivityPanel({
  taskId,
  requirementName,
}: LiveActivityPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const { phase, events, isConnected } = useExecutionStream(taskId, true, 10);

  const theme = PHASE_THEME[phase] || PHASE_THEME.idle;

  return (
    <div className={`border rounded ${theme.border} ${theme.bg} overflow-hidden`}>
      {/* Collapsed header — always visible for running tasks */}
      <button
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Live indicator */}
          <span className="relative flex items-center">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? theme.dot : 'bg-gray-600'}`} />
            {isConnected && !prefersReducedMotion && (
              <span className={`absolute w-1.5 h-1.5 rounded-full ${theme.dot} animate-ping`} />
            )}
          </span>

          {/* Phase badge */}
          <span className={`text-2xs font-medium ${theme.text}`}>
            {theme.label}
          </span>

          {/* Requirement name */}
          <span className="text-2xs text-gray-500 truncate">
            {requirementName}
          </span>

          {/* Event count */}
          {events.length > 0 && (
            <span className="text-micro text-gray-600 tabular-nums">
              {events.length} ops
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isConnected && (
            <Radio className={`w-3 h-3 ${theme.text}`} />
          )}
          {isOpen ? (
            <ChevronUp className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded: last 10 tool invocations */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-0.5">
              {events.length === 0 ? (
                <div className="text-2xs text-gray-600 italic py-1">
                  Waiting for tool invocations...
                </div>
              ) : (
                events.map((evt, i) => (
                  <EventRow key={evt.id} event={evt} isLatest={i === events.length - 1} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default LiveActivityPanel;
