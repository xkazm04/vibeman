/**
 * SystemHealthDashboard
 * Unified system health dashboard with live pulse indicators.
 * Consumes /api/system-status to display subsystem health cards
 * with animated pulse dots and key metrics.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Database,
  Brain,
  Cpu,
  HardDrive,
  Users,
  Zap,
  Bot,
  Layers,
  AlertTriangle,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import type {
  SystemStatusResponse,
  HealthStatus,
  QueueStatus,
  LLMStatus,
  DatabaseStatus,
  SessionStatus,
  TaskRunnerStatus,
  BrainStatus,
  ResourceStatus,
  CacheStatus,
  MigrationStatus,
  Alert,
} from '@/app/api/system-status/route';

// ============================================================================
// Health status color mapping
// ============================================================================

const statusColors: Record<HealthStatus, { dot: string; bg: string; text: string; border: string; glow: string }> = {
  operational: {
    dot: 'bg-emerald-500',
    bg: 'from-emerald-600/10 to-emerald-600/5',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/20',
  },
  degraded: {
    dot: 'bg-amber-500',
    bg: 'from-amber-600/10 to-amber-600/5',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/20',
  },
  critical: {
    dot: 'bg-red-500',
    bg: 'from-red-600/10 to-red-600/5',
    text: 'text-red-400',
    border: 'border-red-500/20',
    glow: 'shadow-red-500/20',
  },
  unknown: {
    dot: 'bg-zinc-400',
    bg: 'from-zinc-600/10 to-zinc-600/5',
    text: 'text-zinc-400',
    border: 'border-zinc-500/20',
    glow: 'shadow-zinc-500/20',
  },
};

// ============================================================================
// Pulse Dot Component
// ============================================================================

function PulseDot({ status }: { status: HealthStatus }) {
  const color = statusColors[status];
  return (
    <span className="relative flex h-3 w-3">
      <motion.span
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute inset-0 rounded-full ${color.dot} opacity-40`}
      />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color.dot}`} />
    </span>
  );
}

// ============================================================================
// Metric helpers
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ============================================================================
// Subsystem card config
// ============================================================================

interface SubsystemCard {
  key: string;
  label: string;
  icon: LucideIcon;
  getStatus: (data: SystemStatusResponse) => HealthStatus;
  getMetrics: (data: SystemStatusResponse) => { label: string; value: string }[];
}

const subsystems: SubsystemCard[] = [
  {
    key: 'queue',
    label: 'Queue',
    icon: Layers,
    getStatus: (d) => d.queue?.status ?? 'unknown',
    getMetrics: (d) => {
      if (!d.queue) return [];
      return [
        { label: 'Queued', value: `${d.queue.queued}` },
        { label: 'Throughput', value: `${d.queue.throughput.itemsPerHour}/hr` },
      ];
    },
  },
  {
    key: 'llm',
    label: 'LLM Providers',
    icon: Bot,
    getStatus: (d) => d.llm?.status ?? 'unknown',
    getMetrics: (d) => {
      if (!d.llm) return [];
      const available = d.llm.providers.filter((p) => p.available).length;
      return [
        { label: 'Available', value: `${available}/${d.llm.providers.length}` },
        { label: 'Fallback Chain', value: `${d.llm.fallbackChain.length} deep` },
      ];
    },
  },
  {
    key: 'database',
    label: 'Database',
    icon: Database,
    getStatus: (d) => d.database?.status ?? 'unknown',
    getMetrics: (d) => {
      if (!d.database) return [];
      return [
        { label: 'Latency', value: `${d.database.connectionTime}ms` },
        { label: 'Tables', value: `${d.database.tables.length}` },
      ];
    },
  },
  {
    key: 'sessions',
    label: 'Sessions',
    icon: Users,
    getStatus: (d) => d.sessions?.status ?? 'unknown',
    getMetrics: (d) => {
      if (!d.sessions) return [];
      return [
        { label: 'Active', value: `${d.sessions.active}` },
        { label: 'Orphaned', value: `${d.sessions.orphaned}` },
      ];
    },
  },
  {
    key: 'taskRunner',
    label: 'Task Runner',
    icon: Zap,
    getStatus: (d) => d.taskRunner?.status ?? 'unknown',
    getMetrics: (d) => {
      if (!d.taskRunner) return [];
      const rate = d.taskRunner.history.totalRuns > 0
        ? Math.round((d.taskRunner.history.successCount / d.taskRunner.history.totalRuns) * 100)
        : 0;
      return [
        { label: 'Success Rate', value: `${rate}%` },
        { label: 'Total Runs', value: `${d.taskRunner.history.totalRuns}` },
      ];
    },
  },
  {
    key: 'brain',
    label: 'Brain',
    icon: Brain,
    getStatus: (d) => d.brain?.status ?? 'unknown',
    getMetrics: (d) => {
      if (!d.brain) return [];
      return [
        { label: 'Insights', value: `${d.brain.insights.total}` },
        { label: 'Signals Today', value: d.brain.signals.collectedToday !== null ? `${d.brain.signals.collectedToday}` : '-' },
      ];
    },
  },
  {
    key: 'resources',
    label: 'Resources',
    icon: Cpu,
    getStatus: (d) => d.resources?.status ?? 'unknown',
    getMetrics: (d) => {
      if (!d.resources) return [];
      return [
        { label: 'Heap', value: `${d.resources.memory.heapPercent}%` },
        { label: 'CPU', value: d.resources.cpu.usage !== null ? `${d.resources.cpu.usage}%` : '-' },
      ];
    },
  },
  {
    key: 'cache',
    label: 'Cache',
    icon: HardDrive,
    getStatus: (d) => d.cache?.status ?? 'unknown',
    getMetrics: (d) => {
      if (!d.cache) return [];
      return [
        { label: 'Hit Rate', value: `${Math.round(d.cache.hitRate * 100)}%` },
        { label: 'Size', value: `${d.cache.size}/${d.cache.maxSize}` },
      ];
    },
  },
  {
    key: 'migrations',
    label: 'Migrations',
    icon: Activity,
    getStatus: (d) => d.migrations?.status ?? 'unknown',
    getMetrics: (d) => {
      if (!d.migrations) return [];
      return [
        { label: 'Applied', value: `${d.migrations.applied}` },
        { label: 'Mode', value: d.migrations.mode },
      ];
    },
  },
];

// ============================================================================
// Health Card Component
// ============================================================================

function HealthCard({
  card,
  data,
  index,
}: {
  card: SubsystemCard;
  data: SystemStatusResponse;
  index: number;
}) {
  const status = card.getStatus(data);
  const metrics = card.getMetrics(data);
  const color = statusColors[status];
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`bg-gradient-to-br ${color.bg} bg-zinc-950/50 border ${color.border} rounded-xl shadow-sm p-4 flex flex-col gap-3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/5">
            <Icon className="w-4 h-4 text-gray-300" />
          </div>
          <span className="text-sm font-medium text-gray-200">{card.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono uppercase tracking-wider ${color.text}`}>
            {status}
          </span>
          <PulseDot status={status} />
        </div>
      </div>

      {/* Metrics */}
      {metrics.length > 0 && (
        <div className="flex items-center gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5 truncate">
                {m.label}
              </div>
              <div className="text-sm font-mono text-gray-200 truncate">{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Alert Banner Component
// ============================================================================

function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');
  const infoAlerts = alerts.filter((a) => a.severity === 'info');

  const renderGroup = (group: Alert[], severityColor: string, severityIcon: string) => {
    if (group.length === 0) return null;
    return (
      <div className="space-y-1">
        {group.map((alert, i) => (
          <div
            key={`${alert.component}-${i}`}
            className={`flex items-start gap-2 text-xs ${severityColor} px-3 py-1.5 rounded-lg bg-white/[0.02]`}
          >
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              <span className="font-medium">{alert.component}:</span> {alert.message}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="space-y-1"
    >
      {renderGroup(criticalAlerts, 'text-red-400', 'critical')}
      {renderGroup(warningAlerts, 'text-amber-400', 'warning')}
      {renderGroup(infoAlerts, 'text-zinc-400', 'info')}
    </motion.div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function SystemHealthDashboard() {
  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system-status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SystemStatusResponse = await res.json();
      setData(json);
      setError(null);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-800/50 animate-pulse" />
          <div className="h-5 w-48 bg-gray-800/50 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-gray-800/30 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-24 bg-gray-700/50 rounded" />
                <div className="h-3 w-3 bg-gray-700/50 rounded-full" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="h-2.5 w-12 bg-gray-700/30 rounded mb-1" />
                  <div className="h-4 w-16 bg-gray-700/50 rounded" />
                </div>
                <div className="flex-1">
                  <div className="h-2.5 w-12 bg-gray-700/30 rounded mb-1" />
                  <div className="h-4 w-16 bg-gray-700/50 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchStatus}
          className="text-xs text-cyan-400 hover:text-cyan-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const overallColor = statusColors[data.summary.status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${overallColor.bg} border ${overallColor.border}`}>
            <Activity className={`w-5 h-5 ${overallColor.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">System Health</h2>
              <PulseDot status={data.summary.status} />
            </div>
            <p className="text-xs text-gray-500">
              Uptime {formatUptime(data.summary.uptime)}
              {lastFetched && (
                <span className="ml-2">
                  &middot; Updated {lastFetched.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </motion.div>

      {/* Alerts */}
      <AlertBanner alerts={data.alerts} />

      {/* Subsystem Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subsystems.map((card, index) => (
          <HealthCard key={card.key} card={card} data={data} index={index} />
        ))}
      </div>
    </div>
  );
}
