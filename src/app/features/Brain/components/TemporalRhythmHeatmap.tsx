/**
 * Temporal Rhythm Heatmap
 *
 * Visualises developer activity patterns as an hour-of-day × day-of-week
 * heatmap. Each cell represents a time slot showing signal density
 * (weighted count). Highlights peak creativity windows and low-activity
 * periods to model cognitive rhythm.
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Sun, Moon, Sunrise, Sunset, TrendingUp, X } from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useTemporal } from '../lib/queries';
import GlowCard from './GlowCard';
import BrainPanelHeader from './BrainPanelHeader';
import { inlineExpand, inlineExpandTransition } from '../lib/motionPresets';
import NeuralPulseLoader from './NeuralPulseLoader';
import BrainEmptyState from './BrainEmptyState';
import SectionHeading from './SectionHeading';
import { DATA_FONT, FONT_SIZE } from '../lib/brainFonts';

// ── Types ───────────────────────────────────────────────────────────────────

interface TemporalCell {
  hour: number;
  dayOfWeek: number;
  totalCount: number;
  totalWeight: number;
  byType: Record<string, { count: number; weight: number }>;
}

interface TemporalResponse {
  success: boolean;
  data?: {
    temporal: {
      cells: TemporalCell[];
      hourTotals: number[];
      dayTotals: number[];
      peakHour: number;
      peakDay: number;
      grandTotal: number;
      signalTypes: string[];
      windowDays: number;
    };
  };
}

// ── Constants ───────────────────────────────────────────────────────────────

const ACCENT = '#06b6d4'; // cyan
const GLOW = 'rgba(6, 182, 212, 0.15)';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Hour labels: show every 3 hours
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i % 3 !== 0) return '';
  if (i === 0) return '12a';
  if (i < 12) return `${i}a`;
  if (i === 12) return '12p';
  return `${i - 12}p`;
});

const CELL_SIZE = 20;
const CELL_GAP = 2;
const LABEL_WIDTH = 32;
const LABEL_HEIGHT = 16;

// Time-of-day segments for rhythm insights
type TimeSegment = 'morning' | 'afternoon' | 'evening' | 'night';
const TIME_SEGMENTS: Record<TimeSegment, { label: string; hours: number[]; icon: typeof Sun }> = {
  morning:   { label: 'Morning',   hours: [6, 7, 8, 9, 10, 11],       icon: Sunrise },
  afternoon: { label: 'Afternoon', hours: [12, 13, 14, 15, 16, 17],   icon: Sun },
  evening:   { label: 'Evening',   hours: [18, 19, 20, 21, 22, 23],   icon: Sunset },
  night:     { label: 'Night',     hours: [0, 1, 2, 3, 4, 5],         icon: Moon },
};

// ── Color scale (cyan ramp) ─────────────────────────────────────────────────

function getCellColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'rgba(63, 63, 70, 0.25)';
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.15) return 'rgba(6, 182, 212, 0.10)';
  if (ratio < 0.30) return 'rgba(6, 182, 212, 0.25)';
  if (ratio < 0.50) return 'rgba(6, 182, 212, 0.40)';
  if (ratio < 0.70) return 'rgba(6, 182, 212, 0.60)';
  if (ratio < 0.85) return 'rgba(6, 182, 212, 0.75)';
  return 'rgba(6, 182, 212, 0.90)';
}

// ── Component ───────────────────────────────────────────────────────────────

interface TemporalRhythmHeatmapProps {
  scope?: 'project' | 'global';
}

export default function TemporalRhythmHeatmap({ scope = 'project' }: TemporalRhythmHeatmapProps) {
  const activeProject = useClientProjectStore((s) => s.activeProject);
  const { data: temporalResponse, isLoading, error: queryError } = useTemporal(activeProject?.id);
  const temporal = temporalResponse?.data?.temporal;
  const cells = temporal?.cells ?? [];
  const hourTotals = temporal?.hourTotals ?? new Array(24).fill(0);
  const dayTotals = temporal?.dayTotals ?? new Array(7).fill(0);
  const peakHour = temporal?.peakHour ?? 0;
  const peakDay = temporal?.peakDay ?? 0;
  const grandTotal = temporal?.grandTotal ?? 0;
  const error = queryError ? 'Failed to load temporal data' : null;
  const [selectedCell, setSelectedCell] = useState<TemporalCell | null>(null);

  // Build lookup: "hour-dow" → cell
  const cellLookup = useMemo(() => {
    const map = new Map<string, TemporalCell>();
    for (const c of cells) map.set(`${c.hour}-${c.dayOfWeek}`, c);
    return map;
  }, [cells]);

  // Max weight for color scaling
  const maxWeight = useMemo(() => {
    let max = 0;
    for (const c of cells) {
      if (c.totalWeight > max) max = c.totalWeight;
    }
    return max;
  }, [cells]);

  // Rhythm insights: segment totals
  const segmentTotals = useMemo(() => {
    const totals: Record<TimeSegment, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const c of cells) {
      for (const [seg, config] of Object.entries(TIME_SEGMENTS) as [TimeSegment, typeof TIME_SEGMENTS[TimeSegment]][]) {
        if (config.hours.includes(c.hour)) {
          totals[seg] += c.totalCount;
        }
      }
    }
    return totals;
  }, [cells]);

  const peakSegment = useMemo(() => {
    let maxSeg: TimeSegment = 'morning';
    let maxCount = 0;
    for (const [seg, count] of Object.entries(segmentTotals) as [TimeSegment, number][]) {
      if (count > maxCount) {
        maxCount = count;
        maxSeg = seg;
      }
    }
    return maxSeg;
  }, [segmentTotals]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-cyan-500/20">
        <div className="p-6">
          <BrainPanelHeader icon={Clock} title="Developer Rhythm" accentColor={ACCENT} glowColor={GLOW} glow />
          <div className="h-32 flex items-center justify-center">
            <NeuralPulseLoader />
          </div>
        </div>
      </GlowCard>
    );
  }

  if (error) {
    return (
      <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-cyan-500/20">
        <div className="p-6">
          <BrainPanelHeader icon={Clock} title="Developer Rhythm" accentColor={ACCENT} glowColor={GLOW} glow />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </GlowCard>
    );
  }

  const svgWidth = LABEL_WIDTH + 24 * (CELL_SIZE + CELL_GAP);
  const svgHeight = LABEL_HEIGHT + 7 * (CELL_SIZE + CELL_GAP);

  const PeakIcon = TIME_SEGMENTS[peakSegment].icon;

  return (
    <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-cyan-500/20">
      <div className="p-6 space-y-4">
        <BrainPanelHeader
          icon={Clock}
          title="Developer Rhythm"
          accentColor={ACCENT}
          glowColor={GLOW}
          glow
          trailing={
            scope === 'global' ? (
              <span className="px-2 py-0.5 text-2xs font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded">
                GLOBAL
              </span>
            ) : undefined
          }
          right={
            grandTotal > 0 ? (
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <PeakIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Peak: <span className="text-cyan-400 font-medium">{TIME_SEGMENTS[peakSegment].label}</span></span>
                </div>
                <span className="text-zinc-600">|</span>
                <span>{grandTotal} signals (30d)</span>
              </div>
            ) : undefined
          }
        />

        {grandTotal === 0 ? (
          <div className="py-8 flex justify-center">
            <BrainEmptyState
              icon={<Clock className="w-10 h-10 text-zinc-600" />}
              title="No temporal data yet"
              description="Activity patterns will appear as signals are recorded."
            />
          </div>
        ) : (
          <>
            {/* ── Heatmap Grid ───────────────────────────────────────── */}
            <div className="overflow-x-auto custom-scrollbar-subtle">
              <svg width={svgWidth} height={svgHeight} className="block">
                {/* Hour labels along top */}
                {HOUR_LABELS.map((label, h) =>
                  label ? (
                    <text
                      key={`h-${h}`}
                      x={LABEL_WIDTH + h * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2}
                      y={10}
                      textAnchor="middle"
                      className="fill-zinc-600"
                      fontSize={8}
                      fontFamily={DATA_FONT}
                    >
                      {label}
                    </text>
                  ) : null
                )}

                {/* Day-of-week labels along left */}
                {DAY_LABELS_SHORT.map((label, d) => (
                  <text
                    key={`d-${d}`}
                    x={LABEL_WIDTH - 6}
                    y={LABEL_HEIGHT + d * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 + 3}
                    textAnchor="end"
                    className="fill-zinc-500"
                    fontSize={9}
                    fontFamily={DATA_FONT}
                  >
                    {label}
                  </text>
                ))}

                {/* Grid cells: 24 hours × 7 days */}
                {Array.from({ length: 7 }, (_, d) =>
                  Array.from({ length: 24 }, (_, h) => {
                    const cell = cellLookup.get(`${h}-${d}`);
                    const weight = cell?.totalWeight ?? 0;
                    const isSelected = selectedCell?.hour === h && selectedCell?.dayOfWeek === d;

                    return (
                      <motion.rect
                        key={`${h}-${d}`}
                        x={LABEL_WIDTH + h * (CELL_SIZE + CELL_GAP)}
                        y={LABEL_HEIGHT + d * (CELL_SIZE + CELL_GAP)}
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        rx={3}
                        fill={getCellColor(weight, maxWeight)}
                        stroke={isSelected ? '#06b6d4' : 'transparent'}
                        strokeWidth={isSelected ? 1.5 : 0}
                        className="cursor-pointer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: (d * 24 + h) * 0.001 }}
                        onClick={() => {
                          if (cell) setSelectedCell(cell);
                          else setSelectedCell({ hour: h, dayOfWeek: d, totalCount: 0, totalWeight: 0, byType: {} });
                        }}
                      >
                        <title>
                          {DAY_LABELS[d]} {h}:00 — {cell?.totalCount ?? 0} signals ({weight.toFixed(1)} weight)
                        </title>
                      </motion.rect>
                    );
                  })
                )}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 text-2xs text-zinc-500">
              <span>Less</span>
              {[0, 0.10, 0.25, 0.40, 0.60, 0.75, 0.90].map((opacity) => (
                <div
                  key={opacity}
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: opacity === 0
                      ? 'rgba(63, 63, 70, 0.25)'
                      : `rgba(6, 182, 212, ${opacity})`,
                  }}
                />
              ))}
              <span>More</span>
            </div>

            {/* ── Cell Drill-Down ─────────────────────────────────────── */}
            <AnimatePresence>
              {selectedCell && (
                <CellDrillDown cell={selectedCell} onClose={() => setSelectedCell(null)} />
              )}
            </AnimatePresence>

            {/* ── Rhythm Insights ─────────────────────────────────────── */}
            <RhythmInsights
              segmentTotals={segmentTotals}
              peakSegment={peakSegment}
              peakHour={peakHour}
              peakDay={peakDay}
              hourTotals={hourTotals}
              dayTotals={dayTotals}
              grandTotal={grandTotal}
            />
          </>
        )}
      </div>
    </GlowCard>
  );
}

// ── Cell Drill-Down ─────────────────────────────────────────────────────────

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  git_activity: 'Git Activity',
  api_focus: 'API Focus',
  context_focus: 'Context Focus',
  implementation: 'Implementation',
  cross_task_analysis: 'Cross-Task Analysis',
  cross_task_selection: 'Cross-Task Selection',
  cli_memory: 'CLI Memory',
  session_cluster: 'Session Cluster',
};

function CellDrillDown({ cell, onClose }: { cell: TemporalCell; onClose: () => void }) {
  const typeEntries = Object.entries(cell.byType).sort(([, a], [, b]) => b.count - a.count);
  const maxCount = typeEntries.length > 0 ? Math.max(...typeEntries.map(([, v]) => v.count)) : 1;

  return (
    <motion.div
      variants={inlineExpand}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={inlineExpandTransition}
      className="rounded-xl border border-zinc-700/50 bg-zinc-900/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-zinc-200">
            {DAY_LABELS[cell.dayOfWeek]} {cell.hour}:00–{cell.hour}:59
          </span>
          <span className="text-xs text-zinc-500">
            {cell.totalCount} signal{cell.totalCount !== 1 ? 's' : ''}
          </span>
          <span className="text-2xs text-cyan-400/70 font-mono">
            {cell.totalWeight.toFixed(1)}w
          </span>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {cell.totalCount === 0 ? (
        <p className="text-xs text-zinc-500 py-2">No signals recorded in this time slot.</p>
      ) : (
        <div className="space-y-2">
          <SectionHeading className="mb-0">By Type</SectionHeading>
          {typeEntries.map(([type, stats]) => {
            const barWidth = (stats.count / maxCount) * 100;
            return (
              <div key={type} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-2xs mb-0.5">
                    <span className="text-zinc-300 truncate">{SIGNAL_TYPE_LABELS[type] ?? type}</span>
                    <span className="text-zinc-500 tabular-nums ml-2">{stats.count} / {stats.weight.toFixed(1)}w</span>
                  </div>
                  <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-cyan-500/70"
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── Rhythm Insights Bar ─────────────────────────────────────────────────────

function RhythmInsights({
  segmentTotals,
  peakSegment,
  peakHour,
  peakDay,
  hourTotals,
  dayTotals,
  grandTotal,
}: {
  segmentTotals: Record<TimeSegment, number>;
  peakSegment: TimeSegment;
  peakHour: number;
  peakDay: number;
  hourTotals: number[];
  dayTotals: number[];
  grandTotal: number;
}) {
  if (grandTotal === 0) return null;

  // Format peak hour display
  const formatHour = (h: number) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  // Compute segment percentages for mini bar
  const segmentOrder: TimeSegment[] = ['morning', 'afternoon', 'evening', 'night'];
  const segmentColors: Record<TimeSegment, string> = {
    morning: 'bg-amber-500/60',
    afternoon: 'bg-cyan-500/60',
    evening: 'bg-purple-500/60',
    night: 'bg-indigo-500/40',
  };

  return (
    <div className="space-y-3 pt-2 border-t border-zinc-800/50">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-medium text-zinc-300">Rhythm Insights</span>
      </div>

      {/* Time-of-day distribution bar */}
      <div className="space-y-1.5">
        <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
          {segmentOrder.map((seg) => {
            const pct = grandTotal > 0 ? (segmentTotals[seg] / grandTotal) * 100 : 0;
            if (pct === 0) return null;
            return (
              <motion.div
                key={seg}
                className={`h-full ${segmentColors[seg]}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                title={`${TIME_SEGMENTS[seg].label}: ${segmentTotals[seg]} signals (${pct.toFixed(0)}%)`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-2xs text-zinc-500">
          {segmentOrder.map((seg) => {
            const Icon = TIME_SEGMENTS[seg].icon;
            const pct = grandTotal > 0 ? (segmentTotals[seg] / grandTotal) * 100 : 0;
            const isPeak = seg === peakSegment;
            return (
              <div
                key={seg}
                className={`flex items-center gap-1 ${isPeak ? 'text-cyan-400' : ''}`}
              >
                <Icon className="w-3 h-3" />
                <span>{TIME_SEGMENTS[seg].label}</span>
                <span className="font-mono">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-3 text-2xs">
        <div className="px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/40">
          <span className="text-zinc-500">Peak hour: </span>
          <span className="text-cyan-400 font-medium">{formatHour(peakHour)}</span>
        </div>
        <div className="px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/40">
          <span className="text-zinc-500">Peak day: </span>
          <span className="text-cyan-400 font-medium">{DAY_LABELS[peakDay]}</span>
        </div>
        <div className="px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/40">
          <span className="text-zinc-500">Active hours: </span>
          <span className="text-cyan-400 font-medium">{hourTotals.filter(h => h > 0).length}/24</span>
        </div>
        <div className="px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/40">
          <span className="text-zinc-500">Active days: </span>
          <span className="text-cyan-400 font-medium">{dayTotals.filter(d => d > 0).length}/7</span>
        </div>
      </div>
    </div>
  );
}
