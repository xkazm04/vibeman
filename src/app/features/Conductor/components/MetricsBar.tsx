/**
 * MetricsBar — Real-time pipeline throughput and cost metrics
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb, ThumbsUp, ThumbsDown, ListChecks,
  CheckCircle2, XCircle, Wrench, Clock, DollarSign,
} from 'lucide-react';
import type { PipelineMetrics, ProcessLogEntry } from '../lib/types';
import { createEmptyMetrics } from '../lib/types';

interface MetricsBarProps {
  metrics: PipelineMetrics | null;
  processLog?: ProcessLogEntry[];
  isRunning: boolean;
}

interface MetricItemProps {
  icon: typeof Lightbulb;
  value: number | string;
  color: string;
  delay: number;
  title: string;
}

function MetricItem({ icon: Icon, value, color, delay, title }: MetricItemProps) {
  return (
    <motion.div
      className="flex items-center gap-1.5"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
      title={title}
    >
      <Icon className={`w-3.5 h-3.5 text-${color}-400`} />
      <span className={`text-sm font-bold font-mono text-${color}-400`}>{value}</span>
    </motion.div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '0s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${minutes}m${remainingSecs > 0 ? ` ${remainingSecs}s` : ''}`;
}

function formatCost(cost: number): string {
  if (cost < 0.01) return '$0.00';
  return `$${cost.toFixed(2)}`;
}

export default function MetricsBar({ metrics, processLog, isRunning }: MetricsBarProps) {
  // Derive live metrics from processLog if available (most recent metrics event wins)
  const liveMetrics = useMemo(() => {
    if (!processLog || processLog.length === 0) return null;
    // Find the last metrics event in the log
    for (let i = processLog.length - 1; i >= 0; i--) {
      if (processLog[i].event === 'metrics' && processLog[i].metrics) {
        return processLog[i].metrics!;
      }
    }
    return null;
  }, [processLog]);

  const m = liveMetrics ?? metrics ?? createEmptyMetrics();
  const successRate = m.tasksCompleted + m.tasksFailed > 0
    ? Math.round((m.tasksCompleted / (m.tasksCompleted + m.tasksFailed)) * 100)
    : 0;

  return (
    <motion.div
      className="flex items-center gap-5 px-4 py-2.5 rounded-lg border border-gray-800/60 bg-gray-900/30 overflow-x-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="metrics-bar"
    >
      {/* Ideas */}
      <MetricItem icon={Lightbulb} value={m.ideasGenerated} color="cyan" delay={0} title="Ideas generated" />
      <MetricItem icon={ThumbsUp} value={m.ideasAccepted} color="emerald" delay={1} title="Ideas accepted" />
      <MetricItem icon={ThumbsDown} value={m.ideasRejected} color="gray" delay={2} title="Ideas rejected" />

      <div className="w-px h-5 bg-gray-800 flex-shrink-0" />

      {/* Tasks */}
      <MetricItem icon={ListChecks} value={m.tasksCreated} color="purple" delay={3} title="Tasks created" />
      <MetricItem icon={CheckCircle2} value={m.tasksCompleted} color="emerald" delay={4} title="Tasks done" />
      <MetricItem icon={XCircle} value={m.tasksFailed} color="red" delay={5} title="Tasks failed" />

      <div className="w-px h-5 bg-gray-800 flex-shrink-0" />

      {/* Success Rate */}
      <div className="flex items-center gap-1.5" title="Success rate">
        <span className={`text-sm font-bold font-mono ${
          successRate >= 80 ? 'text-emerald-400' :
          successRate >= 50 ? 'text-amber-400' :
          'text-red-400'
        }`}>
          {successRate}%
        </span>
      </div>

      <div className="w-px h-5 bg-gray-800 flex-shrink-0" />

      {/* Healing */}
      <MetricItem icon={Wrench} value={m.healingPatchesApplied} color="pink" delay={6} title="Healing patches applied" />

      {/* Duration */}
      <MetricItem icon={Clock} value={formatDuration(m.totalDurationMs)} color="gray" delay={7} title="Total duration" />

      {/* Cost */}
      <MetricItem icon={DollarSign} value={formatCost(m.estimatedCost)} color="amber" delay={8} title="Estimated cost" />

      {/* Running indicator */}
      {isRunning && (
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto flex-shrink-0"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
