'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { memo } from 'react';
import type { Checkpoint } from '../lib/checkpoint.types';
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

  return (
    <div className="space-y-1">
      {checkpoints.map((checkpoint) => (
        <CheckpointItem key={checkpoint.id} checkpoint={checkpoint} />
      ))}
    </div>
  );
});

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
      <span className="text-gray-500 font-mono">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-400"
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
 * Single checkpoint item with status icon
 */
function CheckpointItem({ checkpoint }: { checkpoint: Checkpoint }) {
  const { status, label, activeLabel } = checkpoint;

  const statusIcon = {
    pending: '[ ]',
    in_progress: '[>]',
    completed: '[x]',
    skipped: '[-]',
  }[status];

  const statusColor = {
    pending: 'text-gray-500',
    in_progress: 'text-blue-400',
    completed: 'text-green-400',
    skipped: 'text-gray-600',
  }[status];

  const labelColor = {
    pending: 'text-gray-500',
    in_progress: 'text-gray-300',
    completed: 'text-gray-400',
    skipped: 'text-gray-600',
  }[status];

  return (
    <motion.div
      className="flex items-center gap-2 text-xs"
      initial={status === 'in_progress' ? { opacity: 0.5 } : false}
      animate={status === 'in_progress' ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
      transition={status === 'in_progress' ? { duration: 1.5, repeat: Infinity } : undefined}
    >
      <span className={statusColor}>{statusIcon}</span>
      <span className={labelColor}>
        {status === 'in_progress' ? activeLabel : label}
      </span>
    </motion.div>
  );
}

export default CheckpointProgress;
