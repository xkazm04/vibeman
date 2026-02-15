'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { memo, useState, useEffect, useMemo } from 'react';
import { CheckCircle, Circle, Loader2, Minus } from 'lucide-react';
import type { Checkpoint, CheckpointStatus } from '../lib/checkpoint.types';
import { getCheckpointProgress } from '../lib/checkpointExtractor';

interface CheckpointProgressProps {
  checkpoints: Checkpoint[];
  compact?: boolean;
}

/**
 * Displays progress through execution checkpoints
 * Shows completed/total count and current active checkpoint
 */
export const CheckpointProgress = memo(function CheckpointProgress({
  checkpoints,
  compact = false,
}: CheckpointProgressProps) {
  if (!checkpoints || checkpoints.length === 0) {
    return null;
  }

  const { completed, total, current } = getCheckpointProgress(checkpoints);

  if (compact) {
    return (
      <CompactCheckpointProgress
        completed={completed}
        total={total}
        current={current}
      />
    );
  }

  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      {/* Progress bar + elapsed time */}
      <ProgressHeader
        completed={completed}
        total={total}
        percentage={percentage}
        checkpoints={checkpoints}
      />

      {/* Checkpoint list */}
      {checkpoints.map((checkpoint) => (
        <CheckpointItem key={checkpoint.id} checkpoint={checkpoint} />
      ))}
    </div>
  );
});

/**
 * Progress bar with percentage and elapsed time
 */
function ProgressHeader({
  completed,
  total,
  percentage,
  checkpoints,
}: {
  completed: number;
  total: number;
  percentage: number;
  checkpoints: Checkpoint[];
}) {
  const elapsed = useElapsedTime(checkpoints);

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
        <span className="font-mono tabular-nums">
          {completed}/{total} checkpoints
        </span>
        {elapsed && (
          <span className="font-mono tabular-nums text-gray-500">
            {elapsed}
          </span>
        )}
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/**
 * Hook to compute elapsed time since first checkpoint started
 */
function useElapsedTime(checkpoints: Checkpoint[]): string | null {
  const firstStartedAt = useMemo(() => {
    const startTimes = checkpoints
      .map(c => c.startedAt)
      .filter((t): t is number => t != null);
    return startTimes.length > 0 ? Math.min(...startTimes) : null;
  }, [checkpoints]);

  const isFinished = useMemo(() =>
    checkpoints.every(c => c.status === 'completed' || c.status === 'skipped'),
    [checkpoints]
  );

  const lastCompletedAt = useMemo(() => {
    if (!isFinished) return null;
    const endTimes = checkpoints
      .map(c => c.completedAt)
      .filter((t): t is number => t != null);
    return endTimes.length > 0 ? Math.max(...endTimes) : null;
  }, [checkpoints, isFinished]);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (firstStartedAt == null || isFinished) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [firstStartedAt, isFinished]);

  if (firstStartedAt == null) return null;

  const endTime = isFinished && lastCompletedAt ? lastCompletedAt : now;
  const seconds = Math.max(0, Math.floor((endTime - firstStartedAt) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Compact version showing "3/7 Current activity..."
 */
function CompactCheckpointProgress({
  completed,
  total,
  current,
}: {
  completed: number;
  total: number;
  current: Checkpoint | null;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 font-mono tabular-nums bg-gray-800/30 px-1.5 py-0.5 rounded">
        {completed}/{total}
      </span>
      <AnimatePresence mode="wait">
        {current ? (
          <motion.span
            key={current.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            className="text-gray-400 truncate max-w-[200px]"
          >
            {current.activeLabel}
          </motion.span>
        ) : completed === total ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-green-400 font-medium"
          >
            Complete
          </motion.span>
        ) : (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-500"
          >
            Waiting...
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * SVG icon for checkpoint status
 */
function StatusIcon({ status }: { status: CheckpointStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />;
    case 'in_progress':
      return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />;
    case 'skipped':
      return <Minus className="w-3.5 h-3.5 text-gray-600 shrink-0" />;
    case 'pending':
    default:
      return <Circle className="w-3.5 h-3.5 text-gray-600 shrink-0" />;
  }
}

/**
 * Single checkpoint item with SVG status icon
 */
function CheckpointItem({ checkpoint }: { checkpoint: Checkpoint }) {
  const { status, label, activeLabel } = checkpoint;

  const labelColor = {
    pending: 'text-gray-500',
    in_progress: 'text-gray-300',
    completed: 'text-gray-400',
    skipped: 'text-gray-600',
  }[status];

  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      <StatusIcon status={status} />
      <span className={labelColor}>
        {status === 'in_progress' ? activeLabel : label}
      </span>
    </div>
  );
}

export default CheckpointProgress;
