'use client';

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Breakpoint } from '@/lib/emulator/mediaQueryDetector';
import {
  DEFAULT_BREAKPOINTS,
  generateRulerMarks,
  getActiveBreakpoint,
} from '@/lib/emulator/mediaQueryDetector';

interface BreakpointRulerProps {
  /** Current viewport width in pixels */
  currentWidth: number;
  /** Callback when width changes via dragging */
  onWidthChange: (width: number) => void;
  /** Callback when a breakpoint is clicked for jumping */
  onBreakpointClick?: (breakpoint: Breakpoint) => void;
  /** Breakpoints to display (defaults to Tailwind) */
  breakpoints?: Breakpoint[];
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Whether dragging is enabled */
  isDraggable?: boolean;
  /** Compact mode for smaller display */
  compact?: boolean;
}

export default function BreakpointRuler({
  currentWidth,
  onWidthChange,
  onBreakpointClick,
  breakpoints = DEFAULT_BREAKPOINTS,
  minWidth = 320,
  maxWidth = 2560,
  isDraggable = true,
  compact = false,
}: BreakpointRulerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width for scaling
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Scale factor: pixel position to container width
  const scale = containerWidth / (maxWidth - minWidth);

  // Convert pixel width to x position
  const widthToPosition = useCallback(
    (width: number): number => {
      return (width - minWidth) * scale;
    },
    [minWidth, scale]
  );

  // Convert x position to pixel width
  const positionToWidth = useCallback(
    (x: number): number => {
      const width = Math.round(x / scale + minWidth);
      return Math.max(minWidth, Math.min(maxWidth, width));
    },
    [minWidth, maxWidth, scale]
  );

  // Generate ruler marks
  const rulerMarks = useMemo(() => {
    const majorInterval = compact ? 200 : 100;
    const minorInterval = compact ? 50 : 10;
    return generateRulerMarks(minWidth, maxWidth, majorInterval, minorInterval);
  }, [minWidth, maxWidth, compact]);

  // Get active breakpoint
  const activeBreakpoint = useMemo(
    () => getActiveBreakpoint(currentWidth, breakpoints),
    [currentWidth, breakpoints]
  );

  // Handle mouse down for dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggable) return;

      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        onWidthChange(positionToWidth(x));
      }
    },
    [isDraggable, positionToWidth, onWidthChange]
  );

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        onWidthChange(positionToWidth(x));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, positionToWidth, onWidthChange]);

  // Handle breakpoint click
  const handleBreakpointClick = useCallback(
    (bp: Breakpoint, e: React.MouseEvent) => {
      e.stopPropagation();
      onBreakpointClick?.(bp);
    },
    [onBreakpointClick]
  );

  const rulerHeight = compact ? 32 : 48;
  const tickHeight = compact ? 8 : 12;
  const majorTickHeight = compact ? 14 : 20;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-gray-900 rounded-lg overflow-hidden select-none ${
        isDraggable ? 'cursor-ew-resize' : ''
      }`}
      style={{ height: rulerHeight }}
      onMouseDown={handleMouseDown}
    >
      {/* Breakpoint background regions */}
      <div className="absolute inset-0 flex">
        {breakpoints.map((bp, idx) => {
          const startPos = widthToPosition(bp.minWidth ?? minWidth);
          const endPos = widthToPosition(bp.maxWidth ?? maxWidth);
          const width = endPos - startPos;
          const isActive = activeBreakpoint?.name === bp.name;

          return (
            <motion.div
              key={bp.name}
              className={`absolute top-0 h-full transition-opacity cursor-pointer ${
                isActive ? 'opacity-30' : 'opacity-10 hover:opacity-20'
              }`}
              style={{
                left: startPos,
                width: Math.max(0, width),
                backgroundColor: bp.color,
              }}
              onClick={(e) => handleBreakpointClick(bp, e)}
              whileHover={{ opacity: isActive ? 0.35 : 0.25 }}
            >
              {/* Breakpoint label */}
              {width > 30 && (
                <span
                  className={`absolute top-1 left-1 text-[9px] font-medium ${
                    isActive ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {bp.label}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Ruler ticks SVG */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        {rulerMarks.map((mark) => {
          const x = widthToPosition(mark.position);
          if (x < 0 || x > containerWidth) return null;

          return (
            <g key={mark.position}>
              <line
                x1={x}
                y1={rulerHeight}
                x2={x}
                y2={rulerHeight - (mark.isMajor ? majorTickHeight : tickHeight)}
                stroke={mark.isMajor ? '#6b7280' : '#374151'}
                strokeWidth={mark.isMajor ? 1.5 : 1}
              />
              {mark.isMajor && !compact && (
                <text
                  x={x}
                  y={rulerHeight - majorTickHeight - 4}
                  fill="#9ca3af"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {mark.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Breakpoint boundary markers */}
      {breakpoints.map((bp) => {
        if (bp.minWidth === null || bp.minWidth === 0) return null;
        const x = widthToPosition(bp.minWidth);
        if (x <= 0 || x >= containerWidth) return null;

        return (
          <div
            key={`marker-${bp.name}`}
            className="absolute top-0 h-full w-px bg-gray-600 pointer-events-none"
            style={{ left: x }}
          >
            <div
              className="absolute -top-0.5 -left-1 w-2 h-2 rounded-full border-2 border-gray-600"
              style={{ backgroundColor: bp.color }}
            />
          </div>
        );
      })}

      {/* Current position indicator */}
      <motion.div
        className="absolute top-0 h-full w-0.5 bg-cyan-400 pointer-events-none z-10"
        style={{ left: widthToPosition(currentWidth) }}
        animate={{ left: widthToPosition(currentWidth) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Handle knob */}
        <motion.div
          className={`absolute -top-1 -left-2 w-4 h-4 rounded-full bg-cyan-400 border-2 border-cyan-300 shadow-lg shadow-cyan-500/50 ${
            isDragging ? 'scale-125' : ''
          }`}
          animate={{ scale: isDragging ? 1.25 : 1 }}
        />
        {/* Width label */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-500 rounded text-[10px] font-bold text-white whitespace-nowrap">
          {currentWidth}px
        </div>
      </motion.div>

      {/* Active breakpoint label overlay */}
      {activeBreakpoint && !compact && (
        <div className="absolute top-1 right-2 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-800/80 text-gray-300">
          <span className="w-2 h-2 inline-block rounded-full mr-1" style={{ backgroundColor: activeBreakpoint.color }} />
          {activeBreakpoint.label}
        </div>
      )}
    </div>
  );
}
