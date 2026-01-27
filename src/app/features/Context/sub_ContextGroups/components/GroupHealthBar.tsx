/**
 * GroupHealthBar
 *
 * Progress bar displaying the health score of a context group.
 * Width represents the health score (0-100%).
 * Color matches the group's theme color.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface GroupHealthBarProps {
  healthScore: number | null | undefined;
  color: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const GroupHealthBar: React.FC<GroupHealthBarProps> = ({
  healthScore,
  color,
  showLabel = true,
  size = 'md',
}) => {
  // If no health score, don't render
  if (healthScore === null || healthScore === undefined) {
    return null;
  }

  // Clamp score to 0-100
  const score = Math.max(0, Math.min(100, healthScore));

  // Get health status color
  const getStatusColor = () => {
    if (score >= 80) return '#22c55e'; // Green
    if (score >= 60) return '#eab308'; // Yellow
    if (score >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  // Size configurations
  const sizeConfig = {
    sm: { height: 'h-1.5', fontSize: 'text-xs' },
    md: { height: 'h-2', fontSize: 'text-sm' },
    lg: { height: 'h-3', fontSize: 'text-base' },
  };

  const { height, fontSize } = sizeConfig[size];

  return (
    <div className="flex items-center gap-3">
      {/* Progress bar container */}
      <div
        className={`flex-1 ${height} bg-gray-700/50 rounded-full overflow-hidden border border-gray-600/30`}
        style={{
          minWidth: '100px',
          maxWidth: '150px',
        }}
      >
        <motion.div
          className={`${height} rounded-full relative overflow-hidden`}
          style={{
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}50`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          />
        </motion.div>
      </div>

      {/* Score label */}
      {showLabel && (
        <div className="flex items-center gap-1">
          <motion.span
            className={`font-bold font-mono ${fontSize}`}
            style={{ color: getStatusColor() }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {score}
          </motion.span>
          <span className={`${fontSize} text-gray-500 font-mono`}>%</span>
        </div>
      )}
    </div>
  );
};

export default GroupHealthBar;
