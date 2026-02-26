/**
 * Activity Heatmap
 * GitHub-style contribution heatmap showing daily signal density
 * with drill-down by day and time-series trend chart.
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  X,
  GitCommit,
  Radio,
  Layers,
  Wrench,
  Brain,
  Terminal,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import GlowCard from './GlowCard';
import BrainPanelHeader from './BrainPanelHeader';

// ── Types ───────────────────────────────────────────────────────────────────

interface HeatmapDayData {
  date: string;
  total_count: number;
  total_weight: number;
  by_type: Record<string, { count: number; weight: number }>;
  by_context: Record<string, { name: string; count: number; weight: number }>;
}

interface HeatmapContext {
  id: string;
  name: string;
}

interface HeatmapResponse {
  success: boolean;
  heatmap: {
    days: HeatmapDayData[];
    contexts: HeatmapContext[];
    signal_types: string[];
    window_days: number;
  };
}

// ── Constants ───────────────────────────────────────────────────────────────

const ACCENT = '#a855f7';
const GLOW = 'rgba(168, 85, 247, 0.15)';
const CELL_SIZE = 13;
const CELL_GAP = 3;
const WEEKS_TO_SHOW = 13; // ~90 days
const DAYS_IN_WEEK = 7;

const SIGNAL_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  git_activity: { label: 'Git Activity', icon: GitCommit, color: '#10b981' },
  api_focus: { label: 'API Focus', icon: Radio, color: '#3b82f6' },
  context_focus: { label: 'Context Focus', icon: Layers, color: '#8b5cf6' },
  implementation: { label: 'Implementation', icon: Wrench, color: '#f59e0b' },
  cross_task_analysis: { label: 'Cross-Task Analysis', icon: Brain, color: '#ec4899' },
  cross_task_selection: { label: 'Cross-Task Selection', icon: Brain, color: '#f43f5e' },
  cli_memory: { label: 'CLI Memory', icon: Terminal, color: '#06b6d4' },
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

// ── Intensity color scale (purple ramp) ─────────────────────────────────────

function getIntensityColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'rgba(63, 63, 70, 0.3)'; // zinc-700/30
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.2) return 'rgba(168, 85, 247, 0.15)';
  if (ratio < 0.4) return 'rgba(168, 85, 247, 0.30)';
  if (ratio < 0.6) return 'rgba(168, 85, 247, 0.50)';
  if (ratio < 0.8) return 'rgba(168, 85, 247, 0.70)';
  return 'rgba(168, 85, 247, 0.90)';
}

// ── Main component ──────────────────────────────────────────────────────────

interface ActivityHeatmapProps {
  scope?: 'project' | 'global';
}

export default function ActivityHeatmap({ scope = 'project' }: ActivityHeatmapProps) {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const [data, setData] = useState<HeatmapDayData[]>([]);
  const [contexts, setContexts] = useState<HeatmapContext[]>([]);
  const [signalTypes, setSignalTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down state
  const [selectedDay, setSelectedDay] = useState<HeatmapDayData | null>(null);

  // Trend chart state
  const [trendContext, setTrendContext] = useState<string>('all');
  const [trendType, setTrendType] = useState<string>('all');
  const [showTrend, setShowTrend] = useState(false);

  const fetchHeatmap = useCallback(async () => {
    if (!activeProject?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/brain/signals/heatmap?projectId=${encodeURIComponent(activeProject.id)}&days=90`
      );
      const json: HeatmapResponse = await res.json();
      if (json.success) {
        setData(json.heatmap.days);
        setContexts(json.heatmap.contexts);
        setSignalTypes(json.heatmap.signal_types);
      } else {
        setError('Failed to load heatmap data');
      }
    } catch {
      setError('Failed to load heatmap data');
    } finally {
      setIsLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  // Build lookup: date string → day data
  const dayLookup = useMemo(() => {
    const map = new Map<string, HeatmapDayData>();
    for (const d of data) map.set(d.date, d);
    return map;
  }, [data]);

  // Calculate grid cells: 13 weeks × 7 days
  const { grid, maxWeight, monthMarkers } = useMemo(() => {
    const today = new Date();
    const totalDays = WEEKS_TO_SHOW * DAYS_IN_WEEK;
    const cells: Array<{ date: string; col: number; row: number; data: HeatmapDayData | null }> = [];
    let mw = 0;

    // End of grid = today, work backwards
    // Compute the start date: go back totalDays - 1, aligned to start of week
    const endDate = new Date(today);
    const startOffset = (totalDays - 1);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - startOffset);
    // Align to Monday
    const startDay = startDate.getDay();
    const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
    startDate.setDate(startDate.getDate() + mondayOffset);

    const months: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      const row = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6
      const col = Math.floor(i / 7);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = dayLookup.get(dateStr) || null;

      if (dayData && dayData.total_weight > mw) {
        mw = dayData.total_weight;
      }

      // Month label markers
      if (d.getMonth() !== lastMonth && row === 0) {
        months.push({ label: MONTH_LABELS[d.getMonth()], col });
        lastMonth = d.getMonth();
      }

      // Don't show future dates
      if (d > today) continue;

      cells.push({ date: dateStr, col, row, data: dayData });
    }

    return { grid: cells, maxWeight: mw, monthMarkers: months };
  }, [dayLookup]);

  // Totals for summary
  const { totalSignals, totalWeight, activeDays } = useMemo(() => {
    let ts = 0, tw = 0, ad = 0;
    for (const d of data) {
      ts += d.total_count;
      tw += d.total_weight;
      if (d.total_count > 0) ad++;
    }
    return { totalSignals: ts, totalWeight: tw, activeDays: ad };
  }, [data]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-purple-500/20">
        <div className="p-6">
          <BrainPanelHeader icon={CalendarDays} title="Signal Activity" accentColor={ACCENT} glowColor={GLOW} glow />
          <div className="h-32 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          </div>
        </div>
      </GlowCard>
    );
  }

  if (error) {
    return (
      <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-purple-500/20">
        <div className="p-6">
          <BrainPanelHeader icon={CalendarDays} title="Signal Activity" accentColor={ACCENT} glowColor={GLOW} glow />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </GlowCard>
    );
  }

  const svgWidth = WEEKS_TO_SHOW * (CELL_SIZE + CELL_GAP) + 30; // +30 for day labels
  const svgHeight = DAYS_IN_WEEK * (CELL_SIZE + CELL_GAP) + 20; // +20 for month labels

  return (
    <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-purple-500/20">
      <div className="p-6 space-y-4">
        <BrainPanelHeader
          icon={CalendarDays}
          title="Signal Activity"
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
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>{activeDays} active days</span>
              <span className="text-zinc-600">|</span>
              <span>{totalSignals} signals</span>
              <span className="text-zinc-600">|</span>
              <span className="text-purple-400">{totalWeight.toFixed(1)} effective</span>
            </div>
          }
        />

        {/* ── Heatmap Grid ───────────────────────────────────────────── */}
        <div className="overflow-x-auto custom-scrollbar-subtle">
          <svg width={svgWidth} height={svgHeight} className="block">
            {/* Month labels */}
            {monthMarkers.map((m, i) => (
              <text
                key={i}
                x={30 + m.col * (CELL_SIZE + CELL_GAP)}
                y={10}
                className="fill-zinc-500"
                fontSize={9}
                fontFamily="monospace"
              >
                {m.label}
              </text>
            ))}

            {/* Day-of-week labels */}
            {DAY_LABELS.map((label, i) => (
              label ? (
                <text
                  key={i}
                  x={0}
                  y={20 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 + 3}
                  className="fill-zinc-600"
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {label}
                </text>
              ) : null
            ))}

            {/* Heatmap cells */}
            {grid.map((cell, i) => {
              const weight = cell.data?.total_weight ?? 0;
              const isSelected = selectedDay?.date === cell.date;
              return (
                <motion.rect
                  key={cell.date}
                  x={30 + cell.col * (CELL_SIZE + CELL_GAP)}
                  y={16 + cell.row * (CELL_SIZE + CELL_GAP)}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill={getIntensityColor(weight, maxWeight)}
                  stroke={isSelected ? '#a855f7' : 'transparent'}
                  strokeWidth={isSelected ? 1.5 : 0}
                  className="cursor-pointer transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.002 }}
                  onClick={() => {
                    if (cell.data) setSelectedDay(cell.data);
                    else setSelectedDay({ date: cell.date, total_count: 0, total_weight: 0, by_type: {}, by_context: {} });
                  }}
                >
                  <title>
                    {cell.date}: {cell.data?.total_count ?? 0} signals ({weight.toFixed(1)} effective weight)
                  </title>
                </motion.rect>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-2xs text-zinc-500">
          <span>Less</span>
          {[0, 0.15, 0.30, 0.50, 0.70, 0.90].map((opacity) => (
            <div
              key={opacity}
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: opacity === 0
                  ? 'rgba(63, 63, 70, 0.3)'
                  : `rgba(168, 85, 247, ${opacity})`,
              }}
            />
          ))}
          <span>More</span>
        </div>

        {/* ── Day Drill-Down ─────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedDay && (
            <DayDrillDown day={selectedDay} onClose={() => setSelectedDay(null)} />
          )}
        </AnimatePresence>

        {/* ── Trend Chart Toggle ──────────────────────────────────────── */}
        <button
          onClick={() => setShowTrend(!showTrend)}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Time-Series Trends</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showTrend ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showTrend && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <TrendChart
                data={data}
                contexts={contexts}
                signalTypes={signalTypes}
                selectedContext={trendContext}
                selectedType={trendType}
                onContextChange={setTrendContext}
                onTypeChange={setTrendType}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlowCard>
  );
}

// ── Day Drill-Down Panel ────────────────────────────────────────────────────

function DayDrillDown({ day, onClose }: { day: HeatmapDayData; onClose: () => void }) {
  const formattedDate = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const typeEntries = Object.entries(day.by_type).sort(([, a], [, b]) => b.weight - a.weight);
  const contextEntries = Object.entries(day.by_context).sort(([, a], [, b]) => b.weight - a.weight);
  const maxTypeWeight = typeEntries.length > 0 ? Math.max(...typeEntries.map(([, v]) => v.weight)) : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border border-zinc-700/50 bg-zinc-900/80 backdrop-blur-sm p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-zinc-200">{formattedDate}</span>
          <span className="text-xs text-zinc-500">
            {day.total_count} signal{day.total_count !== 1 ? 's' : ''}
          </span>
          <span className="text-2xs text-purple-400/70 font-mono">
            {day.total_weight.toFixed(1)}w
          </span>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {day.total_count === 0 ? (
        <p className="text-xs text-zinc-500 py-2">No signals recorded on this day.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Signal Type */}
          <div className="space-y-2">
            <span className="text-2xs text-zinc-500 uppercase tracking-wider font-medium">By Type</span>
            {typeEntries.map(([type, stats]) => {
              const meta = SIGNAL_TYPE_META[type];
              const Icon = meta?.icon ?? Brain;
              const barWidth = (stats.weight / maxTypeWeight) * 100;
              return (
                <div key={type} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta?.color ?? '#a855f7' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-2xs mb-0.5">
                      <span className="text-zinc-300 truncate">{meta?.label ?? type}</span>
                      <span className="text-zinc-500 tabular-nums ml-2">{stats.count} / {stats.weight.toFixed(1)}w</span>
                    </div>
                    <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: meta?.color ?? '#a855f7' }}
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

          {/* By Context */}
          {contextEntries.length > 0 && (
            <div className="space-y-2">
              <span className="text-2xs text-zinc-500 uppercase tracking-wider font-medium">By Context</span>
              {contextEntries.slice(0, 6).map(([ctxId, stats]) => (
                <div key={ctxId} className="flex items-center justify-between text-2xs">
                  <span className="text-zinc-300 truncate max-w-[160px]">{stats.name}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-zinc-500 tabular-nums">{stats.count}</span>
                    {/* Mini sparkline bar */}
                    <div className="w-12 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500/60"
                        style={{ width: `${Math.min((stats.weight / day.total_weight) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {contextEntries.length > 6 && (
                <span className="text-2xs text-zinc-600">+{contextEntries.length - 6} more</span>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Time-Series Trend Chart ─────────────────────────────────────────────────

interface TrendChartProps {
  data: HeatmapDayData[];
  contexts: HeatmapContext[];
  signalTypes: string[];
  selectedContext: string;
  selectedType: string;
  onContextChange: (ctx: string) => void;
  onTypeChange: (type: string) => void;
}

function TrendChart({
  data,
  contexts,
  signalTypes,
  selectedContext,
  selectedType,
  onContextChange,
  onTypeChange,
}: TrendChartProps) {
  // Filter data for selected context/type and compute weekly buckets
  const weeklyData = useMemo(() => {
    // Group data into weekly buckets
    const buckets = new Map<string, { weekLabel: string; count: number; weight: number }>();

    for (const day of data) {
      // Filter by type if selected
      let count = 0;
      let weight = 0;

      if (selectedType === 'all' && selectedContext === 'all') {
        count = day.total_count;
        weight = day.total_weight;
      } else if (selectedType !== 'all' && selectedContext === 'all') {
        const typeData = day.by_type[selectedType];
        if (typeData) { count = typeData.count; weight = typeData.weight; }
      } else if (selectedType === 'all' && selectedContext !== 'all') {
        const ctxData = day.by_context[selectedContext];
        if (ctxData) { count = ctxData.count; weight = ctxData.weight; }
      } else {
        // Both filtered - we need to use the day's raw data which doesn't have type×context cross
        // Use by_type as approximation (API limitation)
        const typeData = day.by_type[selectedType];
        if (typeData) { count = typeData.count; weight = typeData.weight; }
      }

      // Compute week bucket (ISO week)
      const d = new Date(day.date + 'T12:00:00');
      const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000);
      const weekNum = Math.floor(dayOfYear / 7);
      const weekKey = `${d.getFullYear()}-W${weekNum}`;
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      const weekLabel = `${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getDate()}`;

      const existing = buckets.get(weekKey);
      if (existing) {
        existing.count += count;
        existing.weight += weight;
      } else {
        buckets.set(weekKey, { weekLabel, count, weight });
      }
    }

    return Array.from(buckets.values());
  }, [data, selectedContext, selectedType]);

  const maxWeight = Math.max(...weeklyData.map((w) => w.weight), 1);
  const chartHeight = 80;
  const chartWidth = Math.max(weeklyData.length * 40, 200);
  const barWidth = 24;

  return (
    <div className="space-y-3 pt-2">
      {/* Selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-2xs text-zinc-500">Context:</label>
          <select
            value={selectedContext}
            onChange={(e) => onContextChange(e.target.value)}
            className="text-2xs bg-zinc-800 text-zinc-300 border border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Contexts</option>
            {contexts.map((ctx) => (
              <option key={ctx.id} value={ctx.id}>{ctx.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-2xs text-zinc-500">Type:</label>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="text-2xs bg-zinc-800 text-zinc-300 border border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Types</option>
            {signalTypes.map((t) => (
              <option key={t} value={t}>{SIGNAL_TYPE_META[t]?.label ?? t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      {weeklyData.length === 0 ? (
        <p className="text-xs text-zinc-500 py-4 text-center">No data for selected filters.</p>
      ) : (
        <div className="overflow-x-auto custom-scrollbar-subtle">
          <svg width={chartWidth} height={chartHeight + 24} className="block">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={0}
                y1={chartHeight - ratio * chartHeight}
                x2={chartWidth}
                y2={chartHeight - ratio * chartHeight}
                stroke="rgba(63, 63, 70, 0.3)"
                strokeDasharray={ratio === 0 ? undefined : '2,3'}
              />
            ))}

            {/* Bars */}
            {weeklyData.map((week, i) => {
              const barHeight = maxWeight > 0 ? (week.weight / maxWeight) * chartHeight : 0;
              const x = i * 40 + (40 - barWidth) / 2;
              const y = chartHeight - barHeight;
              return (
                <g key={i}>
                  <motion.rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={3}
                    fill="url(#trendGradient)"
                    initial={{ height: 0, y: chartHeight }}
                    animate={{ height: barHeight, y }}
                    transition={{ duration: 0.4, delay: i * 0.03 }}
                  >
                    <title>{week.weekLabel}: {week.count} signals ({week.weight.toFixed(1)}w)</title>
                  </motion.rect>
                  {/* Week label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 14}
                    textAnchor="middle"
                    className="fill-zinc-600"
                    fontSize={8}
                    fontFamily="monospace"
                  >
                    {week.weekLabel}
                  </text>
                </g>
              );
            })}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
}
