'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HealthScoreStatus } from '@/app/db/models/project-health.types';
import { getStatusColor } from '@/lib/health/healthCalculator';

interface HealthScoreRingProps {
  score: number;
  status: HealthScoreStatus;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'stable';
  label?: string;
  animate?: boolean;
}

const SIZE_CONFIG = {
  sm: { ring: 80, stroke: 6, fontSize: 'text-lg', labelSize: 'text-[10px]' },
  md: { ring: 120, stroke: 8, fontSize: 'text-2xl', labelSize: 'text-xs' },
  lg: { ring: 160, stroke: 10, fontSize: 'text-4xl', labelSize: 'text-sm' },
};

const STATUS_COLORS: Record<HealthScoreStatus, { ring: string; glow: string; text: string }> = {
  excellent: {
    ring: 'stroke-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.4)]',
    text: 'text-emerald-400',
  },
  good: {
    ring: 'stroke-green-400',
    glow: 'shadow-[0_0_20px_rgba(74,222,128,0.4)]',
    text: 'text-green-400',
  },
  fair: {
    ring: 'stroke-yellow-400',
    glow: 'shadow-[0_0_20px_rgba(250,204,21,0.4)]',
    text: 'text-yellow-400',
  },
  poor: {
    ring: 'stroke-orange-400',
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.4)]',
    text: 'text-orange-400',
  },
  critical: {
    ring: 'stroke-red-400',
    glow: 'shadow-[0_0_20px_rgba(248,113,113,0.4)]',
    text: 'text-red-400',
  },
};

export default function HealthScoreRing({
  score,
  status,
  size = 'md',
  showTrend = true,
  trend = 0,
  trendDirection = 'stable',
  label = 'Health Score',
  animate = true,
}: HealthScoreRingProps) {
  const config = SIZE_CONFIG[size];
  const colors = STATUS_COLORS[status];

  const radius = (config.ring - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;
  const trendColor = trendDirection === 'up' ? 'text-green-400' : trendDirection === 'down' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="relative flex flex-col items-center">
      {/* Ring Container */}
      <div className={`relative ${colors.glow} rounded-full`}>
        <svg
          width={config.ring}
          height={config.ring}
          className="transform -rotate-90"
        >
          {/* Background Ring */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-gray-700/50"
          />

          {/* Progress Ring */}
          <motion.circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            className={colors.ring}
            initial={animate ? { strokeDashoffset: circumference } : undefined}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>

        {/* Score Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-bold ${config.fontSize} ${colors.text}`}
            initial={animate ? { opacity: 0, scale: 0.5 } : undefined}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {score}
          </motion.span>
          <span className={`${config.labelSize} text-gray-400 font-medium`}>
            {label}
          </span>
        </div>
      </div>

      {/* Trend Indicator */}
      {showTrend && trend !== 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className={`flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-gray-800/50 border border-gray-700/50`}
        >
          <TrendIcon className={`w-3 h-3 ${trendColor}`} />
          <span className={`text-xs font-medium ${trendColor}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </motion.div>
      )}

      {/* Status Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className={`mt-2 px-3 py-1 rounded-full text-xs font-medium capitalize
          bg-${getStatusColor(status)}-500/10 border border-${getStatusColor(status)}-500/30
          ${colors.text}`}
      >
        {status}
      </motion.div>
    </div>
  );
}
