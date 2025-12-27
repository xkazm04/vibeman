'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TaskProgressProps {
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'session-limit';
  className?: string;
}

/**
 * TaskProgress - Shows visual progress for task execution
 *
 * - Pending: No progress shown
 * - Queued: Pulse animation
 * - Running: Animated indeterminate progress bar
 * - Completed: Full green bar
 * - Failed: Full red bar
 */
export function TaskProgress({ status, className = '' }: TaskProgressProps) {
  if (status === 'pending') return null;

  const getProgressStyles = () => {
    switch (status) {
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
      case 'session-limit':
        return {
          barColor: 'bg-red-500/30',
          animatedColor: 'bg-red-400',
          width: '100%',
        };
      default:
        return {
          barColor: 'bg-gray-500/30',
          animatedColor: 'bg-gray-400',
          width: '0%',
        };
    }
  };

  const styles = getProgressStyles();

  if (status === 'running') {
    return (
      <div className={`h-1 w-full overflow-hidden rounded-full ${styles.barColor} ${className}`}>
        <motion.div
          className={`h-full ${styles.animatedColor} rounded-full`}
          initial={{ x: '-100%', width: '30%' }}
          animate={{ x: '400%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    );
  }

  if (status === 'queued') {
    return (
      <div className={`h-1 w-full overflow-hidden rounded-full ${styles.barColor} ${className}`}>
        <motion.div
          className={`h-full ${styles.animatedColor} rounded-full`}
          style={{ width: styles.width }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    );
  }

  // Completed or failed - solid bar
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full ${styles.barColor} ${className}`}>
      <motion.div
        className={`h-full ${styles.animatedColor} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: styles.width }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

/**
 * BatchProgress - Shows overall progress for a batch of tasks
 */
interface BatchProgressProps {
  total: number;
  completed: number;
  running: number;
  failed: number;
  className?: string;
}

export function BatchProgress({ total, completed, running, failed, className = '' }: BatchProgressProps) {
  if (total === 0) return null;

  const completedPercent = (completed / total) * 100;
  const runningPercent = (running / total) * 100;
  const failedPercent = (failed / total) * 100;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700/50 flex">
        {/* Completed section */}
        {completed > 0 && (
          <motion.div
            className="h-full bg-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${completedPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
        {/* Running section */}
        {running > 0 && (
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${runningPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
        {/* Failed section */}
        {failed > 0 && (
          <motion.div
            className="h-full bg-red-500"
            initial={{ width: 0 }}
            animate={{ width: `${failedPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{completed}/{total} completed</span>
        {running > 0 && <span className="text-blue-400">{running} running</span>}
        {failed > 0 && <span className="text-red-400">{failed} failed</span>}
      </div>
    </div>
  );
}

export default TaskProgress;
