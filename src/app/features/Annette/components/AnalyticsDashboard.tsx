'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getAnalyticsSummary } from '../lib/analyticsService';
import { AnalyticsSummary } from '../lib/voicebotAnalytics';

interface AnalyticsDashboardProps {
  projectId: string;
  isOpen?: boolean;
}

export default function AnalyticsDashboard({ projectId, isOpen = false }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(isOpen);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPanelOpen && projectId) {
      fetchAnalytics();
    }
  }, [isPanelOpen, projectId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalyticsSummary(projectId);
      setAnalytics(data);
    } catch (err) {
      console.error('[Analytics Dashboard] Failed to fetch analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  return (
    <div className="mt-4">
      {/* Toggle Button */}
      <motion.button
        onClick={togglePanel}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700/50 rounded-lg transition-all duration-300"
        data-testid="analytics-toggle-btn"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-mono text-gray-300">Command Analytics</span>
        </div>
        {isPanelOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </motion.button>

      {/* Analytics Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-lg">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full"
                  />
                  <span className="ml-3 text-sm font-mono text-gray-500">Loading analytics...</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-mono text-red-300">{error}</span>
                </div>
              )}

              {!loading && !error && analytics && (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Total Commands */}
                    <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-mono text-gray-500">Total Commands</span>
                      </div>
                      <div className="text-2xl font-bold text-cyan-300">{analytics.totalCommands}</div>
                    </div>

                    {/* Success Rate */}
                    <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs font-mono text-gray-500">Success Rate</span>
                      </div>
                      <div className="text-2xl font-bold text-green-300">
                        {analytics.successRate.toFixed(1)}%
                      </div>
                    </div>

                    {/* Avg Response Time */}
                    <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs font-mono text-gray-500">Avg Time</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-300">
                        {Math.round(analytics.averageExecutionMs)}ms
                      </div>
                    </div>
                  </div>

                  {/* Most Frequent Commands */}
                  {analytics.mostFrequentCommands.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono text-gray-500 uppercase">Most Frequent Commands</h4>
                      <div className="space-y-1.5">
                        {analytics.mostFrequentCommands.slice(0, 5).map((cmd, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-gray-800/30 border border-gray-700/20 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-cyan-400">{cmd.commandName}</span>
                              <span className="text-xs text-gray-600">×{cmd.count}</span>
                            </div>
                            <span className="text-xs font-mono text-gray-500">{Math.round(cmd.averageMs)}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Performance Breakdown */}
                  {analytics.performanceMetrics.avgTotalMs > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono text-gray-500 uppercase">Performance Breakdown</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {analytics.performanceMetrics.avgSttMs > 0 && (
                          <div className="p-2 bg-gray-800/30 border border-gray-700/20 rounded">
                            <div className="text-xs text-gray-600">STT</div>
                            <div className="text-sm font-mono text-gray-300">
                              {Math.round(analytics.performanceMetrics.avgSttMs)}ms
                            </div>
                          </div>
                        )}
                        {analytics.performanceMetrics.avgLlmMs > 0 && (
                          <div className="p-2 bg-gray-800/30 border border-gray-700/20 rounded">
                            <div className="text-xs text-gray-600">LLM</div>
                            <div className="text-sm font-mono text-gray-300">
                              {Math.round(analytics.performanceMetrics.avgLlmMs)}ms
                            </div>
                          </div>
                        )}
                        {analytics.performanceMetrics.avgTtsMs > 0 && (
                          <div className="p-2 bg-gray-800/30 border border-gray-700/20 rounded">
                            <div className="text-xs text-gray-600">TTS</div>
                            <div className="text-sm font-mono text-gray-300">
                              {Math.round(analytics.performanceMetrics.avgTtsMs)}ms
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent Failures */}
                  {analytics.recentFailures.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono text-gray-500 uppercase flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-red-400" />
                        Recent Failures
                      </h4>
                      <div className="space-y-1.5">
                        {analytics.recentFailures.slice(0, 3).map((failure, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-red-500/10 border border-red-500/20 rounded"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-red-300">{failure.commandName}</span>
                              <span className="text-xs text-gray-600">{new Date(failure.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-xs text-red-400/70 mt-1 truncate">{failure.errorMessage}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Refresh Button */}
                  <motion.button
                    onClick={fetchAnalytics}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-mono transition-all duration-300"
                    data-testid="analytics-refresh-btn"
                  >
                    Refresh Analytics
                  </motion.button>
                </div>
              )}

              {!loading && !error && !analytics && (
                <div className="py-8 text-center text-sm font-mono text-gray-500">
                  No analytics data available yet
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
