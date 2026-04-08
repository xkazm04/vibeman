'use client';

/**
 * StorageAnalyticsPanel — Database Size & Table Growth Analytics
 *
 * Shows per-table disk usage, row counts, growth trends, and bloat warnings.
 * Uses SQLite PRAGMA data for total DB size and proportional table estimates.
 * Highlights behavioral_signals and obs_api_calls as high-frequency write tables.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardDrive,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Database,
  BarChart3,
  ArrowUpRight,
  Minus,
} from 'lucide-react';
import ReflectorKPICard from '../../components/ReflectorKPICard';
import { duration, easing } from '@/lib/motion';

// ─── Types ───────────────────────────────────────────────────────

interface TableStats {
  name: string;
  rowCount: number;
  estimatedSizeBytes: number;
  database: 'main' | 'hot-writes';
  isHighFrequency: boolean;
}

interface DbSizeInfo {
  label: string;
  totalSizeBytes: number;
  pageSize: number;
  pageCount: number;
  freelistCount: number;
  walSizeBytes: number;
}

interface GrowthTrend {
  tableName: string;
  currentRows: number;
  growthRate: 'fast' | 'moderate' | 'slow' | 'static';
  bloatWarning: boolean;
}

interface StorageAnalyticsData {
  mainDb: DbSizeInfo;
  hotWritesDb: DbSizeInfo;
  tables: TableStats[];
  growthTrends: GrowthTrend[];
  totalSizeBytes: number;
  sampledAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function growthRateColor(rate: GrowthTrend['growthRate']): string {
  switch (rate) {
    case 'fast': return 'text-red-400';
    case 'moderate': return 'text-amber-400';
    case 'slow': return 'text-cyan-400';
    case 'static': return 'text-gray-500';
  }
}

function growthRateBg(rate: GrowthTrend['growthRate']): string {
  switch (rate) {
    case 'fast': return 'bg-red-500/20 border-red-500/30';
    case 'moderate': return 'bg-amber-500/20 border-amber-500/30';
    case 'slow': return 'bg-cyan-500/20 border-cyan-500/30';
    case 'static': return 'bg-gray-500/20 border-gray-500/30';
  }
}

function GrowthIcon({ rate }: { rate: GrowthTrend['growthRate'] }) {
  if (rate === 'fast') return <ArrowUpRight className="w-3 h-3" />;
  if (rate === 'moderate') return <TrendingUp className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

// ─── Component ───────────────────────────────────────────────────

export default function StorageAnalyticsPanel() {
  const [data, setData] = useState<StorageAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'tables' | 'growth'>('tables');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/db/storage-analytics');
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
        <span className="text-gray-400">Loading storage analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-8 text-center">
        <HardDrive className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 mb-2">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const bloatCount = data.growthTrends.filter(t => t.bloatWarning).length;
  const fastGrowing = data.growthTrends.filter(t => t.growthRate === 'fast').length;
  const tableCount = data.tables.filter(t => t.rowCount >= 0).length;
  const freelistPct = data.mainDb.pageCount > 0
    ? ((data.mainDb.freelistCount / data.mainDb.pageCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30">
            <HardDrive className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-200">Storage Analytics</h3>
            <p className="text-xs text-gray-500">
              Per-table disk usage and growth trends
              {data.sampledAt && (
                <> &middot; Sampled {new Date(data.sampledAt).toLocaleTimeString()}</>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Refresh storage analytics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReflectorKPICard
          title="Total DB Size"
          value={formatBytes(data.totalSizeBytes)}
          subtitle={`${data.mainDb.label} + ${data.hotWritesDb.label}`}
          icon={Database}
          accentColor="#a78bfa"
          delay={0}
        />
        <ReflectorKPICard
          title="Active Tables"
          value={tableCount.toString()}
          subtitle={`${data.tables.filter(t => t.database === 'hot-writes').length} in hot-writes`}
          icon={BarChart3}
          accentColor="#22d3ee"
          delay={0.1}
        />
        <ReflectorKPICard
          title="Fast Growing"
          value={fastGrowing.toString()}
          subtitle={fastGrowing > 0 ? 'tables with high row count' : 'all stable'}
          icon={TrendingUp}
          accentColor={fastGrowing > 0 ? '#f59e0b' : '#4ade80'}
          delay={0.2}
        />
        <ReflectorKPICard
          title="Bloat Warnings"
          value={bloatCount.toString()}
          subtitle={freelistPct > 5 ? `${freelistPct.toFixed(1)}% freelist` : 'no fragmentation'}
          icon={AlertTriangle}
          accentColor={bloatCount > 0 ? '#f87171' : '#4ade80'}
          delay={0.3}
        />
      </div>

      {/* DB Size Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DbSizeCard db={data.mainDb} />
        <DbSizeCard db={data.hotWritesDb} />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-gray-800/40 rounded-lg p-1 border border-gray-700/50">
        <button
          onClick={() => setView('tables')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'tables'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Table Sizes ({data.tables.length})
        </button>
        <button
          onClick={() => setView('growth')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
            view === 'growth'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Growth Trends
          {bloatCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500/30 text-red-200">
              {bloatCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === 'tables' ? (
          <motion.div
            key="tables"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TableSizeList tables={data.tables} totalSize={data.totalSizeBytes} />
          </motion.div>
        ) : (
          <motion.div
            key="growth"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GrowthTrendsList trends={data.growthTrends} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── DB Size Card ────────────────────────────────────────────────

function DbSizeCard({ db }: { db: DbSizeInfo }) {
  const usedPages = db.pageCount - db.freelistCount;
  const usedPct = db.pageCount > 0 ? (usedPages / db.pageCount) * 100 : 0;

  return (
    <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-gray-200">{db.label}</span>
        </div>
        <span className="text-sm font-mono text-gray-300">{formatBytes(db.totalSizeBytes)}</span>
      </div>

      {/* Usage bar */}
      <div className="h-3 bg-gray-900/50 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          initial={{ width: 0 }}
          animate={{ width: `${usedPct}%` }}
          transition={{ duration: duration.slow, ease: easing.entrance }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-900/30 rounded-lg p-2">
          <span className="text-gray-500 block">Pages</span>
          <span className="text-gray-200 font-mono">{db.pageCount.toLocaleString()}</span>
        </div>
        <div className="bg-gray-900/30 rounded-lg p-2">
          <span className="text-gray-500 block">Page Size</span>
          <span className="text-gray-200 font-mono">{formatBytes(db.pageSize)}</span>
        </div>
        <div className="bg-gray-900/30 rounded-lg p-2">
          <span className="text-gray-500 block">WAL</span>
          <span className="text-gray-200 font-mono">{formatBytes(db.walSizeBytes)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Table Size List ─────────────────────────────────────────────

function TableSizeList({ tables, totalSize }: { tables: TableStats[]; totalSize: number }) {
  const maxRows = Math.max(...tables.map(t => t.rowCount), 1);

  return (
    <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800/50 border-b border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Table</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">DB</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Rows</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Est. Size</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-40">Distribution</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {tables.map((t, i) => {
            const barPct = maxRows > 0 ? (t.rowCount / maxRows) * 100 : 0;
            return (
              <motion.tr
                key={t.name}
                className="hover:bg-gray-800/30 transition-colors"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02, duration: duration.normal }}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-200">{t.name}</span>
                    {t.isHighFrequency && (
                      <span className="px-1.5 py-0.5 text-2xs font-semibold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        hot
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                    t.database === 'hot-writes'
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {t.database === 'hot-writes' ? 'hot' : 'main'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-gray-300 font-mono">
                  {t.rowCount.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-gray-400 font-mono">
                  {formatBytes(t.estimatedSizeBytes)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        t.isHighFrequency ? 'bg-amber-400' : 'bg-violet-400'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ delay: i * 0.02 + 0.1, duration: duration.slow, ease: easing.entrance }}
                    />
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Growth Trends List ──────────────────────────────────────────

function GrowthTrendsList({ trends }: { trends: GrowthTrend[] }) {
  // Sort: bloat warnings first, then by growth rate severity
  const sorted = [...trends].sort((a, b) => {
    if (a.bloatWarning !== b.bloatWarning) return a.bloatWarning ? -1 : 1;
    const order = { fast: 0, moderate: 1, slow: 2, static: 3 };
    return order[a.growthRate] - order[b.growthRate];
  });

  return (
    <div className="space-y-2">
      {sorted.map((t, i) => (
        <motion.div
          key={t.tableName}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: duration.normal }}
          className={`rounded-lg border p-4 ${
            t.bloatWarning
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-gray-800/40 border-gray-700/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {t.bloatWarning && (
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <div>
                <span className="font-mono text-sm text-gray-200">{t.tableName}</span>
                {t.bloatWarning && (
                  <p className="text-xs text-red-400/80 mt-0.5">
                    High-frequency table exceeding recommended row count threshold
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">
                {t.currentRows.toLocaleString()} rows
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border ${growthRateBg(t.growthRate)} ${growthRateColor(t.growthRate)}`}>
                <GrowthIcon rate={t.growthRate} />
                {t.growthRate}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
