'use client';

/**
 * QueryPerformanceWidget — Compact sparkline + slow queries + contention badges
 *
 * A condensed performance overview widget that visualizes:
 * 1. SVG sparkline of query durations over time
 * 2. Ranked slow queries with proportional duration bars
 * 3. Table contention hotspot badges with tooltip popovers
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Zap, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { duration, easing, stagger, transition } from '@/lib/motion';

// ─── Types (matching /api/db/performance response) ──────────────

interface SlowQuery {
  queryHash: string;
  queryTemplate: string;
  tableNames: string[];
  operationType: string;
  executionCount: number;
  avgDurationMs: number;
  maxDurationMs: number;
  totalDurationMs: number;
  lastExecutedAt: string;
  firstSeenAt: string;
}

interface TableContention {
  tableName: string;
  writeCount: number;
  readCount: number;
  writeRatio: number;
  avgWriteDurationMs: number;
  avgReadDurationMs: number;
  hotness: 'critical' | 'high' | 'medium' | 'low';
}

interface PerformanceOverview {
  totalPatterns: number;
  totalExecutions: number;
  avgDurationMs: number;
  slowestQueryMs: number;
  p95DurationMs: number;
  queriesPerSecond: number;
  collectorBufferSize: number;
}

interface PerformanceProfileResult {
  overview: PerformanceOverview;
  slowQueries: SlowQuery[];
  tableContention: TableContention[];
  indexSuggestions: unknown[];
  routeCorrelations: unknown[];
  analyzedAt: string;
}

// ─── Sparkline SVG ──────────────────────────────────────────────

function Sparkline({ values, width = 280, height = 48 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span className="text-2xs text-gray-600 font-mono">NO_DATA_POINTS</span>
      </div>
    );
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = values.map((v, i) => ({
    x: padding + (i / (values.length - 1)) * chartW,
    y: padding + chartH - ((v - min) / range) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${height} L${points[0].x.toFixed(1)},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <motion.path
        d={areaPath}
        fill="url(#sparkline-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration.dramatic, ease: easing.entrance }}
      />
      {/* Line stroke */}
      <motion.path
        d={linePath}
        fill="none"
        stroke="rgb(52, 211, 153)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: duration.sweep, ease: easing.morph }}
      />
      {/* Endpoint dot */}
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        fill="rgb(52, 211, 153)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: duration.sweep, duration: duration.normal }}
      />
    </svg>
  );
}

// ─── Slow Query Row ─────────────────────────────────────────────

function SlowQueryRow({ query, index, maxDuration }: { query: SlowQuery; index: number; maxDuration: number }) {
  const pct = maxDuration > 0 ? (query.avgDurationMs / maxDuration) * 100 : 0;

  return (
    <motion.div
      layout
      layoutId={`sq-${query.queryHash}`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * stagger.row, duration: duration.deliberate, ease: easing.entrance }}
      className="group flex items-center gap-3 py-1.5"
    >
      {/* Rank */}
      <span className="text-2xs font-mono text-gray-600 w-4 text-right flex-shrink-0">
        {index + 1}
      </span>

      {/* Query template */}
      <span
        className="font-mono text-xs text-gray-400 truncate flex-1 min-w-0 group-hover:text-gray-300 transition-colors"
        title={query.queryTemplate}
      >
        {query.queryTemplate.length > 50
          ? query.queryTemplate.slice(0, 50) + '...'
          : query.queryTemplate}
      </span>

      {/* Duration bar + value */}
      <div className="flex items-center gap-2 flex-shrink-0 w-32">
        <div className="flex-1 h-1.5 bg-gray-800/60 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: index * stagger.row + 0.15, duration: duration.slow, ease: easing.entrance }}
          />
        </div>
        <span className={`text-xs font-mono flex-shrink-0 w-14 text-right ${
          query.avgDurationMs > 50 ? 'text-red-400' : query.avgDurationMs > 10 ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          {query.avgDurationMs.toFixed(1)}ms
        </span>
      </div>
    </motion.div>
  );
}

// ─── Contention Badge ───────────────────────────────────────────

function ContentionBadge({ table }: { table: TableContention }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const hotnessStyles: Record<string, { border: string; text: string; glow: string }> = {
    critical: { border: 'border-red-500/40', text: 'text-red-300', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.15)]' },
    high: { border: 'border-orange-500/40', text: 'text-orange-300', glow: 'shadow-[0_0_8px_rgba(249,115,22,0.1)]' },
    medium: { border: 'border-yellow-500/30', text: 'text-yellow-300', glow: '' },
    low: { border: 'border-gray-600/30', text: 'text-gray-400', glow: '' },
  };

  const style = hotnessStyles[table.hotness];
  const total = table.writeCount + table.readCount;

  return (
    <div className="relative" ref={badgeRef}>
      <button
        className={`px-2 py-0.5 rounded-md text-xs font-mono border bg-gray-800/60 ${style.border} ${style.text} ${style.glow} hover:bg-gray-800 transition-colors cursor-default`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-describedby={`tooltip-${table.tableName}`}
      >
        {table.tableName}
        {table.hotness !== 'low' && (
          <span className="ml-1 text-2xs opacity-60">{table.hotness === 'critical' ? '!!!' : table.hotness === 'high' ? '!!' : '!'}</span>
        )}
      </button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            id={`tooltip-${table.tableName}`}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={transition.snappy}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 p-3 rounded-lg bg-gray-900 border border-gray-700/60 shadow-xl"
          >
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-gray-900 border-b border-r border-gray-700/60" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">{table.tableName}</span>
                <span className={`text-2xs font-semibold uppercase px-1.5 py-0.5 rounded ${
                  table.hotness === 'critical' ? 'bg-red-500/20 text-red-300' :
                  table.hotness === 'high' ? 'bg-orange-500/20 text-orange-300' :
                  table.hotness === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-600/20 text-gray-400'
                }`}>
                  {table.hotness}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-2xs">
                <div>
                  <span className="text-gray-500">Writes</span>
                  <span className="block text-amber-400 font-mono">{table.writeCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Reads</span>
                  <span className="block text-cyan-400 font-mono">{table.readCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Write Ratio</span>
                  <span className="block text-gray-200 font-mono">{Math.round(table.writeRatio * 100)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Ops</span>
                  <span className="block text-gray-200 font-mono">{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-amber-500/80 rounded-l-full"
                  style={{ width: `${table.writeRatio * 100}%` }}
                />
                <div
                  className="h-full bg-cyan-500/60 rounded-r-full"
                  style={{ width: `${(1 - table.writeRatio) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-2xs text-gray-500">
                <span>Avg write: {table.avgWriteDurationMs.toFixed(1)}ms</span>
                <span>Avg read: {table.avgReadDurationMs.toFixed(1)}ms</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Widget ────────────────────────────────────────────────

export default function QueryPerformanceWidget({ projectId = 'default' }: { projectId?: string }) {
  const [data, setData] = useState<PerformanceProfileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/db/performance?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build sparkline data from slow queries sorted by firstSeenAt
  const sparklineValues = data?.slowQueries
    .slice()
    .sort((a, b) => new Date(a.firstSeenAt).getTime() - new Date(b.firstSeenAt).getTime())
    .map(q => q.avgDurationMs) ?? [];

  const maxDuration = data?.slowQueries.length
    ? Math.max(...data.slowQueries.map(q => q.avgDurationMs))
    : 0;

  const hotTables = data?.tableContention.filter(t => t.hotness !== 'low') ?? [];

  if (loading) {
    return (
      <div className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-emerald-500/20 rounded-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-4 h-4 animate-spin text-gray-500 mr-2" />
          <span className="text-xs text-gray-500 font-mono">LOADING_PERFORMANCE</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-gray-700/30 rounded-2xl p-6 overflow-hidden">
        <div className="text-center py-6">
          <Database className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-500">{error}</p>
          <button onClick={loadData} className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 font-mono">
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overview } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: duration.deliberate, ease: easing.entrance }}
      className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-emerald-500/20 rounded-2xl p-6 overflow-hidden shadow-[0_0_40px_rgba(52,211,153,0.05)]"
    >
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(52,211,153,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-1/3 h-1/3 bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-200">Query Performance</h3>
              <p className="text-xs text-gray-500 font-mono">
                {overview.totalPatterns} patterns &middot; {overview.queriesPerSecond > 0 ? `${overview.queriesPerSecond}/s` : 'idle'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* KPI pills */}
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-mono text-emerald-400">
                P95 {overview.p95DurationMs.toFixed(0)}ms
              </span>
              <span className={`px-2 py-1 rounded-lg text-xs font-mono border ${
                overview.slowestQueryMs > 50
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                MAX {overview.slowestQueryMs.toFixed(0)}ms
              </span>
            </div>

            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-gray-800/50 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Refresh performance data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sparkline Section */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <p className="text-2xs text-gray-500 mb-1 uppercase tracking-wider">Duration Trend</p>
            <Sparkline values={sparklineValues} width={320} height={48} />
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-right">
              <p className="text-2xs text-gray-500">AVG</p>
              <p className="text-sm font-mono font-bold text-emerald-400" style={{ textShadow: '0 0 10px rgba(52, 211, 153, 0.3)' }}>
                {overview.avgDurationMs.toFixed(1)}ms
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xs text-gray-500">TOTAL EXEC</p>
              <p className="text-xs font-mono text-gray-300">
                {overview.totalExecutions.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Slow Queries Section */}
        {data.slowQueries.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-gray-300">
                Slowest Queries
              </span>
              <span className="text-2xs text-gray-600 font-mono">
                TOP {Math.min(data.slowQueries.length, 5)}
              </span>
            </div>

            <div className="space-y-0.5">
              <AnimatePresence mode="popLayout">
                {data.slowQueries.slice(0, 5).map((q, i) => (
                  <SlowQueryRow
                    key={q.queryHash}
                    query={q}
                    index={i}
                    maxDuration={maxDuration}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Contention Hotspots */}
        {hotTables.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-semibold text-gray-300">
                Contention Hotspots
              </span>
              <span className="text-2xs text-gray-600 font-mono">
                {hotTables.length} TABLE{hotTables.length !== 1 ? 'S' : ''}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {hotTables.map((t) => (
                <ContentionBadge key={t.tableName} table={t} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no queries and no contention */}
        {data.slowQueries.length === 0 && hotTables.length === 0 && (
          <div className="text-center py-4">
            <Database className="w-6 h-6 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-600 font-mono">NO_QUERIES_COLLECTED</p>
            <p className="text-2xs text-gray-700 mt-1">Performance data appears after app activity</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
