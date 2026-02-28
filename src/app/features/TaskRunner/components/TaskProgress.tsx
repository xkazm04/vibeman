'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TaskStatusUnion } from '../lib/types';

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

  const getProgressStyles = () => {
    switch (status.type) {
      case 'queued':
        return {
          barColor: 'bg-amber-500/30',
          animatedColor: 'bg-amber-400',
          width: '30%',
        };
      case 'running':
        return {
          barColor: 'bg-blue-500/30',
          animatedColor: 'bg-blue-400',
          width: '100%',
        };
      case 'completed':
        return {
          barColor: 'bg-green-500/30',
          animatedColor: 'bg-green-400',
          width: '100%',
        };
      case 'failed':
        return {
          barColor: 'bg-red-500/30',
          animatedColor: 'bg-red-400',
          width: '100%',
        };
    }
  };

  const styles = getProgressStyles();

  if (status.type === 'running') {
    // Indeterminate shimmer for running state (static gradient when reduced motion preferred)
    return (
      <div className={`h-1 w-full overflow-hidden rounded-full ${styles.barColor} ${className}`}>
        <div
          className={`h-full rounded-full ${prefersReducedMotion ? 'w-full animate-pulse' : 'w-2/5 animate-[shimmer-slide_1.5s_ease-in-out_infinite]'}`}
          style={{
            background: prefersReducedMotion
              ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
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
