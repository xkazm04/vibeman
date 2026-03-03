/**
 * MetricsBar — Real-time pipeline throughput and cost metrics
 */

'use client';

import { motion } from 'framer-motion';
import {
  Lightbulb, ThumbsUp, ThumbsDown, ListChecks,
  CheckCircle2, XCircle, Wrench, Clock, DollarSign,
} from 'lucide-react';
import type { PipelineMetrics } from '../../lib/conductor/types';
import { createEmptyMetrics } from '../../lib/conductor/types';

interface MetricsBarProps {
  metrics: PipelineMetrics | null;
  isRunning: boolean;
}

interface MetricItemProps {
  icon: typeof Lightbulb;
  label: string;
  value: number | string;
  color: string;
  delay: number;
}

function MetricItem({ icon: Icon, label, value, color, delay }: MetricItemProps) {
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
    >
      <Icon className={`w-3.5 h-3.5 text-${color}-400`} />
      <span className="text-[11px] text-gray-500 whitespace-nowrap">{label}</span>
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

export default function MetricsBar({ metrics, isRunning }: MetricsBarProps) {
  const m = metrics ?? createEmptyMetrics();
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
      <MetricItem icon={Lightbulb} label="Generated" value={m.ideasGenerated} color="cyan" delay={0} />
      <MetricItem icon={ThumbsUp} label="Accepted" value={m.ideasAccepted} color="emerald" delay={1} />
      <MetricItem icon={ThumbsDown} label="Rejected" value={m.ideasRejected} color="gray" delay={2} />

      <div className="w-px h-5 bg-gray-800 flex-shrink-0" />

      {/* Tasks */}
      <MetricItem icon={ListChecks} label="Tasks" value={m.tasksCreated} color="purple" delay={3} />
      <MetricItem icon={CheckCircle2} label="Done" value={m.tasksCompleted} color="emerald" delay={4} />
      <MetricItem icon={XCircle} label="Failed" value={m.tasksFailed} color="red" delay={5} />

      <div className="w-px h-5 bg-gray-800 flex-shrink-0" />

      {/* Success Rate */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500">Success</span>
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
      <MetricItem icon={Wrench} label="Healed" value={m.healingPatchesApplied} color="pink" delay={6} />

      {/* Duration */}
      <MetricItem icon={Clock} label="Time" value={formatDuration(m.totalDurationMs)} color="gray" delay={7} />

      {/* Cost */}
      <MetricItem icon={DollarSign} label="Cost" value={formatCost(m.estimatedCost)} color="amber" delay={8} />

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
