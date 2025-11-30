'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  Target,
  Activity,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface LearningMetrics {
  totalExecutions: number;
  successRate: number;
  effortAccuracy: number;
  impactAccuracy: number;
  avgExecutionTime: number;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    successRate: number;
    avgEffortDelta: number;
    avgImpactDelta: number;
  }>;
}

interface ScoringWeight {
  id: string;
  category: string;
  scan_type: string;
  effort_accuracy_weight: number;
  impact_accuracy_weight: number;
  success_rate_weight: number;
  execution_time_factor: number;
  sample_count: number;
  last_calibrated_at: string;
}

interface ScoringThreshold {
  id: string;
  type: string;
  minScore: number | null;
  maxScore: number | null;
  minConfidence: number | null;
  enabled: boolean;
}

interface AdaptiveConfig {
  weights: ScoringWeight[];
  thresholds: ScoringThreshold[];
}

interface AdaptiveLearningDashboardProps {
  projectId: string;
}

export default function AdaptiveLearningDashboard({
  projectId,
}: AdaptiveLearningDashboardProps) {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [config, setConfig] = useState<AdaptiveConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'weights' | 'thresholds'>('overview');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [metricsRes, configRes] = await Promise.all([
        fetch(`/api/ideas/adaptive-learning?projectId=${projectId}&type=metrics`),
        fetch(`/api/ideas/adaptive-learning?projectId=${projectId}&type=config`),
      ]);

      if (!metricsRes.ok || !configRes.ok) {
        throw new Error('Failed to fetch adaptive learning data');
      }

      const metricsData = await metricsRes.json();
      const configData = await configRes.json();

      setMetrics(metricsData.metrics);
      setConfig(configData.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleThresholdToggle = async (thresholdId: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/ideas/adaptive-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-threshold',
          thresholdId,
          enabled,
        }),
      });

      if (res.ok) {
        fetchData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to update threshold:', err);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

  const getStatusColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-400';
    if (rate >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getThresholdIcon = (type: string) => {
    switch (type) {
      case 'auto_accept':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'auto_reject':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'priority_boost':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="learning-dashboard-loading">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
        <span className="ml-2 text-gray-400">Loading learning data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-lg" data-testid="learning-dashboard-error">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
          data-testid="learning-dashboard-retry-btn"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden" data-testid="learning-dashboard">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">Adaptive Learning</h3>
        </div>
        <button
          onClick={fetchData}
          className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
          title="Refresh data"
          data-testid="learning-dashboard-refresh-btn"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700/40">
        {(['overview', 'weights', 'thresholds'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
            data-testid={`learning-tab-${tab}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && metrics && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/40 rounded-lg p-3" data-testid="stat-executions">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Executions</span>
                  </div>
                  <div className="text-xl font-bold text-white">{metrics.totalExecutions}</div>
                </div>

                <div className="bg-gray-800/40 rounded-lg p-3" data-testid="stat-success-rate">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <Target className="w-3.5 h-3.5" />
                    <span>Success Rate</span>
                  </div>
                  <div className={`text-xl font-bold ${getStatusColor(metrics.successRate)}`}>
                    {formatPercentage(metrics.successRate)}
                  </div>
                </div>

                <div className="bg-gray-800/40 rounded-lg p-3" data-testid="stat-effort-accuracy">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Effort Accuracy</span>
                  </div>
                  <div className={`text-xl font-bold ${getStatusColor(metrics.effortAccuracy)}`}>
                    {formatPercentage(metrics.effortAccuracy)}
                  </div>
                </div>

                <div className="bg-gray-800/40 rounded-lg p-3" data-testid="stat-impact-accuracy">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Impact Accuracy</span>
                  </div>
                  <div className={`text-xl font-bold ${getStatusColor(metrics.impactAccuracy)}`}>
                    {formatPercentage(metrics.impactAccuracy)}
                  </div>
                </div>
              </div>

              {/* Avg Execution Time */}
              <div className="bg-gray-800/40 rounded-lg p-3" data-testid="stat-avg-time">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Avg Execution Time</span>
                  <span className="text-white font-medium">{formatTime(metrics.avgExecutionTime)}</span>
                </div>
              </div>

              {/* Category Breakdown */}
              {metrics.categoryBreakdown.length > 0 && (
                <div className="space-y-2" data-testid="category-breakdown">
                  <div className="text-xs font-medium text-gray-400 mb-2">Category Performance</div>
                  {metrics.categoryBreakdown.map((cat) => (
                    <div key={cat.category}>
                      <button
                        onClick={() => setExpandedCategory(
                          expandedCategory === cat.category ? null : cat.category
                        )}
                        className="w-full flex items-center justify-between p-2 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors"
                        data-testid={`category-${cat.category}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-200 capitalize">{cat.category}</span>
                          <span className="text-xs text-gray-500">({cat.count})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getStatusColor(cat.successRate)}`}>
                            {formatPercentage(cat.successRate)}
                          </span>
                          {expandedCategory === cat.category ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedCategory === cat.category && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 py-2 text-xs space-y-1 bg-gray-900/50 rounded-b-lg">
                              <div className="flex justify-between text-gray-400">
                                <span>Effort Delta</span>
                                <span className={cat.avgEffortDelta > 0 ? 'text-red-400' : 'text-green-400'}>
                                  {cat.avgEffortDelta > 0 ? '+' : ''}{cat.avgEffortDelta.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-gray-400">
                                <span>Impact Delta</span>
                                <span className={cat.avgImpactDelta < 0 ? 'text-red-400' : 'text-green-400'}>
                                  {cat.avgImpactDelta > 0 ? '+' : ''}{cat.avgImpactDelta.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'weights' && config && (
            <motion.div
              key="weights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {config.weights.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4" data-testid="no-weights">
                  No learned weights yet. Execute some ideas to start learning!
                </p>
              ) : (
                config.weights.map((weight) => (
                  <div
                    key={weight.id}
                    className="bg-gray-800/40 rounded-lg p-3 space-y-2"
                    data-testid={`weight-${weight.category}-${weight.scan_type}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-200 capitalize">
                        {weight.category === 'default' ? 'Default' : weight.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {weight.sample_count} samples
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>Effort Weight</span>
                        <span className="text-white">{weight.effort_accuracy_weight.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Impact Weight</span>
                        <span className="text-white">{weight.impact_accuracy_weight.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Success Weight</span>
                        <span className="text-white">{weight.success_rate_weight.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Time Factor</span>
                        <span className="text-white">{weight.execution_time_factor.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 pt-1 border-t border-gray-700/40">
                      Last calibrated: {new Date(weight.last_calibrated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'thresholds' && config && (
            <motion.div
              key="thresholds"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {config.thresholds.map((threshold) => (
                <div
                  key={threshold.id}
                  className={`bg-gray-800/40 rounded-lg p-3 ${
                    threshold.enabled ? 'border border-purple-500/30' : ''
                  }`}
                  data-testid={`threshold-${threshold.type}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getThresholdIcon(threshold.type)}
                      <span className="text-sm font-medium text-gray-200 capitalize">
                        {threshold.type.replace('_', ' ')}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={threshold.enabled}
                        onChange={(e) => handleThresholdToggle(threshold.id, e.target.checked)}
                        data-testid={`threshold-toggle-${threshold.type}`}
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-gray-400">
                      <span className="block text-gray-500">Min Score</span>
                      {threshold.minScore !== null ? threshold.minScore : '-'}
                    </div>
                    <div className="text-gray-400">
                      <span className="block text-gray-500">Max Score</span>
                      {threshold.maxScore !== null ? threshold.maxScore : '-'}
                    </div>
                    <div className="text-gray-400">
                      <span className="block text-gray-500">Min Confidence</span>
                      {threshold.minConfidence !== null ? `${threshold.minConfidence}%` : '-'}
                    </div>
                  </div>
                </div>
              ))}

              <p className="text-xs text-gray-500 mt-2">
                <Settings className="w-3 h-3 inline-block mr-1" />
                Thresholds control automatic actions based on adaptive scores
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
