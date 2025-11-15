/**
 * ScanProgressBar Component
 *
 * A reusable progress bar that visualizes scan progress with animated gradients.
 * Supports both determinate mode (when total tokens are known) and indeterminate mode
 * (when total is unknown). Includes accessibility features and smooth Framer Motion animations.
 *
 * @example
 * // Determinate mode (known total)
 * <ScanProgressBar
 *   totalTokens={10000}
 *   processedTokens={3500}
 *   state="scanning"
 * />
 *
 * @example
 * // Indeterminate mode (unknown total)
 * <ScanProgressBar
 *   processedTokens={3500}
 *   state="scanning"
 * />
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type ScanProgressState = 'idle' | 'scanning' | 'success' | 'error';

export interface ScanProgressBarProps {
  /** Total number of tokens to process (omit for indeterminate mode) */
  totalTokens?: number;
  /** Number of tokens processed so far */
  processedTokens: number;
  /** Current state of the scan */
  state: ScanProgressState;
  /** Optional label to display above the progress bar */
  label?: string;
  /** Custom height for the progress bar (default: 8px) */
  height?: number;
  /** Show percentage text (default: true when totalTokens is provided) */
  showPercentage?: boolean;
  /** Show token counts (default: true when totalTokens is provided) */
  showTokenCounts?: boolean;
  /** Custom className for the container */
  className?: string;
}

export default function ScanProgressBar({
  totalTokens,
  processedTokens,
  state,
  label,
  height = 8,
  showPercentage = totalTokens !== undefined,
  showTokenCounts = totalTokens !== undefined,
  className = '',
}: ScanProgressBarProps) {
  // Calculate progress percentage (0-100)
  const progressPercentage = totalTokens
    ? Math.min(Math.max((processedTokens / totalTokens) * 100, 0), 100)
    : 0;

  // Determine if we're in indeterminate mode
  const isIndeterminate = totalTokens === undefined || totalTokens === 0;

  // Format numbers with commas for readability
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Determine color scheme based on state
  const getColorScheme = () => {
    switch (state) {
      case 'success':
        return {
          bg: 'from-green-500 via-green-400 to-emerald-500',
          shadow: 'shadow-green-500/50',
          text: 'text-green-400',
        };
      case 'error':
        return {
          bg: 'from-red-500 via-red-400 to-orange-500',
          shadow: 'shadow-red-500/50',
          text: 'text-red-400',
        };
      case 'scanning':
        return {
          bg: 'from-blue-500 via-blue-400 to-cyan-500',
          shadow: 'shadow-blue-500/50',
          text: 'text-blue-400',
        };
      default:
        return {
          bg: 'from-gray-500 via-gray-400 to-gray-500',
          shadow: 'shadow-gray-500/50',
          text: 'text-gray-400',
        };
    }
  };

  const colors = getColorScheme();

  return (
    <motion.div
      className={`w-full ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with label and stats */}
      {(label || showPercentage || showTokenCounts) && (
        <div className="flex items-center justify-between mb-2">
          {/* Label */}
          {label && (
            <span className="text-sm font-semibold text-gray-400">
              {label}
            </span>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-sm">
            {/* Token counts */}
            {showTokenCounts && totalTokens !== undefined && (
              <span className="font-mono text-gray-400">
                {formatNumber(processedTokens)} / {formatNumber(totalTokens)} tokens
              </span>
            )}

            {/* Percentage */}
            {showPercentage && !isIndeterminate && (
              <span className={`font-semibold ${colors.text}`}>
                {Math.round(progressPercentage)}%
              </span>
            )}

            {/* Indeterminate indicator */}
            {isIndeterminate && state === 'scanning' && (
              <span className={`font-semibold ${colors.text} animate-pulse`}>
                Processing...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar container */}
      <div
        className="w-full bg-gray-700/40 rounded-full overflow-hidden relative"
        style={{ height: `${height}px` }}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : Math.round(progressPercentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Scan progress'}
        aria-busy={state === 'scanning'}
      >
        {/* Static background gradient - (removed animation for performance) */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20" />

        {/* Progress fill - Determinate mode */}
        {!isIndeterminate && (
          <motion.div
            className={`relative h-full bg-gradient-to-r ${colors.bg} shadow-lg ${colors.shadow}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
          >
            {/* Static highlight - (removed shimmer animation for performance) */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </motion.div>
        )}

        {/* Progress fill - Indeterminate mode (sliding bar) */}
        {isIndeterminate && state === 'scanning' && (
          <motion.div
            className={`absolute h-full bg-gradient-to-r ${colors.bg} shadow-lg ${colors.shadow}`}
            style={{ width: '40%' }}
            animate={{
              x: ['-40%', '140%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </motion.div>
        )}

        {/* Completion fill for success/error states */}
        {(state === 'success' || state === 'error') && !isIndeterminate && (
          <motion.div
            className={`absolute inset-0 bg-gradient-to-r ${colors.bg} shadow-lg ${colors.shadow}`}
            initial={{ width: `${progressPercentage}%` }}
            animate={{ width: '100%' }}
            transition={{
              duration: 0.4,
              ease: 'easeOut',
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 1.5,
                repeat: 1,
                ease: 'linear',
              }}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
