'use client';

import React from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { Scan } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * ScanVisualization - Animated visualization component for the scan progress.
 *
 * Displays an animated grid with scanning beam, center icon with ripple effect,
 * progress percentage, and floating particles.
 *
 * @component
 *
 * @example
 * <ScanVisualization progress={45} />
 */
export interface ScanVisualizationProps {
  progress: number;
  /** Optional color override for theming (hex format) */
  color?: string;
}

export function ScanVisualization({ progress, color }: ScanVisualizationProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  // Use custom color if provided, otherwise use theme colors
  const accentColor = color || colors.baseColor;

  return (
    <div className={`relative w-full h-32 overflow-hidden rounded-xl bg-gradient-to-br from-black/40 to-black/20 border ${colors.borderLight}`}>
      {/* Animated grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Scanning beam */}
      <motion.div
        className="absolute left-0 right-0 h-1"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`
        }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center border"
            style={{
              background: `linear-gradient(to bottom right, ${accentColor}20, ${accentColor}10)`,
              borderColor: `${accentColor}40`
            }}
          >
            <Scan className="w-8 h-8" style={{ color: accentColor }} />
          </div>
          {/* Ripple effect */}
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: accentColor }}
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </div>

      {/* Progress percentage */}
      <div className="absolute bottom-3 right-3">
        <span className="text-2xl font-bold font-mono" style={{ color: accentColor }}>
          {progress}<span className="text-sm opacity-60">%</span>
        </span>
      </div>

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ backgroundColor: accentColor }}
          initial={{ left: `${20 + i * 15}%`, bottom: '10%', opacity: 0 }}
          animate={{
            bottom: ['10%', '90%'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}

export default ScanVisualization;
