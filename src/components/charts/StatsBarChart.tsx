'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  value: number;
  color?: string;
}

export interface StatsBarChartProps {
  /** Title of the chart */
  title: string;
  /** Subtitle text */
  subtitle?: string;
  /** Array of stat items to display */
  stats: StatItem[];
  /** Icon to display in header */
  icon?: LucideIcon;
  /** Icon color class */
  iconColor?: string;
  /** Show total badge */
  showTotal?: boolean;
  /** Width of the component */
  width?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
}

// Default color palette
const DEFAULT_COLORS = [
  'bg-cyan-500/80',
  'bg-blue-500/80',
  'bg-purple-500/80',
  'bg-green-500/80',
  'bg-amber-500/80',
  'bg-red-500/80',
  'bg-pink-500/80',
  'bg-indigo-500/80',
];

/**
 * StatsBarChart - A horizontal bar chart for displaying statistics
 *
 * Features:
 * - Animated bar entries
 * - Color-coded bars
 * - Total count badge
 * - Empty state handling
 */
export default function StatsBarChart({
  title,
  subtitle,
  stats,
  icon: Icon = BarChart3,
  iconColor = 'text-blue-400',
  showTotal = true,
  width = 'w-[420px]',
  emptyMessage = 'No data available',
  emptyDescription = 'Data will appear here when available',
}: StatsBarChartProps) {
  if (stats.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8"
      >
        <Icon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
        <p className="text-sm text-gray-600 mt-1">{emptyDescription}</p>
      </motion.div>
    );
  }

  const maxCount = Math.max(...stats.map(s => s.value));
  const total = stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className={`space-y-4 flex flex-col ${width}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/30`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Total count */}
        {showTotal && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg"
          >
            <span className="text-xs font-medium text-blue-400">
              {total} total
            </span>
          </motion.div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="space-y-3">
        <AnimatePresence>
          {stats.map((stat, index) => {
            const color = stat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const percentage = (stat.value / maxCount) * 100;

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: {
                    delay: index * 0.05,
                    duration: 0.3
                  }
                }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-1.5"
              >
                {/* Label and count */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300">{stat.label}</span>
                  <span className="text-xs font-mono text-gray-400">{stat.value}</span>
                </div>

                {/* Bar */}
                <div className="relative h-2 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${percentage}%`,
                      transition: {
                        delay: index * 0.05 + 0.2,
                        duration: 0.6,
                        ease: 'easeOut'
                      }
                    }}
                    className={`h-full ${color} rounded-full`}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
