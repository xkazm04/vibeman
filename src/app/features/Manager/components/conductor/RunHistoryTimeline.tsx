/**
 * RunHistoryTimeline — Past pipeline runs with outcomes
 *
 * Collapsible timeline showing historical runs, their metrics,
 * and per-stage breakdowns.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, ChevronDown, CheckCircle2, XCircle, Clock,
  Lightbulb, Zap, Wrench, Trash2,
} from 'lucide-react';
import { useConductorStore } from '../../lib/conductor/conductorStore';
import type { PipelineRunSummary, PipelineStatus } from '../../lib/conductor/types';

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const STATUS_STYLES: Record<PipelineStatus, { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: 'emerald' },
  failed: { icon: XCircle, color: 'red' },
  idle: { icon: Clock, color: 'gray' },
  running: { icon: Zap, color: 'cyan' },
  paused: { icon: Clock, color: 'amber' },
  stopping: { icon: Clock, color: 'red' },
  interrupted: { icon: XCircle, color: 'amber' },
};

function RunSummaryCard({ run }: { run: PipelineRunSummary }) {
  const statusConfig = STATUS_STYLES[run.status];
  const StatusIcon = statusConfig.icon;
  const successRate = run.metrics.tasksCompleted + run.metrics.tasksFailed > 0
    ? Math.round((run.metrics.tasksCompleted / (run.metrics.tasksCompleted + run.metrics.tasksFailed)) * 100)
    : 0;

  return (
    <motion.div
      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Status icon */}
      <StatusIcon className={`w-4 h-4 text-${statusConfig.color}-400 flex-shrink-0`} />

      {/* Date */}
      <span className="text-[11px] text-gray-400 w-16 flex-shrink-0">
        {formatDate(run.startedAt)}
      </span>

      {/* Metrics row */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] font-mono text-gray-300">{run.metrics.ideasGenerated}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-orange-500" />
          <span className="text-[10px] font-mono text-gray-300">
            {run.metrics.tasksCompleted}/{run.metrics.tasksCreated}
          </span>
        </div>
        {run.metrics.healingPatchesApplied > 0 && (
          <div className="flex items-center gap-1">
            <Wrench className="w-3 h-3 text-pink-500" />
            <span className="text-[10px] font-mono text-pink-400">{run.metrics.healingPatchesApplied}</span>
          </div>
        )}
      </div>

      {/* Success rate */}
      <span className={`text-[11px] font-mono font-bold ${
        successRate >= 80 ? 'text-emerald-400' :
        successRate >= 50 ? 'text-amber-400' :
        successRate > 0 ? 'text-red-400' : 'text-gray-500'
      }`}>
        {run.metrics.tasksCreated > 0 ? `${successRate}%` : '-'}
      </span>

      {/* Cycles */}
      <span className="text-[10px] text-gray-500 font-mono">{run.cycles}c</span>

      {/* Duration */}
      <span className="text-[10px] text-gray-500 font-mono w-10 text-right">
        {formatDuration(run.metrics.totalDurationMs)}
      </span>
    </motion.div>
  );
}

export default function RunHistoryTimeline() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { runHistory, clearHistory } = useConductorStore();

  if (runHistory.length === 0) return null;

  return (
    <motion.div
      className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="run-history-timeline"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-800/30 transition-colors"
      >
        <History className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300 flex-1 text-left">
          Run History
        </span>
        <span className="text-[10px] font-mono text-gray-500">
          {runHistory.length} runs
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5 max-h-[250px] overflow-y-auto">
              {runHistory.map((run) => (
                <RunSummaryCard key={run.id} run={run} />
              ))}
            </div>
            <div className="px-3 pb-2 flex justify-end">
              <button
                onClick={clearHistory}
                className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear History
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
