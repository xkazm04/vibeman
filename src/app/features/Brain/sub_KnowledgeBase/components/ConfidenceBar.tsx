'use client';

import { motion } from 'framer-motion';
import { transition } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getConfidenceColor } from '@/lib/confidenceColor';

interface ConfidenceBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export default function ConfidenceBar({ value, size = 'sm', showLabel = false }: ConfidenceBarProps) {
  const prefersReduced = useReducedMotion();
  const color = getConfidenceColor(value);
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${height} rounded-full bg-zinc-800 overflow-hidden`}>
        <motion.div
          className={`${height} rounded-full ${color.barBg}`}
          initial={prefersReduced ? false : { width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={transition.deliberate}
        />
      </div>
      {showLabel && (
        <span className={`text-2xs font-mono tabular-nums ${color.text}`}>
          {value}%
        </span>
      )}
    </div>
  );
}
