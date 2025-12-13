'use client';

import { motion } from 'framer-motion';

interface ROIGaugeProps {
  value: number;
  size?: number;
  showLabel?: boolean;
  label?: string;
}

export function ROIGauge({ value, size = 120, showLabel = true, label = 'ROI' }: ROIGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp value between -100 and 200 for visualization
  const clampedValue = Math.max(-100, Math.min(200, value));
  // Normalize to 0-1 range (with -100 = 0, 0 = 0.333, 100 = 0.666, 200 = 1)
  const normalizedValue = (clampedValue + 100) / 300;
  const offset = circumference * (1 - normalizedValue);

  // Color based on ROI
  const getColor = () => {
    if (value >= 100) return '#10b981'; // emerald-500
    if (value >= 50) return '#22c55e'; // green-500
    if (value >= 0) return '#eab308'; // yellow-500
    if (value >= -50) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const color = getColor();

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          data-testid="roi-gauge-value"
        >
          {value >= 0 ? '+' : ''}{value.toFixed(0)}%
        </motion.span>
        {showLabel && (
          <span className="text-xs text-gray-400 mt-1">{label}</span>
        )}
      </div>
    </div>
  );
}
