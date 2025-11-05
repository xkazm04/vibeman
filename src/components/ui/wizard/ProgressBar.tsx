'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'cyan' | 'green' | 'blue' | 'purple';
  height?: 'sm' | 'md' | 'lg';
  className?: string;
  'data-testid'?: string;
}

/**
 * ProgressBar - Animated progress indicator
 *
 * Features:
 * - Smooth animation
 * - Multiple color variants
 * - Optional label and percentage display
 * - Configurable height
 */
export default function ProgressBar({
  progress,
  label,
  showPercentage = true,
  variant = 'cyan',
  height = 'md',
  className = '',
  'data-testid': dataTestId,
}: ProgressBarProps) {
  const variants = {
    cyan: 'from-cyan-500 to-blue-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-indigo-500',
    purple: 'from-purple-500 to-pink-500',
  };

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={`space-y-2 ${className}`} data-testid={dataTestId}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-gray-300">{label}</span>}
          {showPercentage && (
            <span className="text-cyan-400 font-medium">{progress}%</span>
          )}
        </div>
      )}
      <div className={`${heights[height]} bg-black/50 rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full bg-gradient-to-r ${variants[variant]}`}
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
