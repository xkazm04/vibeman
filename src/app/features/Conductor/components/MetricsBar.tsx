/**
 * MetricsBar — Real-time pipeline throughput and cost metrics
 *
 * Metrics are grouped into labeled sections (Tasks, Performance,
 * Healing, Cost) for quick visual scanning during active runs.
 */

'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
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

// Static color class map — avoids dynamic Tailwind interpolation that gets purged in production
const METRIC_COLORS: Record<string, string> = {
  cyan: 'text-cyan-400',
  emerald: 'text-emerald-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
  indigo: 'text-indigo-400',
  pink: 'text-pink-400',
  gray: 'text-gray-400',
  amber: 'text-amber-400',
};

interface MetricItemProps {
  icon: typeof ListChecks;
  value: number | string;
  colorClass: string;
  delay: number;
  title: string;
}

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { duration: 0.3 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      setDisplay(Math.round(v));
    });
    return unsubscribe;
  }, [spring]);

  return <>{display}</>;
}

function MetricItem({ icon: Icon, value, colorClass, delay, title }: MetricItemProps) {
  const prevValueRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <motion.div
      className="flex items-center gap-1.5 rounded px-1 -mx-1"
      initial={{ opacity: 0, y: 5 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: flash ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0)',
      }}
      transition={{
        delay: delay * 0.05,
        backgroundColor: { duration: 0.6, ease: 'easeOut' },
      }}
      title={title}
    >
      <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
      <span className={`text-sm font-bold font-mono tabular-nums ${colorClass}`}>
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </span>
    </motion.div>
  );
}

function MetricGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-none">{label}</span>
      <div className="flex items-center gap-2.5">
        {children}
      </div>
    </div>
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
      <MetricGroup label="Tasks">
        <MetricItem icon={ListChecks} value={tasksPlanned} colorClass={METRIC_COLORS.cyan} delay={0} title="Tasks planned" />
        <MetricItem icon={CheckCircle2} value={tasksCompleted} colorClass={METRIC_COLORS.emerald} delay={1} title="Tasks completed" />
        <MetricItem icon={XCircle} value={tasksFailed} colorClass={METRIC_COLORS.red} delay={2} title="Tasks failed" />
        <div className="flex items-center gap-1.5" title="Success rate">
          <span className={`text-sm font-bold font-mono tabular-nums ${
            successRate >= 80 ? 'text-emerald-400' :
            successRate >= 50 ? 'text-amber-400' :
            'text-red-400'
          }`}>
            <AnimatedNumber value={successRate} />%
          </span>
        </div>
      </MetricGroup>

      <div className="w-px h-8 bg-gray-800 flex-shrink-0" />

      {/* Performance */}
      <MetricGroup label="Performance">
        <MetricItem icon={RefreshCw} value={totalCycles} colorClass={METRIC_COLORS.purple} delay={3} title="Cycles" />
        <MetricItem icon={Brain} value={llmCallCount} colorClass={METRIC_COLORS.indigo} delay={4} title="LLM calls" />
      </MetricGroup>

      <div className="w-px h-8 bg-gray-800 flex-shrink-0" />

      {/* Healing */}
      <MetricGroup label="Healing">
        <MetricItem icon={Wrench} value={healingPatchesApplied} colorClass={METRIC_COLORS.pink} delay={5} title="Healing patches applied" />
        {worktreesCreated > 0 && (
          <>
            <MetricItem icon={GitBranch} value={worktreesCreated} colorClass={METRIC_COLORS.purple} delay={5.5} title="Worktrees created" />
            {mergeConflicts > 0 && (
              <MetricItem icon={GitMerge} value={mergeConflicts} colorClass={METRIC_COLORS.red} delay={5.7} title="Merge conflicts" />
            )}
          </>
        )}
      </MetricGroup>

      <div className="w-px h-8 bg-gray-800 flex-shrink-0" />

      {/* Cost */}
      <MetricGroup label="Cost">
        <MetricItem icon={Clock} value={formatDuration(totalDurationMs)} colorClass={METRIC_COLORS.gray} delay={6} title="Total duration" />
        <MetricItem icon={DollarSign} value={formatCost(estimatedCost)} colorClass={METRIC_COLORS.amber} delay={7} title="Estimated cost" />
      </MetricGroup>

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
