'use client';

import { motion } from 'framer-motion';
import { transition } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ConfidenceBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const COLOR_STOPS = [
  { threshold: 30, bg: 'bg-red-500', text: 'text-red-400' },
  { threshold: 60, bg: 'bg-amber-500', text: 'text-amber-400' },
  { threshold: 80, bg: 'bg-cyan-500', text: 'text-cyan-400' },
  { threshold: 100, bg: 'bg-emerald-500', text: 'text-emerald-400' },
];

function getColor(value: number) {
  return COLOR_STOPS.find(s => value <= s.threshold) ?? COLOR_STOPS[COLOR_STOPS.length - 1];
}

export default function ConfidenceBar({ value, size = 'sm', showLabel = false }: ConfidenceBarProps) {
  const prefersReduced = useReducedMotion();
  const color = getColor(value);
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${height} rounded-full bg-zinc-800 overflow-hidden`}>
        <motion.div
          className={`${height} rounded-full ${color.bg}`}
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
