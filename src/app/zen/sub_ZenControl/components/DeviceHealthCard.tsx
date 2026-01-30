'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor,
  Smartphone,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Play,
  Square,
  RefreshCw,
} from 'lucide-react';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';
import type { DeviceHealthMetrics, HealthHistoryEntry } from '@/lib/remote/batchDispatcher';

interface DeviceHealthCardProps {
  device: RemoteDevice;
  healthMetrics?: DeviceHealthMetrics;
  healthHistory?: HealthHistoryEntry[];
  isSelected?: boolean;
  isLocal?: boolean;
  onSelect?: () => void;
  onAction?: (action: 'ping' | 'healthcheck' | 'restart' | 'stop') => void;
  compact?: boolean;
}

/**
 * Get status color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'text-green-400';
    case 'busy':
      return 'text-amber-400';
    case 'idle':
      return 'text-blue-400';
    case 'offline':
      return 'text-gray-500';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get status background color
 */
function getStatusBgColor(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-green-500/20';
    case 'busy':
      return 'bg-amber-500/20';
    case 'idle':
      return 'bg-blue-500/20';
    case 'offline':
      return 'bg-gray-500/20';
    default:
      return 'bg-gray-500/20';
  }
}

/**
 * Get health score color
 */
function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-lime-400';
  if (score >= 40) return 'text-amber-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get health bar color
 */
function getHealthBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-lime-500';
  if (score >= 40) return 'bg-amber-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Format time ago
 */
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}

/**
 * Mini sparkline for health history
 */
function HealthSparkline({ history }: { history: HealthHistoryEntry[] }) {
  if (!history || history.length < 2) return null;

  const height = 24;
  const width = 60;
  const points = history.slice(0, 10).reverse();
  const maxScore = 100;
  const minScore = 0;

  const pathData = points
    .map((entry, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((entry.healthScore - minScore) / (maxScore - minScore)) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const lastScore = points[points.length - 1]?.healthScore ?? 0;

  return (
    <svg width={width} height={height} className="opacity-60">
      <path
        d={pathData}
        fill="none"
        stroke={lastScore >= 60 ? '#22c55e' : lastScore >= 40 ? '#eab308' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DeviceHealthCard({
  device,
  healthMetrics,
  healthHistory,
  isSelected = false,
  isLocal = false,
  onSelect,
  onAction,
  compact = false,
}: DeviceHealthCardProps) {
  const status = healthMetrics?.status ?? device.status;
  const healthScore = healthMetrics?.healthScore ?? 0;
  const latencyMs = healthMetrics?.latencyMs ?? null;
  const activeSessions = healthMetrics?.activeSessions ?? device.active_sessions;
  const maxSessions = healthMetrics?.maxSessions ?? device.capabilities?.session_slots ?? 4;
  const utilizationPercent = Math.round((activeSessions / maxSessions) * 100);

  const DeviceIcon = device.device_type === 'desktop' ? Monitor : Smartphone;

  // Determine alert status
  const hasAlert = useMemo(() => {
    if (status === 'offline') return 'critical';
    if (healthScore < 40) return 'warning';
    if (latencyMs !== null && latencyMs > 300) return 'warning';
    return null;
  }, [status, healthScore, latencyMs]);

  if (compact) {
    return (
      <motion.button
        onClick={onSelect}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left
          ${isSelected
            ? 'bg-purple-500/20 border border-purple-500/40'
            : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50'
          }
        `}
      >
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-400' : status === 'busy' ? 'bg-amber-400' : 'bg-gray-500'}`} />

        {/* Device icon and name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <DeviceIcon className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-200 truncate">{device.device_name}</span>
            {isLocal && (
              <span className="px-1 py-0.5 bg-cyan-500/20 text-cyan-400 text-[8px] rounded">YOU</span>
            )}
          </div>
        </div>

        {/* Health score */}
        <div className={`text-xs font-medium ${getHealthColor(healthScore)}`}>
          {healthScore}%
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative p-4 rounded-xl transition-all
        ${isSelected
          ? 'bg-purple-500/10 border-2 border-purple-500/40 shadow-lg shadow-purple-500/10'
          : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
        }
      `}
    >
      {/* Alert badge */}
      {hasAlert && (
        <div
          className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
            hasAlert === 'critical' ? 'bg-red-500' : 'bg-amber-500'
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <button
          onClick={onSelect}
          className="flex items-center gap-2 text-left"
        >
          <div className={`p-2 rounded-lg ${getStatusBgColor(status)}`}>
            <DeviceIcon className={`w-5 h-5 ${getStatusColor(status)}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-200">{device.device_name}</span>
              {isLocal && (
                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] font-medium rounded">
                  LOCAL
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              {status === 'offline' ? (
                <WifiOff className="w-3 h-3" />
              ) : (
                <Wifi className="w-3 h-3" />
              )}
              <span className={getStatusColor(status)}>{status}</span>
              <span className="mx-1">•</span>
              <Clock className="w-3 h-3" />
              <span>{formatTimeAgo(device.last_heartbeat_at)}</span>
            </div>
          </div>
        </button>

        {/* Action menu */}
        {onAction && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAction('ping')}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Ping device"
            >
              <Activity className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button
              onClick={() => onAction('healthcheck')}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Health check"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* Health Score Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Health Score</span>
          <span className={`text-sm font-bold ${getHealthColor(healthScore)}`}>{healthScore}%</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getHealthBarColor(healthScore)} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${healthScore}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Sessions */}
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <Cpu className="w-3 h-3 text-gray-500" />
            <span className="text-[9px] text-gray-500 uppercase">Sessions</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-gray-200">{activeSessions}</span>
            <span className="text-[10px] text-gray-500">/ {maxSessions}</span>
          </div>
        </div>

        {/* Latency */}
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-gray-500" />
            <span className="text-[9px] text-gray-500 uppercase">Latency</span>
          </div>
          <span className={`text-sm font-bold ${latencyMs === null ? 'text-gray-500' : latencyMs > 200 ? 'text-amber-400' : 'text-gray-200'}`}>
            {latencyMs !== null ? `${latencyMs}ms` : '--'}
          </span>
        </div>

        {/* Utilization */}
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <HardDrive className="w-3 h-3 text-gray-500" />
            <span className="text-[9px] text-gray-500 uppercase">Load</span>
          </div>
          <span className={`text-sm font-bold ${utilizationPercent >= 75 ? 'text-amber-400' : 'text-gray-200'}`}>
            {utilizationPercent}%
          </span>
        </div>
      </div>

      {/* Health History Sparkline */}
      {healthHistory && healthHistory.length > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
          <span className="text-[9px] text-gray-500 uppercase">Trend</span>
          <HealthSparkline history={healthHistory} />
        </div>
      )}

      {/* Status indicators */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-700/50 mt-2">
        <div className="flex items-center gap-2">
          {status === 'online' && (
            <div className="flex items-center gap-1 text-[10px] text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span>Healthy</span>
            </div>
          )}
          {status === 'busy' && (
            <div className="flex items-center gap-1 text-[10px] text-amber-400">
              <Play className="w-3 h-3" />
              <span>Working</span>
            </div>
          )}
          {status === 'offline' && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <XCircle className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {onAction && status !== 'offline' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAction('stop')}
              className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
              title="Stop sessions"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
