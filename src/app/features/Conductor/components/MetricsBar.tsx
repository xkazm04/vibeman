/**
 * MetricsBar — Real-time pipeline throughput and cost metrics
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ListChecks, CheckCircle2, XCircle,
  RefreshCw, Brain, Wrench, Clock, DollarSign,
  GitBranch, GitMerge,
} from 'lucide-react';
import type { PipelineMetrics, ProcessLogEntry } from '../lib/types';

interface MetricsBarProps {
  metrics: PipelineMetrics | null;
  processLog?: ProcessLogEntry[];
  isRunning: boolean;
}

interface MetricItemProps {
  icon: typeof ListChecks;
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

  // Cast to Record for v3 field access (runtime data is V3Metrics shape)
  const raw = (liveMetrics ?? metrics ?? {}) as Record<string, number>;
  const tasksPlanned = raw.tasksPlanned ?? 0;
  const tasksCompleted = raw.tasksCompleted ?? 0;
  const tasksFailed = raw.tasksFailed ?? 0;
  const totalCycles = raw.totalCycles ?? 0;
  const llmCallCount = raw.llmCallCount ?? 0;
  const healingPatchesApplied = raw.healingPatchesApplied ?? 0;
  const worktreesCreated = raw.worktreesCreated ?? 0;
  const mergeConflicts = raw.mergeConflicts ?? 0;
  const totalDurationMs = raw.totalDurationMs ?? 0;
  const estimatedCost = raw.estimatedCost ?? 0;

  const successRate = tasksCompleted + tasksFailed > 0
    ? Math.round((tasksCompleted / (tasksCompleted + tasksFailed)) * 100)
    : 0;

  return (
    <motion.div
      className="flex items-center gap-5 px-4 py-2.5 rounded-lg border border-gray-800/60 bg-gray-900/30 overflow-x-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="metrics-bar"
    >
      {/* Tasks */}
      <MetricItem icon={ListChecks} value={tasksPlanned} color="cyan" delay={0} title="Tasks planned" />
      <MetricItem icon={CheckCircle2} value={tasksCompleted} color="emerald" delay={1} title="Tasks completed" />
      <MetricItem icon={XCircle} value={tasksFailed} color="red" delay={2} title="Tasks failed" />

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

      {/* Cycles + LLM Calls */}
      <MetricItem icon={RefreshCw} value={totalCycles} color="purple" delay={3} title="Cycles" />
      <MetricItem icon={Brain} value={llmCallCount} color="indigo" delay={4} title="LLM calls" />

      <div className="w-px h-5 bg-gray-800 flex-shrink-0" />

      {/* Healing */}
      <MetricItem icon={Wrench} value={healingPatchesApplied} color="pink" delay={5} title="Healing patches applied" />

      {/* Worktree metrics (conditional) */}
      {worktreesCreated > 0 && (
        <>
          <div className="w-px h-5 bg-gray-800 flex-shrink-0" />
          <MetricItem icon={GitBranch} value={worktreesCreated} color="purple" delay={5.5} title="Worktrees created" />
          {mergeConflicts > 0 && (
            <MetricItem icon={GitMerge} value={mergeConflicts} color="red" delay={5.7} title="Merge conflicts" />
          )}
        </>
      )}

      {/* Duration */}
      <MetricItem icon={Clock} value={formatDuration(totalDurationMs)} color="gray" delay={6} title="Total duration" />

      {/* Cost */}
      <MetricItem icon={DollarSign} value={formatCost(estimatedCost)} color="amber" delay={7} title="Estimated cost" />

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
