'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface GoalProgressRingProps {
  total: number;
  completed: number;
  inProgress: number;
  blocked?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    containerSize: 80,
    strokeWidth: 6,
    radius: 32,
    textSize: 'text-lg',
    labelSize: 'text-[10px]',
  },
  md: {
    containerSize: 120,
    strokeWidth: 8,
    radius: 48,
    textSize: 'text-2xl',
    labelSize: 'text-xs',
  },
  lg: {
    containerSize: 160,
    strokeWidth: 10,
    radius: 64,
    textSize: 'text-3xl',
    labelSize: 'text-sm',
  },
};

/**
 * GoalProgressRing - Circular progress visualization for goals
 *
 * Shows completion percentage with segmented colors for different statuses.
 * Uses SVG for smooth rendering and animation.
 */
export default function GoalProgressRing({
  total,
  completed,
  inProgress,
  blocked = 0,
  size = 'md',
  showLabels = true,
  className = '',
}: GoalProgressRingProps) {
  const config = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * config.radius;

  // Calculate percentages
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const blockedPercent = total > 0 ? (blocked / total) * 100 : 0;

  // Calculate stroke dash values
  const completedDash = (completedPercent / 100) * circumference;
  const inProgressDash = (inProgressPercent / 100) * circumference;
  const blockedDash = (blockedPercent / 100) * circumference;

  // Calculate offsets (each segment starts where the previous ends)
  const completedOffset = 0;
  const inProgressOffset = -completedDash;
  const blockedOffset = -(completedDash + inProgressDash);

  if (total === 0) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div
          className="relative flex items-center justify-center"
          style={{ width: config.containerSize, height: config.containerSize }}
        >
          <svg
            className="transform -rotate-90"
            width={config.containerSize}
            height={config.containerSize}
          >
            <circle
              cx={config.containerSize / 2}
              cy={config.containerSize / 2}
              r={config.radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              className="text-gray-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Target className="w-6 h-6 text-gray-500" />
          </div>
        </div>
        {showLabels && (
          <p className={`mt-2 text-gray-500 ${config.labelSize}`}>No goals</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: config.containerSize, height: config.containerSize }}
      >
        <svg
          className="transform -rotate-90"
          width={config.containerSize}
          height={config.containerSize}
        >
          {/* Background circle */}
          <circle
            cx={config.containerSize / 2}
            cy={config.containerSize / 2}
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-gray-700/50"
          />

          {/* Blocked segment (red) */}
          {blocked > 0 && (
            <motion.circle
              cx={config.containerSize / 2}
              cy={config.containerSize / 2}
              r={config.radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              className="text-red-500"
              strokeDasharray={`${blockedDash} ${circumference}`}
              strokeDashoffset={blockedOffset}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${blockedDash} ${circumference}` }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            />
          )}

          {/* In Progress segment (blue) */}
          {inProgress > 0 && (
            <motion.circle
              cx={config.containerSize / 2}
              cy={config.containerSize / 2}
              r={config.radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              className="text-blue-500"
              strokeDasharray={`${inProgressDash} ${circumference}`}
              strokeDashoffset={inProgressOffset}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${inProgressDash} ${circumference}` }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            />
          )}

          {/* Completed segment (green) */}
          {completed > 0 && (
            <motion.circle
              cx={config.containerSize / 2}
              cy={config.containerSize / 2}
              r={config.radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              className="text-green-500"
              strokeDasharray={`${completedDash} ${circumference}`}
              strokeDashoffset={completedOffset}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${completedDash} ${circumference}` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-bold text-gray-100 ${config.textSize}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(completedPercent)}%
          </motion.span>
        </div>
      </div>

      {/* Legend */}
      {showLabels && (
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className={`text-gray-400 ${config.labelSize}`}>
              {completed} done
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-blue-500" />
            <span className={`text-gray-400 ${config.labelSize}`}>
              {inProgress} active
            </span>
          </div>
          {blocked > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className={`text-gray-400 ${config.labelSize}`}>
                {blocked} blocked
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Mini progress indicator for compact displays
 */
export function GoalProgressMini({
  completed,
  total,
  className = '',
}: {
  completed: number;
  total: number;
  className?: string;
}) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-8 h-8">
        <svg className="transform -rotate-90" width={32} height={32}>
          <circle
            cx={16}
            cy={16}
            r={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            className="text-gray-700"
          />
          <motion.circle
            cx={16}
            cy={16}
            r={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            className="text-green-500"
            strokeDasharray={`${(percent / 100) * 75.4} 75.4`}
            initial={{ strokeDasharray: '0 75.4' }}
            animate={{ strokeDasharray: `${(percent / 100) * 75.4} 75.4` }}
            transition={{ duration: 0.5 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-gray-300">{percent}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-400">
        {completed}/{total}
      </span>
    </div>
  );
}
