'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ProgressItem {
  id: string;
  name: string;
  progress: number; // 0-100
  isRunning: boolean;
}

export interface CompactMultiProgressBarProps {
  items: ProgressItem[];
  maxVisible?: number;
  className?: string;
  testId?: string;
}

/**
 * Compact Multi-Progress Bar
 *
 * Displays multiple progress bars in a single horizontal row.
 * Each bar is 1px height with golden/amber tones.
 * Dynamically sizes bars based on count (max 5 visible).
 *
 * Design: Minimal, elegant, space-efficient
 */
export default function CompactMultiProgressBar({
  items,
  maxVisible = 5,
  className = '',
  testId = 'compact-multi-progress',
}: CompactMultiProgressBarProps) {
  // Filter to only running items
  const runningItems = items.filter(item => item.isRunning);

  // Limit to maxVisible
  const visibleItems = runningItems.slice(0, maxVisible);

  if (visibleItems.length === 0) {
    return null;
  }

  // Calculate width percentage for each bar
  const barWidth = 100 / visibleItems.length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`w-full ${className}`}
      data-testid={testId}
    >
      {/* Container for all progress bars */}
      <div className="flex items-center gap-0 w-full">
        <AnimatePresence mode="sync">
          {visibleItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              style={{ width: `${barWidth}%` }}
              className="relative"
              data-testid={`${testId}-item-${item.id}`}
            >
              {/* Background track - 1px height */}
              <div className="relative w-full h-[1px] bg-gray-800/50 overflow-hidden">
                {/* Progress fill - golden gradient */}
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.max(item.progress, 0), 100)}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {/* Shimmer effect for active scans */}
                  {item.isRunning && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/50 to-transparent"
                      animate={{
                        x: ['-100%', '200%'],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                  )}

                  {/* Glow effect */}
                  <div className="absolute inset-0 shadow-[0_0_4px_1px_rgba(251,191,36,0.5)]" />
                </motion.div>

                {/* Indeterminate mode (when progress is 0) */}
                {item.progress === 0 && item.isRunning && (
                  <motion.div
                    className="absolute inset-y-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
                    style={{ width: '30%' }}
                    animate={{
                      x: ['-30%', '130%'],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <div className="absolute inset-0 shadow-[0_0_4px_1px_rgba(251,191,36,0.5)]" />
                  </motion.div>
                )}
              </div>

              {/* Optional: Scan name label (tooltip on hover) */}
              <div className="absolute -bottom-5 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-[9px] font-mono text-amber-400 text-center truncate px-1">
                  {item.name}
                  {item.progress > 0 && ` ${Math.round(item.progress)}%`}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Overflow indicator (if more than maxVisible) */}
      {runningItems.length > maxVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-1 text-center"
        >
          <span className="text-[9px] font-mono text-amber-600">
            +{runningItems.length - maxVisible} more
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
