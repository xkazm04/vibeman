'use client';

/**
 * DatabaseHealthPanel — Query Performance Profiler Dashboard
 *
 * Surfaces query_patterns data as an actionable performance view:
 * - Top 10 slowest queries with avg/max durations
 * - Write contention hotspots with read/write ratio
 * - Missing index suggestions with severity
 * - API route correlation (which features cause the most DB load)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Zap,
  AlertTriangle,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  HardDrive,
  Gauge,
  TrendingUp,
  Globe,
} from 'lucide-react';
import ReflectorKPICard from '../../components/ReflectorKPICard';

// ─── Types (matching /api/db/performance response) ────────────────

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

interface IndexSuggestion {
  tableName: string;
  reason: string;
  suggestedColumns: string[];
  estimatedImpact: string;
  queryPatternCount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface RouteCorrelation {
  endpoint: string;
  method: string;
  totalCalls: number;
  avgResponseTimeMs: number;
  maxResponseTimeMs: number;
  errorRate: number;
  estimatedDbLoad: number;
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
  indexSuggestions: IndexSuggestion[];
  routeCorrelations: RouteCorrelation[];
  analyzedAt: string;
}

type TabId = 'slow_queries' | 'write_contention' | 'index_advisor' | 'routes';

// ─── Component ────────────────────────────────────────────────────

export default function DatabaseHealthPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<PerformanceProfileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('slow_queries');

  const loadData = useCallback(async () => {
    if (!projectId) return;
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
        <span className="text-gray-400">Loading query performance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-8 text-center">
        <Database className="w-10 h-10 text-gray-600 mx-auto mb-3" />
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

  const { overview } = data;

  const TABS: { id: TabId; label: string; count: number }[] = [
    { id: 'slow_queries', label: 'Slow Queries', count: data.slowQueries.length },
    { id: 'write_contention', label: 'Write Contention', count: data.tableContention.filter(t => t.hotness !== 'low').length },
    { id: 'index_advisor', label: 'Index Advisor', count: data.indexSuggestions.length },
    { id: 'routes', label: 'Route Load', count: data.routeCorrelations.filter(r => r.estimatedDbLoad > 0).length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-200">Database Health</h3>
            <p className="text-xs text-gray-500">
              Query profiler with index advisor
              {data.analyzedAt && (
                <> &middot; Analyzed {new Date(data.analyzedAt).toLocaleTimeString()}</>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReflectorKPICard
          title="Query Patterns"
          value={overview.totalPatterns.toLocaleString()}
          icon={Search}
          accentColor="#22d3ee"
          delay={0}
        />
        <ReflectorKPICard
          title="Total Executions"
          value={overview.totalExecutions.toLocaleString()}
          subtitle={overview.queriesPerSecond > 0 ? `${overview.queriesPerSecond}/s` : undefined}
          icon={Zap}
          accentColor="#a78bfa"
          delay={0.1}
        />
        <ReflectorKPICard
          title="P95 Duration"
          value={`${overview.p95DurationMs.toFixed(1)}ms`}
          subtitle={`avg ${overview.avgDurationMs.toFixed(1)}ms`}
          icon={Clock}
          accentColor="#fbbf24"
          delay={0.2}
        />
        <ReflectorKPICard
          title="Slowest Query"
          value={`${overview.slowestQueryMs.toFixed(0)}ms`}
          icon={AlertTriangle}
          accentColor={overview.slowestQueryMs > 50 ? '#f87171' : '#4ade80'}
          delay={0.3}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-gray-800/40 rounded-lg p-1 border border-gray-700/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/30 text-emerald-200'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'slow_queries' && (
          <motion.div key="slow_queries" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <SlowQueriesTab queries={data.slowQueries} />
          </motion.div>
        )}
        {activeTab === 'write_contention' && (
          <motion.div key="write_contention" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <WriteContentionTab tables={data.tableContention} />
          </motion.div>
        )}
        {activeTab === 'index_advisor' && (
          <motion.div key="index_advisor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <IndexAdvisorTab suggestions={data.indexSuggestions} />
          </motion.div>
        )}
        {activeTab === 'routes' && (
          <motion.div key="routes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <RouteCorrelationsTab routes={data.routeCorrelations} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Slow Queries Tab ─────────────────────────────────────────────

function SlowQueriesTab({ queries }: { queries: SlowQuery[] }) {
  const [expandedHash, setExpandedHash] = useState<string | null>(null);

  if (queries.length === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title="No slow queries detected"
        description="Query patterns are collected as the app runs. Check back after some activity."
      />
    );
  }

  return (
    <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800/50 border-b border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Query</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">Op</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Count</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Avg</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Max</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {queries.map((q) => {
            const isExpanded = expandedHash === q.queryHash;
            return (
              <React.Fragment key={q.queryHash}>
                <tr
                  className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedHash(isExpanded ? null : q.queryHash)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="font-mono text-xs text-gray-300 truncate max-w-[320px]" title={q.queryTemplate}>
                        {q.queryTemplate.slice(0, 60)}
                        {q.queryTemplate.length > 60 ? '...' : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><OpBadge op={q.operationType} /></td>
                  <td className="px-3 py-3 text-right text-xs text-gray-300 font-mono">
                    {q.executionCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right"><DurationBadge ms={q.avgDurationMs} /></td>
                  <td className="px-3 py-3 text-right"><DurationBadge ms={q.maxDurationMs} /></td>
                  <td className="px-3 py-3 text-right text-xs text-gray-400 font-mono">
                    {q.totalDurationMs.toFixed(0)}ms
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 bg-gray-900/50">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Query Template</p>
                          <pre className="bg-gray-950/50 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                            {q.queryTemplate}
                          </pre>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tables Accessed</p>
                            <div className="flex flex-wrap gap-1">
                              {q.tableNames.map((t) => (
                                <span key={t} className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs font-mono">{t}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Timeline</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-gray-800/50 rounded p-2">
                                <span className="text-gray-500">First Seen</span>
                                <span className="block text-gray-200 font-mono">{new Date(q.firstSeenAt).toLocaleDateString()}</span>
                              </div>
                              <div className="bg-gray-800/50 rounded p-2">
                                <span className="text-gray-500">Last Run</span>
                                <span className="block text-gray-200 font-mono">{new Date(q.lastExecutedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Write Contention Tab ─────────────────────────────────────────

function WriteContentionTab({ tables }: { tables: TableContention[] }) {
  if (tables.length === 0) {
    return (
      <EmptyState
        icon={HardDrive}
        title="No write contention detected"
        description="Write patterns are analyzed from INSERT, UPDATE, and DELETE query patterns."
      />
    );
  }

  const maxWrites = Math.max(...tables.map((t) => t.writeCount));

  return (
    <div className="space-y-3">
      {tables.map((t) => {
        const barPct = maxWrites > 0 ? (t.writeCount / maxWrites) * 100 : 0;
        const total = t.writeCount + t.readCount;
        return (
          <div key={t.tableName} className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-sm text-gray-200">{t.tableName}</span>
                <HotnessBadge hotness={t.hotness} />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{total.toLocaleString()} total ops</span>
                <span>{Math.round(t.writeRatio * 100)}% writes</span>
              </div>
            </div>

            {/* Write/Read ratio bar */}
            <div className="h-2 bg-gray-900/50 rounded-full overflow-hidden mb-3 flex">
              <motion.div
                className="h-full rounded-l-full"
                style={{
                  background: t.hotness === 'critical' ? '#ef4444' :
                              t.hotness === 'high' ? '#f59e0b' : '#22d3ee',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${t.writeRatio * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              <motion.div
                className="h-full rounded-r-full bg-cyan-600/40"
                initial={{ width: 0 }}
                animate={{ width: `${(1 - t.writeRatio) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-amber-400">
                Writes: {t.writeCount.toLocaleString()}
                <span className="text-gray-500 ml-1">({t.avgWriteDurationMs.toFixed(1)}ms avg)</span>
              </span>
              <span className="text-cyan-400">
                Reads: {t.readCount.toLocaleString()}
                <span className="text-gray-500 ml-1">({t.avgReadDurationMs.toFixed(1)}ms avg)</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Index Advisor Tab ────────────────────────────────────────────

function IndexAdvisorTab({ suggestions }: { suggestions: IndexSuggestion[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (suggestions.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No missing indexes detected"
        description="All frequently filtered columns appear to have indexes."
      />
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <div key={i} className="rounded-lg bg-gray-800/40 border border-gray-700/50 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/60 transition-colors"
            onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
          >
            <div className="flex items-center gap-3">
              <SeverityBadge severity={s.severity} />
              <div>
                <span className="font-mono text-xs text-gray-200">{s.tableName}</span>
                <p className="text-xs text-gray-400 mt-0.5 max-w-lg truncate">{s.reason}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {s.queryPatternCount.toLocaleString()} exec{s.queryPatternCount !== 1 ? 's' : ''}
              </span>
              {expandedIdx === i ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </div>
          </div>

          {expandedIdx === i && (
            <div className="px-4 py-3 border-t border-gray-700/50 bg-gray-900/30 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Suggested Columns to Index</p>
                <div className="flex flex-wrap gap-1">
                  {s.suggestedColumns.map((col) => (
                    <span key={col} className="px-2 py-0.5 bg-emerald-900/30 text-emerald-300 rounded text-xs font-mono border border-emerald-500/20">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Suggested SQL</p>
                <pre className="bg-gray-950/50 rounded p-2 text-xs text-emerald-300 font-mono overflow-x-auto">
                  CREATE INDEX IF NOT EXISTS idx_{s.tableName}_{s.suggestedColumns.join('_')} ON {s.tableName}({s.suggestedColumns.join(', ')});
                </pre>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Impact Assessment</p>
                <p className="text-xs text-gray-300">{s.estimatedImpact}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Route Correlations Tab ───────────────────────────────────────

function RouteCorrelationsTab({ routes }: { routes: RouteCorrelation[] }) {
  if (routes.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="No route correlations available"
        description="API call data from the observability middleware will appear here once endpoints are active."
      />
    );
  }

  return (
    <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800/50 border-b border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Endpoint</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">Method</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Calls</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Avg Time</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Max Time</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Error Rate</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">DB Load</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {routes.map((r) => (
            <tr key={`${r.endpoint}-${r.method}`} className="hover:bg-gray-800/30 transition-colors">
              <td className="px-4 py-2">
                <span className="font-mono text-xs text-gray-200 truncate block max-w-[280px]" title={r.endpoint}>
                  {r.endpoint}
                </span>
              </td>
              <td className="px-3 py-2"><MethodBadge method={r.method} /></td>
              <td className="px-3 py-2 text-right text-xs text-gray-300 font-mono">
                {r.totalCalls.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right"><DurationBadge ms={r.avgResponseTimeMs} /></td>
              <td className="px-3 py-2 text-right"><DurationBadge ms={r.maxResponseTimeMs} /></td>
              <td className="px-3 py-2 text-right">
                <span className={`text-xs font-mono ${r.errorRate > 5 ? 'text-red-400' : r.errorRate > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {r.errorRate.toFixed(1)}%
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <DbLoadBar load={r.estimatedDbLoad} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Shared UI Atoms ──────────────────────────────────────────────

function OpBadge({ op }: { op: string }) {
  const colors: Record<string, string> = {
    select: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    insert: 'bg-green-500/20 text-green-300 border-green-500/30',
    update: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    delete: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  return (
    <span className={`px-1.5 py-0.5 text-xs font-semibold rounded border ${colors[op] || 'bg-gray-600/20 text-gray-300'}`}>
      {op.toUpperCase()}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-cyan-500/20 text-cyan-300',
    POST: 'bg-green-500/20 text-green-300',
    PUT: 'bg-yellow-500/20 text-yellow-300',
    DELETE: 'bg-red-500/20 text-red-300',
    PATCH: 'bg-purple-500/20 text-purple-300',
  };
  return (
    <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${colors[method] || 'bg-gray-600/20 text-gray-300'}`}>
      {method}
    </span>
  );
}

function DurationBadge({ ms }: { ms: number }) {
  const color = ms > 50 ? 'text-red-400' : ms > 10 ? 'text-yellow-400' : 'text-green-400';
  return <span className={`text-xs font-mono ${color}`}>{ms.toFixed(1)}ms</span>;
}

function SeverityBadge({ severity }: { severity: 'critical' | 'high' | 'medium' | 'low' }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    low: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };
  return (
    <span className={`px-1.5 py-0.5 text-2xs font-semibold uppercase rounded border ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function HotnessBadge({ hotness }: { hotness: 'critical' | 'high' | 'medium' | 'low' }) {
  if (hotness === 'low') return null;
  const styles: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300',
    high: 'bg-orange-500/20 text-orange-300',
    medium: 'bg-yellow-500/20 text-yellow-300',
  };
  return (
    <span className={`px-1.5 py-0.5 text-2xs font-semibold uppercase rounded ${styles[hotness]}`}>
      {hotness}
    </span>
  );
}

function DbLoadBar({ load }: { load: number }) {
  const clampedLoad = Math.min(100, load);
  const color = clampedLoad > 30 ? 'bg-red-400' : clampedLoad > 10 ? 'bg-yellow-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clampedLoad}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-400">{load.toFixed(1)}%</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-10 text-center">
      <Icon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
      <p className="text-gray-300 font-medium mb-1">{title}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
