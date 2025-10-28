/**
 * Polling Dashboard Component
 * Visualizes all active pollers in development mode with real-time metrics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { PollerMetadata } from './types';

interface PollingDashboardProps {
  /** Whether to show the dashboard (typically only in development) */
  enabled?: boolean;
  /** Initial minimized state */
  initiallyMinimized?: boolean;
}

/**
 * Global poller registry for dashboard tracking
 */
class PollerRegistry {
  private static instance: PollerRegistry;
  private pollers: Map<string, PollerMetadata> = new Map();
  private listeners: Set<() => void> = new Set();

  static getInstance(): PollerRegistry {
    if (!PollerRegistry.instance) {
      PollerRegistry.instance = new PollerRegistry();
    }
    return PollerRegistry.instance;
  }

  register(poller: PollerMetadata): void {
    this.pollers.set(poller.id, poller);
    this.notify();
  }

  update(id: string, updates: Partial<PollerMetadata>): void {
    const existing = this.pollers.get(id);
    if (existing) {
      this.pollers.set(id, { ...existing, ...updates });
      this.notify();
    }
  }

  unregister(id: string): void {
    this.pollers.delete(id);
    this.notify();
  }

  getAll(): PollerMetadata[] {
    return Array.from(this.pollers.values());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Export registry for use in hooks
export const pollerRegistry = PollerRegistry.getInstance();

/**
 * Sparkline chart component for visualizing latency/success trends
 */
function Sparkline({
  data,
  width = 60,
  height = 20,
  color = '#10b981',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Individual poller card component
 */
function PollerCard({ poller }: { poller: PollerMetadata }) {
  const successRate = poller.stats.totalPolls > 0
    ? (poller.stats.successfulPolls / poller.stats.totalPolls) * 100
    : 0;

  const getStatusColor = () => {
    if (!poller.isActive) return 'text-gray-400';
    if (successRate >= 90) return 'text-green-400';
    if (successRate >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTypeIcon = () => {
    switch (poller.type) {
      case 'log-refresh':
        return <Activity className="w-3 h-3" />;
      case 'status-check':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'health-monitor':
        return <Zap className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  // Generate sparkline data from stats
  const latencyHistory = Array(20).fill(poller.stats.averageLatency);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={getStatusColor()}>
            {getTypeIcon()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-200 truncate max-w-[150px]">
              {poller.name}
            </div>
            <div className="text-[10px] text-gray-500 capitalize">
              {poller.type.replace('-', ' ')}
            </div>
          </div>
        </div>
        <div className={`text-sm ${poller.isActive ? 'text-green-400' : 'text-gray-500'}`}>
          {poller.isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div className="text-[10px] text-gray-500">Success Rate</div>
          <div className={`text-sm font-mono ${getStatusColor()}`}>
            {successRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500">Avg Latency</div>
          <div className="text-sm font-mono text-gray-300">
            {poller.stats.averageLatency.toFixed(0)}ms
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-gray-500">
          {poller.stats.totalPolls} polls
        </div>
        <Sparkline
          data={latencyHistory}
          width={60}
          height={16}
          color={successRate >= 90 ? '#10b981' : successRate >= 70 ? '#f59e0b' : '#ef4444'}
        />
      </div>

      {/* Interval indicator */}
      <div className="mt-2 pt-2 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">Interval</span>
          <span className="text-gray-400 font-mono">
            {(poller.config.interval / 1000).toFixed(1)}s
          </span>
        </div>
        {poller.config.adaptive?.enabled && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-400">
            {poller.stats.consecutiveSuccesses > poller.stats.consecutiveFailures ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>Adaptive</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Main Polling Dashboard Component
 */
export default function PollingDashboard({
  enabled = process.env.NODE_ENV === 'development',
  initiallyMinimized = false,
}: PollingDashboardProps) {
  const [pollers, setPollers] = useState<PollerMetadata[]>([]);
  const [isMinimized, setIsMinimized] = useState(initiallyMinimized);
  const [isVisible, setIsVisible] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;

    const registry = PollerRegistry.getInstance();

    // Initial load
    setPollers(registry.getAll());

    // Subscribe to changes
    const unsubscribe = registry.subscribe(() => {
      setPollers(registry.getAll());
    });

    return unsubscribe;
  }, [enabled]);

  if (!isVisible) return null;

  const activePollers = pollers.filter(p => p.isActive);
  const totalPolls = pollers.reduce((sum, p) => sum + p.stats.totalPolls, 0);
  const totalSuccess = pollers.reduce((sum, p) => sum + p.stats.successfulPolls, 0);
  const overallSuccessRate = totalPolls > 0 ? (totalSuccess / totalPolls) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-[9999] pointer-events-auto"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800/80 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-200">
              Polling Dashboard
            </span>
            {activePollers.length > 0 && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-sm">
                {activePollers.length} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="w-3 h-3 text-gray-400" />
              ) : (
                <Minimize2 className="w-3 h-3 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Close"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              {/* Summary Stats */}
              {pollers.length > 0 && (
                <div className="bg-gray-800/30 px-3 py-2 border-b border-gray-700/50">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-[10px] text-gray-500 mb-1">Total Pollers</div>
                      <div className="text-lg font-mono text-gray-200">
                        {pollers.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 mb-1">Success Rate</div>
                      <div className={`text-lg font-mono ${
                        overallSuccessRate >= 90 ? 'text-green-400' :
                        overallSuccessRate >= 70 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {overallSuccessRate.toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 mb-1">Total Polls</div>
                      <div className="text-lg font-mono text-gray-200">
                        {totalPolls}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Poller List */}
              <div className="p-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                {pollers.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-500">No active pollers</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Pollers will appear here when you use usePollingTask
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <AnimatePresence mode="popLayout">
                      {pollers.map(poller => (
                        <PollerCard key={poller.id} poller={poller} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
        }
      `}</style>
    </motion.div>
  );
}

/**
 * Hook to register a poller with the dashboard
 */
export function usePollerDashboard(
  id: string,
  name: string,
  type: PollerMetadata['type'],
  config: PollerMetadata['config'],
  stats: PollerMetadata['stats'],
  isActive: boolean
) {
  useEffect(() => {
    const registry = PollerRegistry.getInstance();

    // Register on mount
    registry.register({
      id,
      name,
      type,
      config,
      stats,
      isActive,
      createdAt: Date.now(),
    });

    // Cleanup on unmount
    return () => {
      registry.unregister(id);
    };
  }, [id, name, type]);

  // Update on changes
  useEffect(() => {
    const registry = PollerRegistry.getInstance();
    registry.update(id, { config, stats, isActive });
  }, [id, config, stats, isActive]);
}
