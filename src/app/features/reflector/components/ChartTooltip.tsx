'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ChartTooltipProps {
  children: ReactNode;
  accentColor?: string;
  /** CSS glow color for boxShadow, e.g. 'rgba(6, 182, 212, 0.15)' */
  glowColor?: string;
}

const DEFAULT_ACCENT = 'rgba(107, 114, 128, 0.4)';  // gray-500/40
const DEFAULT_GLOW = 'rgba(107, 114, 128, 0.1)';

/**
 * Shared glassmorphism tooltip wrapper for all Recharts charts.
 * Provides: backdrop-blur-xl, rounded-xl, corner markers, dynamic border & glow.
 */
export default function ChartTooltip({
  children,
  accentColor = DEFAULT_ACCENT,
  glowColor = DEFAULT_GLOW,
}: ChartTooltipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gray-950/95 backdrop-blur-xl border rounded-xl px-4 py-3 shadow-2xl"
      style={{ borderColor: accentColor, boxShadow: `0 0 20px ${glowColor}` }}
    >
      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l rounded-tl" style={{ borderColor: accentColor }} />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r rounded-tr" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l rounded-bl" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r rounded-br" style={{ borderColor: accentColor }} />

      {children}
    </motion.div>
  );
}
