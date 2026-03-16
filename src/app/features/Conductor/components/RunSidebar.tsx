/**
 * RunSidebar — Thin sidebar listing active pipeline runs
 *
 * Shows all concurrent runs with status, goal title, and elapsed time.
 * Click to select a run for the main view. [+] to start a new pipeline.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Zap, Clock, Pause, Square,
  AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import { useConductorStore } from '../lib/conductorStore';
import type { PipelineStatus } from '../lib/types';

// Full class strings for Tailwind static analysis (no dynamic interpolation)
const STATUS_CONFIG: Record<PipelineStatus, {
  icon: typeof Zap;
  iconClass: string;
  labelClass: string;
  selectedBg: string;
  selectedBorder: string;
}> = {
  running: {
    icon: Zap,
    iconClass: 'text-cyan-400',
    labelClass: 'text-cyan-400',
    selectedBg: 'bg-cyan-500/15',
    selectedBorder: 'border-cyan-500/40',
  },
  paused: {
    icon: Pause,
    iconClass: 'text-amber-400',
    labelClass: 'text-amber-400',
    selectedBg: 'bg-amber-500/15',
    selectedBorder: 'border-amber-500/40',
  },
  stopping: {
    icon: Square,
    iconClass: 'text-red-400',
    labelClass: 'text-red-400',
    selectedBg: 'bg-red-500/15',
    selectedBorder: 'border-red-500/40',
  },
  queued: {
    icon: Clock,
    iconClass: 'text-indigo-400',
    labelClass: 'text-indigo-400',
    selectedBg: 'bg-indigo-500/15',
    selectedBorder: 'border-indigo-500/40',
  },
  completed: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
    labelClass: 'text-emerald-400',
    selectedBg: 'bg-emerald-500/15',
    selectedBorder: 'border-emerald-500/40',
  },
  failed: {
    icon: XCircle,
    iconClass: 'text-red-400',
    labelClass: 'text-red-400',
    selectedBg: 'bg-red-500/15',
    selectedBorder: 'border-red-500/40',
  },
  interrupted: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    labelClass: 'text-amber-400',
    selectedBg: 'bg-amber-500/15',
    selectedBorder: 'border-amber-500/40',
  },
  idle: {
    icon: Clock,
    iconClass: 'text-gray-400',
    labelClass: 'text-gray-400',
    selectedBg: 'bg-gray-500/15',
    selectedBorder: 'border-gray-500/40',
  },
};

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 60_000) return '<1m';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
}

interface RunSidebarProps {
  onNewRun: () => void;
}

export default function RunSidebar({ onNewRun }: RunSidebarProps) {
  const runs = useConductorStore((s) => s.runs);
  const selectedRunId = useConductorStore((s) => s.selectedRunId);
  const selectRun = useConductorStore((s) => s.selectRun);

  const runList = Object.values(runs).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return (
    <motion.div
      className="w-48 shrink-0 bg-gray-900/50 border border-gray-800 rounded-xl p-3 flex flex-col"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400">Pipelines</span>
        <motion.button
          onClick={onNewRun}
          className="p-1 rounded-md bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30
            border border-cyan-600/40 transition-colors"
          title="New Pipeline"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      <div className="h-px bg-gray-700/40 mb-2" />

      {/* Run List */}
      <div className="flex-1 overflow-y-auto space-y-1 max-h-[60vh] scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {runList.map((run) => {
            const isSelected = run.id === selectedRunId;
            const cfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.idle;
            const Icon = cfg.icon;
            const title = run.goalTitle || run.goalId?.slice(0, 8) || 'Untitled';

            return (
              <motion.button
                key={run.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => selectRun(run.id)}
                className={`w-full text-left p-2 rounded-lg border transition-all ${
                  isSelected
                    ? `${cfg.selectedBg} ${cfg.selectedBorder}`
                    : 'border-transparent hover:bg-gray-800/50 hover:border-gray-700/40'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${cfg.iconClass} flex-shrink-0`} />
                  <span className="text-xs text-gray-200 truncate flex-1">{title}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 pl-[22px]">
                  <span className={`text-[10px] ${cfg.labelClass} capitalize`}>
                    {run.status}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {formatElapsed(run.startedAt)}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {runList.length === 0 && (
          <div className="text-center py-8 text-[11px] text-gray-600">
            No active pipelines
          </div>
        )}
      </div>
    </motion.div>
  );
}
