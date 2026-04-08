'use client';

/**
 * HotWritesSplitPanel — Dual-Database Architecture Visualization
 *
 * Split-panel diagram showing the main goals.db vs hot-writes.db architecture
 * with animated SVG flow lines, table pills, and aggregation worker status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Database, RefreshCw, Zap, ArrowRight } from 'lucide-react';
import { duration, easing } from '@/lib/motion';

// ─── Types ───────────────────────────────────────────────────────

interface TableInfo {
  name: string;
  rowCount: number;
}

interface HotWritesStatus {
  mainDb: {
    tables: TableInfo[];
    sizeLabel: string;
  };
  hotWritesDb: {
    tables: TableInfo[];
    sizeLabel: string;
  };
  aggregationWorker: {
    active: boolean;
    intervalMs: number;
    retentionHours: number;
  };
  flow: {
    pendingRows: number;
    lastAggregatedTable: string;
  };
}

// ─── Sub-components ──────────────────────────────────────────────

function TablePill({ name, rowCount, index }: TableInfo & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: duration.normal }}
      className="flex items-center gap-1.5"
    >
      <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-800 text-zinc-300 font-mono truncate max-w-[140px]">
        {name}
      </span>
      <span className="text-[10px] tabular-nums text-zinc-500 font-mono min-w-[28px] text-right">
        {rowCount.toLocaleString()}
      </span>
    </motion.div>
  );
}

function DbContainer({
  label,
  sublabel,
  tables,
  icon: Icon,
  accentColor,
}: {
  label: string;
  sublabel: string;
  tables: TableInfo[];
  icon: React.ElementType;
  accentColor: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Icon size={14} className={accentColor} />
          <span className="text-sm font-medium text-zinc-200">{label}</span>
          <span className="text-[10px] text-zinc-500 font-mono ml-auto">{sublabel}</span>
        </div>

        {/* Table pills */}
        <div className="flex flex-wrap gap-1.5">
          {tables.map((t, i) => (
            <TablePill key={t.name} {...t} index={i} />
          ))}
        </div>

        {/* Summary */}
        <div className="mt-3 pt-2 border-t border-zinc-800/40 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            {tables.length} table{tables.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
            {tables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()} rows
          </span>
        </div>
      </div>
    </div>
  );
}

function FlowArrow({ active, pendingRows }: { active: boolean; pendingRows: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-1 shrink-0 w-[100px]">
      {/* Animated SVG flow line */}
      <svg width="80" height="24" viewBox="0 0 80 24" className="overflow-visible">
        {/* Background line */}
        <line x1="0" y1="12" x2="80" y2="12" stroke="#3f3f46" strokeWidth="1.5" />
        {/* Animated flow */}
        {active && (
          <line
            x1="0" y1="12" x2="80" y2="12"
            stroke="#22d3ee"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            className="animate-flow-line"
          />
        )}
        {/* Arrow head */}
        <polygon
          points="74,8 80,12 74,16"
          fill={active ? '#22d3ee' : '#3f3f46'}
        />
      </svg>

      {/* Worker badge */}
      <div className="relative flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/50">
        {active && (
          <span className="absolute -inset-[2px] rounded-full border border-cyan-500/30 animate-pulse" />
        )}
        <RefreshCw
          size={10}
          className={active ? 'text-cyan-400 animate-spin' : 'text-zinc-500'}
          style={{ animationDuration: '3s' }}
        />
        <span className={`text-[10px] font-mono ${active ? 'text-cyan-400' : 'text-zinc-500'}`}>
          aggregator
        </span>
      </div>

      {/* Pending count */}
      {pendingRows > 0 && (
        <span className="text-[9px] text-zinc-500 font-mono tabular-nums">
          {pendingRows.toLocaleString()} pending
        </span>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function HotWritesSplitPanel() {
  const [data, setData] = useState<HotWritesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/db/hot-writes-status');
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <RefreshCw size={14} className="animate-spin" />
          Loading database architecture...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="text-sm text-red-400/70">
          Failed to load database status{error ? `: ${error}` : ''}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.deliberate }}
      className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Database size={14} className="text-cyan-400" />
        <span className="text-sm font-medium text-zinc-200">Database Architecture</span>
        <span className="text-[10px] text-zinc-500 ml-auto font-mono">
          dual-db split
        </span>
      </div>

      {/* Split panel layout */}
      <div className="flex items-stretch gap-0">
        {/* Hot-Writes DB (source) */}
        <DbContainer
          label="Hot Writes"
          sublabel={data.hotWritesDb.sizeLabel}
          tables={data.hotWritesDb.tables}
          icon={Zap}
          accentColor="text-amber-400"
        />

        {/* Flow arrow + aggregation worker */}
        <FlowArrow
          active={data.aggregationWorker.active}
          pendingRows={data.flow.pendingRows}
        />

        {/* Main DB (destination) */}
        <DbContainer
          label="Main DB"
          sublabel={data.mainDb.sizeLabel}
          tables={data.mainDb.tables}
          icon={Database}
          accentColor="text-cyan-400"
        />
      </div>

      {/* Footer metadata */}
      <div className="mt-3 pt-2 border-t border-zinc-800/40 flex items-center gap-4 text-[10px] text-zinc-500 font-mono">
        <span>
          interval: {Math.round(data.aggregationWorker.intervalMs / 60000)}m
        </span>
        <span>
          retention: {data.aggregationWorker.retentionHours}h
        </span>
        <span>
          target: {data.flow.lastAggregatedTable}
        </span>
      </div>

      {/* CSS animation for flow line */}
      <style jsx>{`
        @keyframes flowLine {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        :global(.animate-flow-line) {
          animation: flowLine 0.8s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}
