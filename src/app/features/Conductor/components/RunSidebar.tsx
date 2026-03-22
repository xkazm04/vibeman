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
import { LaunchpadIllustration } from './ConductorEmptyStates';
import { useConductorStore } from '../lib/conductorStore';
import { PIPELINE_STATUS_COLORS } from '../lib/stageTheme';
import type { PipelineStatus } from '../lib/types';

const STATUS_ICONS: Record<PipelineStatus, typeof Zap> = {
  running: Zap,
  paused: Pause,
  stopping: Square,
  queued: Clock,
  completed: CheckCircle2,
  failed: XCircle,
  interrupted: AlertTriangle,
  idle: Clock,
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
            const colors = PIPELINE_STATUS_COLORS[run.status] || PIPELINE_STATUS_COLORS.idle;
            const Icon = STATUS_ICONS[run.status] || STATUS_ICONS.idle;
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
                    ? `${colors.selectedBg} ${colors.selectedBorder}`
                    : 'border-transparent hover:bg-gray-800/50 hover:border-gray-700/40'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    <Icon className={`w-3.5 h-3.5 ${colors.iconClass}`} />
                    {run.status === 'running' && (
                      <motion.span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                    {run.status === 'paused' && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </div>
                  <span className="text-xs text-gray-200 truncate flex-1">{title}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 pl-[22px]">
                  <span className={`text-2xs ${colors.labelClass} capitalize`}>
                    {run.status}
                  </span>
                  <span className="text-2xs text-gray-600">
                    {formatElapsed(run.startedAt)}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {runList.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <LaunchpadIllustration className="w-16 h-16 mb-1" />
            <span className="text-caption text-gray-600">No active pipelines</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
