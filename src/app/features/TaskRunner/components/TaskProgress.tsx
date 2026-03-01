'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TaskStatusUnion } from '../lib/types';
import { getTheme } from '../lib/taskStatusUtils';

interface TaskProgressProps {
  status: TaskStatusUnion;
  className?: string;
}

/**
 * TaskProgress - Shows visual progress for task execution
 *
 * - Idle: No progress shown
 * - Queued: Pulse animation
 * - Running: Animated indeterminate progress bar
 * - Completed: Full green bar
 * - Failed: Full red bar
 */
export function TaskProgress({ status, className = '' }: TaskProgressProps) {
  const prefersReducedMotion = useReducedMotion();

  if (status.type === 'idle') return null;

  const theme = getTheme(status.type);
  const styles = {
    barColor: theme.barBg,
    animatedColor: theme.barFill,
    width: status.type === 'queued' ? '30%' : '100%',
  };

  if (status.type === 'running') {
    // Indeterminate shimmer for running state (static gradient when reduced motion preferred)
    return (
      <div className={`h-1 w-full overflow-hidden rounded-full ${styles.barColor} ${className}`}>
        <div
          className={`h-full rounded-full ${prefersReducedMotion ? 'w-full opacity-60' : 'w-2/5 animate-[shimmer-slide_1.5s_ease-in-out_infinite]'}`}
          style={{
            background: prefersReducedMotion
              ? 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)'
              : 'linear-gradient(90deg, transparent, #60a5fa, transparent)',
          }}
        />
      </div>
    );
  }

  if (status.type === 'queued') {
    // Static progress bar for queued state
    return (
      <div className={`h-1 w-full overflow-hidden rounded-full ${styles.barColor} ${className}`}>
        <div className={`h-full ${styles.animatedColor} rounded-full`} style={{ width: styles.width }} />
      </div>
    );
  }

  // Completed or failed - solid bar
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full ${styles.barColor} ${className}`}>
      <motion.div
        className={`h-full ${styles.animatedColor} rounded-full`}
        initial={prefersReducedMotion ? false : { width: 0 }}
        animate={{ width: styles.width }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

export default TaskProgress;
