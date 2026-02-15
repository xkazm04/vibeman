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
    // Indeterminate shimmer for running state
    return (
      <div className={`h-1 w-full overflow-hidden rounded-full ${styles.barColor} ${className}`}>
        <div
          className="h-full w-2/5 rounded-full animate-[shimmer-slide_1.5s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(90deg, transparent, #60a5fa, transparent)',
          }}
        />
      </div>
    );
  }

  if (status === 'queued') {
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

interface CircularBatchProgressProps {
  total: number;
  completed: number;
  running: number;
  failed: number;
  className?: string;
}

export function CircularBatchProgress({ total, completed, running, failed, className = '' }: CircularBatchProgressProps) {
  if (total === 0) return null;

  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const completedPercent = completed / total;
  const failedPercent = failed / total;
  const runningPercent = running / total;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(63, 63, 70, 0.5)"
          strokeWidth={strokeWidth}
        />
        {/* Completed arc */}
        {completed > 0 && (
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#22c55e"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - completedPercent) }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
        {/* Running arc */}
        {running > 0 && (
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#3b82f6"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - runningPercent)}
            style={{ transform: `rotate(${completedPercent * 360}deg)`, transformOrigin: 'center' }}
          />
        )}
        {/* Failed arc */}
        {failed > 0 && (
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - failedPercent)}
            style={{ transform: `rotate(${(completedPercent + runningPercent) * 360}deg)`, transformOrigin: 'center' }}
          />
        )}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold font-mono text-white">{completed}/{total}</span>
        <span className="text-[9px] text-gray-500">done</span>
      </div>
    </div>
  );
}

export default TaskProgress;
