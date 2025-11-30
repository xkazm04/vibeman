'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthScoreGaugeProps {
  score: number;
  previousScore?: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function HealthScoreGauge({
  score,
  previousScore,
  size = 'md',
}: HealthScoreGaugeProps) {
  const sizes = {
    sm: { width: 80, strokeWidth: 8, fontSize: 'text-lg' },
    md: { width: 120, strokeWidth: 10, fontSize: 'text-2xl' },
    lg: { width: 160, strokeWidth: 12, fontSize: 'text-3xl' },
  };

  const { width, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  // Determine color based on score
  const getColor = (value: number) => {
    if (value >= 80) return { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500/10' };
    if (value >= 60) return { stroke: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    if (value >= 40) return { stroke: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const colors = getColor(score);
  const trend = previousScore !== undefined ? score - previousScore : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width, height: width }}>
        {/* Background circle */}
        <svg
          width={width}
          height={width}
          className="transform -rotate-90"
          data-testid="health-score-gauge"
        >
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="filter drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]"
            style={{
              filter: `drop-shadow(0 0 8px ${colors.stroke}40)`,
            }}
          />
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-bold ${fontSize} ${colors.text}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-gray-400 font-mono">HEALTH</span>
        </div>
      </div>

      {/* Trend indicator */}
      {previousScore !== undefined && (
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colors.bg}`}
        >
          {trend > 0 ? (
            <>
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400">+{trend}</span>
            </>
          ) : trend < 0 ? (
            <>
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span className="text-red-400">{trend}</span>
            </>
          ) : (
            <>
              <Minus className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400">0</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
