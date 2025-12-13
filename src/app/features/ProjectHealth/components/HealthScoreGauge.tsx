'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { HealthScoreStatus } from '@/app/db/models/project-health.types';
import { getStatusColors, getScoreColor, getScoreGrade } from '../lib/healthHelpers';

interface HealthScoreGaugeProps {
  score: number;
  status: HealthScoreStatus;
  previousScore?: number | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGrade?: boolean;
  showTrend?: boolean;
}

export default function HealthScoreGauge({
  score,
  status,
  previousScore,
  size = 'lg',
  showGrade = true,
  showTrend = true,
}: HealthScoreGaugeProps) {
  const sizes = {
    sm: { width: 80, strokeWidth: 6, fontSize: 'text-lg', labelSize: 'text-xs' },
    md: { width: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-xs' },
    lg: { width: 180, strokeWidth: 12, fontSize: 'text-4xl', labelSize: 'text-sm' },
    xl: { width: 240, strokeWidth: 14, fontSize: 'text-5xl', labelSize: 'text-base' },
  };

  const { width, strokeWidth, fontSize, labelSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const colors = getStatusColors(status);
  const strokeColor = getScoreColor(score);
  const trend = previousScore !== undefined && previousScore !== null ? score - previousScore : 0;
  const grade = getScoreGrade(score);

  return (
    <div className="flex flex-col items-center gap-3" data-testid="health-score-gauge">
      <div className="relative" style={{ width, height: width }}>
        {/* Outer glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{ backgroundColor: strokeColor }}
        />

        {/* Background circle */}
        <svg
          width={width}
          height={width}
          className="transform -rotate-90 relative z-10"
        >
          {/* Track */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress arc */}
          <motion.circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 12px ${strokeColor}60)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <motion.span
            className={`font-bold ${fontSize} ${colors.text}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            data-testid="health-score-value"
          >
            {score}
          </motion.span>

          {showGrade && (
            <motion.span
              className={`${labelSize} font-semibold text-gray-400 mt-1`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Grade: {grade}
            </motion.span>
          )}

          <motion.span
            className={`${labelSize} font-mono uppercase tracking-wider ${colors.text} mt-1`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {status}
          </motion.span>
        </div>
      </div>

      {/* Trend indicator */}
      {showTrend && previousScore !== undefined && previousScore !== null && (
        <motion.div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.border} border`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          data-testid="health-score-trend"
        >
          {trend > 0 ? (
            <>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">+{Math.round(trend)} from last</span>
            </>
          ) : trend < 0 ? (
            <>
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-red-400">{Math.round(trend)} from last</span>
            </>
          ) : (
            <>
              <Minus className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">No change</span>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
