'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Breakpoint } from '@/lib/emulator/mediaQueryDetector';
import { getActiveBreakpoint, DEFAULT_BREAKPOINTS } from '@/lib/emulator/mediaQueryDetector';

interface BreakpointGuideProps {
  /** Current viewport width */
  currentWidth: number;
  /** Breakpoints to display */
  breakpoints?: Breakpoint[];
  /** Whether to show all breakpoint ranges */
  showAllRanges?: boolean;
  /** Whether to show device preset markers */
  showDeviceMarkers?: boolean;
  /** Callback when clicking a breakpoint range */
  onBreakpointClick?: (breakpoint: Breakpoint) => void;
}

// Device width markers
const DEVICE_MARKERS = [
  { name: 'Mobile', width: 375, icon: '📱' },
  { name: 'Tablet', width: 768, icon: '📱' },
  { name: 'Laptop', width: 1024, icon: '💻' },
  { name: 'Desktop', width: 1440, icon: '🖥️' },
];

export default function BreakpointGuide({
  currentWidth,
  breakpoints = DEFAULT_BREAKPOINTS,
  showAllRanges = true,
  showDeviceMarkers = true,
  onBreakpointClick,
}: BreakpointGuideProps) {
  const activeBreakpoint = useMemo(
    () => getActiveBreakpoint(currentWidth, breakpoints),
    [currentWidth, breakpoints]
  );

  const maxDisplayWidth = 2560;
  const scale = 100 / maxDisplayWidth;

  return (
    <div className="relative w-full">
      {/* Header showing active breakpoint info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Active Breakpoint:</span>
          {activeBreakpoint && (
            <motion.div
              key={activeBreakpoint.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${activeBreakpoint.color}20` }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activeBreakpoint.color }}
              />
              <span className="text-gray-200">{activeBreakpoint.label}</span>
              <span className="text-gray-500">
                ({activeBreakpoint.minWidth ?? 0}px - {activeBreakpoint.maxWidth ?? '∞'}px)
              </span>
            </motion.div>
          )}
        </div>
        <span className="text-xs text-gray-500">{currentWidth}px</span>
      </div>

      {/* Visual breakpoint ranges */}
      <div className="relative h-8 bg-gray-800/50 rounded-lg overflow-hidden">
        {/* Breakpoint range bars */}
        {breakpoints.map((bp) => {
          const startPercent = (bp.minWidth ?? 0) * scale;
          const endPercent = (bp.maxWidth ?? maxDisplayWidth) * scale;
          const widthPercent = endPercent - startPercent;
          const isActive = activeBreakpoint?.name === bp.name;

          return (
            <motion.button
              key={bp.name}
              className={`absolute top-0 h-full transition-all ${
                isActive ? 'z-10' : 'z-0'
              }`}
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
              }}
              onClick={() => onBreakpointClick?.(bp)}
              whileHover={{ scale: 1.02 }}
            >
              <div
                className={`w-full h-full transition-opacity ${
                  showAllRanges || isActive ? 'opacity-100' : 'opacity-30'
                }`}
                style={{
                  backgroundColor: isActive ? bp.color : `${bp.color}40`,
                }}
              />

              {/* Label inside bar */}
              {widthPercent > 5 && (
                <span
                  className={`absolute inset-0 flex items-center justify-center text-[10px] font-medium ${
                    isActive ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {bp.label}
                </span>
              )}
            </motion.button>
          );
        })}

        {/* Current position indicator */}
        <motion.div
          className="absolute top-0 h-full w-0.5 bg-white z-20"
          style={{ left: `${currentWidth * scale}%` }}
          animate={{ left: `${currentWidth * scale}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-lg" />
        </motion.div>

        {/* Device markers */}
        <AnimatePresence>
          {showDeviceMarkers &&
            DEVICE_MARKERS.map((device) => (
              <div
                key={device.name}
                className="absolute top-0 h-full flex flex-col items-center justify-end pb-1 pointer-events-none"
                style={{ left: `${device.width * scale}%` }}
              >
                <div className="w-px h-2 bg-gray-600" />
                <span className="text-[8px] text-gray-500 whitespace-nowrap">
                  {device.icon}
                </span>
              </div>
            ))}
        </AnimatePresence>
      </div>

      {/* Width scale */}
      <div className="flex justify-between mt-1 text-[9px] text-gray-600">
        <span>0</span>
        <span>640</span>
        <span>768</span>
        <span>1024</span>
        <span>1280</span>
        <span>1536</span>
        <span>2560</span>
      </div>
    </div>
  );
}

/**
 * Compact inline guide for header use
 */
export function BreakpointGuideInline({
  currentWidth,
  breakpoints = DEFAULT_BREAKPOINTS,
}: Pick<BreakpointGuideProps, 'currentWidth' | 'breakpoints'>) {
  const activeBreakpoint = useMemo(
    () => getActiveBreakpoint(currentWidth, breakpoints),
    [currentWidth, breakpoints]
  );

  if (!activeBreakpoint) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Mini breakpoint indicator */}
      <div className="flex items-center gap-0.5">
        {breakpoints.map((bp) => (
          <div
            key={bp.name}
            className={`h-1.5 rounded-full transition-all ${
              bp.name === activeBreakpoint.name ? 'w-4' : 'w-1.5'
            }`}
            style={{
              backgroundColor:
                bp.name === activeBreakpoint.name ? bp.color : `${bp.color}40`,
            }}
          />
        ))}
      </div>

      {/* Label */}
      <span
        className="text-[10px] font-medium"
        style={{ color: activeBreakpoint.color }}
      >
        {activeBreakpoint.label}
      </span>
    </div>
  );
}
