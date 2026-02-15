'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExecutiveAIInsight } from '@/app/db/models/reflector.types';
import type { ExecutiveInsight } from '../../lib/RuleBasedInsightTypes';

type AnyInsight = ExecutiveAIInsight | ExecutiveInsight;

interface TemporalHeatmapProps {
  insights: AnyInsight[];
  /** Total ideas count by day for density (optional, enhances the heatmap) */
  dailyCounts?: { date: string; count: number }[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKS = 12;
const CELL_SIZE = 14;
const CELL_GAP = 2;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const LABEL_AREA_X = 30;
const MONTH_LABEL_HEIGHT = 18;
const SPARKLINE_HEIGHT = 36;
const SPARKLINE_GAP = 8;

// 5-step gradient: dark gray -> cyan ramp
const INTENSITY_COLORS = [
  'rgba(31,41,55,0.5)',    // 0 - empty
  'rgba(6,182,212,0.14)',  // 1 - low
  'rgba(6,182,212,0.32)',  // 2 - medium-low
  'rgba(6,182,212,0.52)',  // 3 - medium-high
  'rgba(6,182,212,0.75)',  // 4 - high
  'rgba(6,182,212,1)',     // 5 - max
];

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function intensityColor(value: number, maxValue: number): string {
  if (maxValue === 0 || value === 0) return INTENSITY_COLORS[0];
  const t = Math.min(value / maxValue, 1);
  if (t < 0.2) return INTENSITY_COLORS[1];
  if (t < 0.4) return INTENSITY_COLORS[2];
  if (t < 0.6) return INTENSITY_COLORS[3];
  if (t < 0.8) return INTENSITY_COLORS[4];
  return INTENSITY_COLORS[5];
}

function intensityLevel(value: number, maxValue: number): number {
  if (maxValue === 0 || value === 0) return 0;
  const t = Math.min(value / maxValue, 1);
  if (t < 0.2) return 1;
  if (t < 0.4) return 2;
  if (t < 0.6) return 3;
  if (t < 0.8) return 4;
  return 5;
}

interface CellData {
  date: Date;
  dayOfWeek: number;
  weekIdx: number;
}

function generateWeekGrid(weeks: number): CellData[] {
  const cells: CellData[] = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - weeks * 7);
  // Align to Monday
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      if (date <= now) {
        cells.push({ date, dayOfWeek: d, weekIdx: w });
      }
    }
  }
  return cells;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Week summary types
// ---------------------------------------------------------------------------

interface WeekSummary {
  weekIdx: number;
  total: number;
  dailyValues: number[]; // length 7, Mon-Sun
  peakDay: number;       // 0-6 index
  peakValue: number;
  startDate: Date;
  endDate: Date;
}

function computeWeekSummary(
  weekIdx: number,
  cells: CellData[],
  densityMap: Map<string, number>,
): WeekSummary {
  const weekCells = cells.filter(c => c.weekIdx === weekIdx);
  const dailyValues = Array(7).fill(0) as number[];
  let total = 0;
  let peakDay = 0;
  let peakValue = 0;
  let startDate = new Date();
  let endDate = new Date();

  for (const cell of weekCells) {
    const count = densityMap.get(dateKey(cell.date)) || 0;
    dailyValues[cell.dayOfWeek] = count;
    total += count;
    if (count > peakValue) {
      peakValue = count;
      peakDay = cell.dayOfWeek;
    }
  }

  if (weekCells.length > 0) {
    startDate = weekCells[0].date;
    endDate = weekCells[weekCells.length - 1].date;
  }

  return { weekIdx, total, dailyValues, peakDay, peakValue, startDate, endDate };
}

// ---------------------------------------------------------------------------
// ComparisonPanel
// ---------------------------------------------------------------------------

function ComparisonPanel({
  weekA,
  weekB,
  onClear,
}: {
  weekA: WeekSummary;
  weekB: WeekSummary;
  onClear: () => void;
}) {
  const pctChange =
    weekA.total === 0
      ? weekB.total > 0
        ? 100
        : 0
      : Math.round(((weekB.total - weekA.total) / weekA.total) * 100);

  const isPositive = pctChange >= 0;
  const maxBar = Math.max(...weekA.dailyValues, ...weekB.dailyValues, 1);
  const barChartHeight = 56;
  const barChartWidth = 7 * 36;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="mt-3 bg-gray-900/80 border border-gray-700/50 rounded-lg p-3 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
          Week Comparison
        </span>
        <button
          onClick={onClear}
          className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-800"
        >
          Clear
        </button>
      </div>

      {/* Totals side-by-side */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <p className="text-[9px] text-gray-500 mb-0.5">
            {formatDateShort(weekA.startDate)} - {formatDateShort(weekA.endDate)}
          </p>
          <p className="text-sm font-mono text-cyan-400">{weekA.total}</p>
          <p className="text-[8px] text-gray-600">
            Peak: {DAY_NAMES_SHORT[weekA.peakDay]} ({weekA.peakValue})
          </p>
        </div>

        {/* Change indicator */}
        <div className="flex flex-col items-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-xs font-mono font-bold ${
              isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {pctChange}%
          </motion.span>
          <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5">
            <path
              d={isPositive ? 'M8 3 L13 10 L3 10 Z' : 'M8 13 L13 6 L3 6 Z'}
              fill={isPositive ? '#34d399' : '#f87171'}
            />
          </svg>
        </div>

        <div className="flex-1 text-right">
          <p className="text-[9px] text-gray-500 mb-0.5">
            {formatDateShort(weekB.startDate)} - {formatDateShort(weekB.endDate)}
          </p>
          <p className="text-sm font-mono text-cyan-400">{weekB.total}</p>
          <p className="text-[8px] text-gray-600">
            Peak: {DAY_NAMES_SHORT[weekB.peakDay]} ({weekB.peakValue})
          </p>
        </div>
      </div>

      {/* Day-by-day paired bar chart */}
      <svg
        width={barChartWidth}
        height={barChartHeight + 14}
        className="mx-auto block"
      >
        {DAY_NAMES_SHORT.map((day, i) => {
          const x = i * 36;
          const hA = (weekA.dailyValues[i] / maxBar) * barChartHeight;
          const hB = (weekB.dailyValues[i] / maxBar) * barChartHeight;

          return (
            <g key={i}>
              {/* Week A bar */}
              <motion.rect
                initial={{ height: 0, y: barChartHeight }}
                animate={{ height: hA, y: barChartHeight - hA }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                x={x + 4}
                width={12}
                rx={2}
                fill="rgba(6,182,212,0.35)"
              />
              {/* Week B bar */}
              <motion.rect
                initial={{ height: 0, y: barChartHeight }}
                animate={{ height: hB, y: barChartHeight - hB }}
                transition={{ duration: 0.4, delay: i * 0.04 + 0.05 }}
                x={x + 18}
                width={12}
                rx={2}
                fill="rgba(6,182,212,0.8)"
              />
              {/* Day label */}
              <text
                x={x + 17}
                y={barChartHeight + 11}
                textAnchor="middle"
                fill="#6b7280"
                fontSize="7"
                fontFamily="monospace"
              >
                {day}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-sm"
            style={{ backgroundColor: 'rgba(6,182,212,0.35)' }}
          />
          <span className="text-[8px] text-gray-500">Week A</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-sm"
            style={{ backgroundColor: 'rgba(6,182,212,0.8)' }}
          />
          <span className="text-[8px] text-gray-500">Week B</span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TemporalHeatmap({
  insights,
  dailyCounts = [],
  className = '',
}: TemporalHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    weekIdx: number;
    dayOfWeek: number;
  } | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState<
    [number | null, number | null]
  >([null, null]);

  const cells = useMemo(() => generateWeekGrid(WEEKS), []);

  // Build density map from daily counts
  const densityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const { date, count } of dailyCounts) {
      const key = date.slice(0, 10);
      map.set(key, (map.get(key) || 0) + count);
    }
    return map;
  }, [dailyCounts]);

  const maxDensity = useMemo(() => {
    let max = 0;
    for (const v of densityMap.values()) {
      if (v > max) max = v;
    }
    return Math.max(max, 1);
  }, [densityMap]);

  // Rolling 7-day average for sparkline
  const sparklineData = useMemo(() => {
    const now = new Date();
    const totalDays = WEEKS * 7;
    const dailyArr: number[] = [];

    // Build day-by-day array from oldest to newest
    for (let d = totalDays - 1; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const key = dateKey(date);
      dailyArr.push(densityMap.get(key) || 0);
    }

    // Compute 7-day rolling average
    const rolling: number[] = [];
    for (let i = 0; i < dailyArr.length; i++) {
      const windowStart = Math.max(0, i - 6);
      let sum = 0;
      let count = 0;
      for (let j = windowStart; j <= i; j++) {
        sum += dailyArr[j];
        count++;
      }
      rolling.push(sum / count);
    }
    return rolling;
  }, [densityMap]);

  // Learning trend detection
  const learningTrend = useMemo(() => {
    if (sparklineData.length < 14) return 'stable' as const;
    const recent = sparklineData.slice(-7);
    const prior = sparklineData.slice(-14, -7);
    const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const priorAvg = prior.reduce((s, v) => s + v, 0) / prior.length;
    if (priorAvg === 0)
      return recentAvg > 0 ? ('accelerating' as const) : ('stable' as const);
    const change = ((recentAvg - priorAvg) / priorAvg) * 100;
    if (change > 10) return 'accelerating' as const;
    if (change < -10) return 'decelerating' as const;
    return 'stable' as const;
  }, [sparklineData]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { text: string; weekIdx: number }[] = [];
    let lastMonth = -1;
    for (const cell of cells) {
      if (cell.dayOfWeek === 0) {
        const month = cell.date.getMonth();
        if (month !== lastMonth) {
          lastMonth = month;
          labels.push({
            text: cell.date.toLocaleDateString('en-US', { month: 'short' }),
            weekIdx: cell.weekIdx,
          });
        }
      }
    }
    return labels;
  }, [cells]);

  // Hovered cell info
  const hoveredInfo = useMemo(() => {
    if (!hoveredCell) return null;
    const cell = cells.find(
      c =>
        c.weekIdx === hoveredCell.weekIdx &&
        c.dayOfWeek === hoveredCell.dayOfWeek,
    );
    if (!cell) return null;
    const key = dateKey(cell.date);
    const count = densityMap.get(key) || 0;
    return { date: formatDateFull(cell.date), count };
  }, [hoveredCell, cells, densityMap]);

  // Week selection handler
  const handleWeekClick = useCallback((weekIdx: number) => {
    setSelectedWeeks(prev => {
      // Click same first week -> deselect
      if (prev[0] === weekIdx && prev[1] === null) return [null, null];
      // Click already-selected second week -> deselect it
      if (prev[1] === weekIdx) return [prev[0], null];
      // No week selected -> select first
      if (prev[0] === null) return [weekIdx, null];
      // First selected, clicking different -> set second (keep order)
      if (prev[1] === null) {
        return weekIdx < prev[0]
          ? [weekIdx, prev[0]]
          : [prev[0], weekIdx];
      }
      // Both already selected -> start fresh
      return [weekIdx, null];
    });
  }, []);

  // Week summaries for comparison panel
  const weekSummaries = useMemo(() => {
    const [a, b] = selectedWeeks;
    if (a === null || b === null) return null;
    return {
      weekA: computeWeekSummary(a, cells, densityMap),
      weekB: computeWeekSummary(b, cells, densityMap),
    };
  }, [selectedWeeks, cells, densityMap]);

  // Unique week indices present in grid
  const weekIndices = useMemo(() => {
    const set = new Set<number>();
    for (const c of cells) set.add(c.weekIdx);
    return Array.from(set).sort((a, b) => a - b);
  }, [cells]);

  // ---------------------------------------------------------------------------
  // SVG dimensions
  // ---------------------------------------------------------------------------

  const gridWidth = WEEKS * CELL_STEP + LABEL_AREA_X;
  const gridHeight = 7 * CELL_STEP + MONTH_LABEL_HEIGHT;
  const totalSvgHeight = gridHeight + SPARKLINE_GAP + SPARKLINE_HEIGHT;

  // Sparkline path (smooth bezier)
  const sparklinePath = useMemo(() => {
    if (sparklineData.length < 2) return '';
    const maxVal = Math.max(...sparklineData, 0.1);
    const usableWidth = gridWidth - LABEL_AREA_X;
    const xScale = usableWidth / Math.max(sparklineData.length - 1, 1);
    const yOffset = gridHeight + SPARKLINE_GAP;

    const points = sparklineData.map((v, i) => ({
      x: LABEL_AREA_X + i * xScale,
      y:
        yOffset +
        SPARKLINE_HEIGHT -
        (v / maxVal) * (SPARKLINE_HEIGHT - 6) -
        3,
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [sparklineData, gridWidth, gridHeight]);

  // Sparkline area path for gradient fill
  const sparklineAreaPath = useMemo(() => {
    if (sparklineData.length < 2 || !sparklinePath) return '';
    const usableWidth = gridWidth - LABEL_AREA_X;
    const xScale = usableWidth / Math.max(sparklineData.length - 1, 1);
    const baseline = gridHeight + SPARKLINE_GAP + SPARKLINE_HEIGHT;
    const xStart = LABEL_AREA_X;
    const xEnd = LABEL_AREA_X + (sparklineData.length - 1) * xScale;

    return `${sparklinePath} L ${xEnd} ${baseline} L ${xStart} ${baseline} Z`;
  }, [sparklineData, sparklinePath, gridWidth, gridHeight]);

  // Sparkline endpoint for the animated dot
  const sparklineEndpoint = useMemo(() => {
    if (sparklineData.length < 2) return null;
    const maxVal = Math.max(...sparklineData, 0.1);
    const usableWidth = gridWidth - LABEL_AREA_X;
    const xScale = usableWidth / Math.max(sparklineData.length - 1, 1);
    const yOffset = gridHeight + SPARKLINE_GAP;
    const lastVal = sparklineData[sparklineData.length - 1];
    return {
      x: LABEL_AREA_X + (sparklineData.length - 1) * xScale,
      y:
        yOffset +
        SPARKLINE_HEIGHT -
        (lastVal / maxVal) * (SPARKLINE_HEIGHT - 6) -
        3,
    };
  }, [sparklineData, gridWidth, gridHeight]);

  const totalIdeas = dailyCounts.reduce((s, d) => s + d.count, 0);

  const trendLabel =
    learningTrend === 'accelerating'
      ? 'Accelerating'
      : learningTrend === 'decelerating'
        ? 'Decelerating'
        : 'Stable';
  const trendColor =
    learningTrend === 'accelerating'
      ? 'text-emerald-400'
      : learningTrend === 'decelerating'
        ? 'text-amber-400'
        : 'text-gray-400';

  return (
    <div className={`relative ${className}`}>
      {/* Summary stats */}
      <div className="flex items-center gap-4 mb-3 text-[10px] text-gray-500">
        <span>Last {WEEKS} weeks</span>
        <span>{insights.length} insights</span>
        <span>{totalIdeas} total ideas</span>
        <span className={trendColor}>
          {learningTrend === 'accelerating' && '\u25B2 '}
          {learningTrend === 'decelerating' && '\u25BC '}
          {learningTrend === 'stable' && '\u25CF '}
          {trendLabel}
        </span>
      </div>

      {/* Selection hint */}
      <AnimatePresence>
        {selectedWeeks[0] !== null && selectedWeeks[1] === null && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[9px] text-cyan-500/70 mb-1"
          >
            Click another week column to compare
          </motion.p>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <svg
          width={gridWidth}
          height={totalSvgHeight}
          className="select-none"
        >
          <defs>
            {/* Sparkline gradient fill */}
            <linearGradient
              id="heatmap-sparkline-grad"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="rgba(6,182,212,0.22)" />
              <stop offset="100%" stopColor="rgba(6,182,212,0)" />
            </linearGradient>
            {/* Subtle grid overlay pattern */}
            <pattern
              id="heatmap-grid-overlay"
              width={CELL_STEP}
              height={CELL_STEP}
              patternUnits="userSpaceOnUse"
              x={LABEL_AREA_X}
              y={MONTH_LABEL_HEIGHT}
            >
              <rect
                width={CELL_STEP}
                height={CELL_STEP}
                fill="none"
                stroke="rgba(75,85,99,0.07)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>

          {/* Grid overlay behind cells */}
          <rect
            x={LABEL_AREA_X}
            y={MONTH_LABEL_HEIGHT}
            width={WEEKS * CELL_STEP}
            height={7 * CELL_STEP}
            fill="url(#heatmap-grid-overlay)"
          />

          {/* Week column selection highlights */}
          {weekIndices.map(wIdx => {
            const isSelected =
              wIdx === selectedWeeks[0] || wIdx === selectedWeeks[1];
            if (!isSelected) return null;
            const isA = wIdx === selectedWeeks[0];
            return (
              <motion.rect
                key={`sel-${wIdx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                x={LABEL_AREA_X + wIdx * CELL_STEP - 1}
                y={MONTH_LABEL_HEIGHT - 2}
                width={CELL_STEP + 2}
                height={7 * CELL_STEP + 4}
                rx={3}
                fill="none"
                stroke={
                  isA
                    ? 'rgba(6,182,212,0.45)'
                    : 'rgba(6,182,212,0.8)'
                }
                strokeWidth={1.5}
                strokeDasharray={isA ? '4 2' : 'none'}
              />
            );
          })}

          {/* Month labels */}
          {monthLabels.map((label, i) => (
            <text
              key={i}
              x={LABEL_AREA_X + label.weekIdx * CELL_STEP}
              y={12}
              fill="#9ca3af"
              fontSize="10"
              fontWeight="500"
              fontFamily="system-ui, sans-serif"
            >
              {label.text}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={i}
                x={0}
                y={
                  MONTH_LABEL_HEIGHT +
                  i * CELL_STEP +
                  CELL_SIZE * 0.75
                }
                fill="#6b7280"
                fontSize="8"
                fontFamily="monospace"
              >
                {label}
              </text>
            ) : null,
          )}

          {/* Invisible click targets for week columns */}
          {weekIndices.map(wIdx => (
            <rect
              key={`click-${wIdx}`}
              x={LABEL_AREA_X + wIdx * CELL_STEP}
              y={MONTH_LABEL_HEIGHT}
              width={CELL_SIZE}
              height={7 * CELL_STEP}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => handleWeekClick(wIdx)}
            />
          ))}

          {/* Heatmap cells */}
          {cells.map((cell, i) => {
            const key = dateKey(cell.date);
            const count = densityMap.get(key) || 0;
            const isHovered =
              hoveredCell?.weekIdx === cell.weekIdx &&
              hoveredCell?.dayOfWeek === cell.dayOfWeek;
            const isInSelectedWeek =
              cell.weekIdx === selectedWeeks[0] ||
              cell.weekIdx === selectedWeeks[1];

            const cx = LABEL_AREA_X + cell.weekIdx * CELL_STEP;
            const cy = MONTH_LABEL_HEIGHT + cell.dayOfWeek * CELL_STEP;

            return (
              <g key={i}>
                <rect
                  x={cx}
                  y={cy}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill={intensityColor(count, maxDensity)}
                  stroke={
                    isHovered
                      ? '#06b6d4'
                      : isInSelectedWeek
                        ? 'rgba(6,182,212,0.3)'
                        : 'transparent'
                  }
                  strokeWidth={
                    isHovered ? 1.5 : isInSelectedWeek ? 0.5 : 0
                  }
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() =>
                    setHoveredCell({
                      weekIdx: cell.weekIdx,
                      dayOfWeek: cell.dayOfWeek,
                    })
                  }
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => handleWeekClick(cell.weekIdx)}
                />
                {/* "Hot day" dot for high-intensity cells */}
                {intensityLevel(count, maxDensity) >= 4 && (
                  <circle
                    cx={cx + CELL_SIZE - 3}
                    cy={cy + 3}
                    r={1.5}
                    fill="#fbbf24"
                    opacity={0.8}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}

          {/* Sparkline separator */}
          <line
            x1={LABEL_AREA_X}
            y1={gridHeight + SPARKLINE_GAP / 2}
            x2={gridWidth}
            y2={gridHeight + SPARKLINE_GAP / 2}
            stroke="rgba(75,85,99,0.18)"
            strokeWidth={0.5}
          />

          {/* Sparkline label */}
          <text
            x={0}
            y={gridHeight + SPARKLINE_GAP + 10}
            fill="#6b7280"
            fontSize="7"
            fontFamily="monospace"
          >
            7d avg
          </text>

          {/* Sparkline area fill */}
          {sparklineAreaPath && (
            <path
              d={sparklineAreaPath}
              fill="url(#heatmap-sparkline-grad)"
            />
          )}

          {/* Sparkline line */}
          {sparklinePath && (
            <motion.path
              d={sparklinePath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          )}

          {/* Sparkline endpoint dot */}
          {sparklineEndpoint && (
            <motion.circle
              cx={sparklineEndpoint.x}
              cy={sparklineEndpoint.y}
              r={3}
              fill="#06b6d4"
              stroke="#111827"
              strokeWidth={1.5}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
            />
          )}
        </svg>
      </div>

      {/* Intensity legend */}
      <div className="flex items-center gap-1 mt-2 text-[9px] text-gray-500">
        <span>Less</span>
        {INTENSITY_COLORS.map((color, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>More</span>
        <span className="ml-3 flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: '#fbbf24' }}
          />
          <span>Hot day</span>
        </span>
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-0 right-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/60 rounded-lg px-3 py-2 text-[10px] pointer-events-none shadow-lg shadow-black/30"
          >
            <p className="text-gray-300 font-medium">{hoveredInfo.date}</p>
            <p className="text-cyan-400">
              {hoveredInfo.count} ideas generated
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison panel */}
      <AnimatePresence>
        {weekSummaries && (
          <ComparisonPanel
            weekA={weekSummaries.weekA}
            weekB={weekSummaries.weekB}
            onClear={() => setSelectedWeeks([null, null])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
