'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { ComparisonFilterState } from '../lib/types';
import { fetchExecutiveInsights } from '../lib/statsApi';
import {
  ExecutiveInsightReport,
  ExecutiveInsight,
  SpecialistRanking,
  ScanTypeRecommendation,
  InsightSeverity,
  InsightCategory,
} from '../lib/executiveInsightTypes';
import { SCAN_TYPE_CONFIG } from '../lib/config';

interface ExecutiveSummaryProps {
  filters: ComparisonFilterState;
}

const severityColors: Record<InsightSeverity, { bg: string; border: string; text: string; icon: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', icon: 'text-red-500' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-400', icon: 'text-orange-500' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', icon: 'text-yellow-500' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400', icon: 'text-blue-500' },
  info: { bg: 'bg-green-500/10', border: 'border-green-500/40', text: 'text-green-400', icon: 'text-green-500' },
};

const categoryIcons: Record<InsightCategory, React.ComponentType<{ className?: string }>> = {
  performance: BarChart3,
  trend: TrendingUp,
  recommendation: Lightbulb,
  anomaly: AlertTriangle,
  opportunity: Sparkles,
};

function InsightCard({ insight }: { insight: ExecutiveInsight }) {
  const colors = severityColors[insight.severity];
  const CategoryIcon = categoryIcons[insight.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${colors.bg} border ${colors.border} rounded-lg p-4 backdrop-blur-sm`}
      data-testid={`insight-card-${insight.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 bg-gray-900/60 rounded-lg border ${colors.border} flex-shrink-0`}>
          <CategoryIcon className={`w-4 h-4 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${colors.text} mb-1`}>{insight.title}</h4>
          <p className="text-xs text-gray-400 leading-relaxed">{insight.description}</p>

          {insight.metric && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">{insight.metric.label}:</span>
              <span className={`text-sm font-mono font-semibold ${colors.text}`}>
                {insight.metric.value}
              </span>
              {insight.metric.trend && (
                <span className="flex items-center">
                  {insight.metric.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : insight.metric.trend === 'down' ? (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  ) : null}
                </span>
              )}
            </div>
          )}

          {insight.recommendation && (
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 italic">
                <Lightbulb className="w-3 h-3 inline mr-1 text-amber-400" />
                {insight.recommendation}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RankingCard({ ranking, index }: { ranking: SpecialistRanking; index: number }) {
  const config = SCAN_TYPE_CONFIG[ranking.scanType];
  const Icon = config?.icon || Target;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-gray-400/40';
    if (rank === 3) return 'bg-amber-600/20 text-amber-500 border-amber-600/40';
    return 'bg-gray-700/40 text-gray-500 border-gray-600/40';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-3 p-3 bg-gradient-to-br ${config?.bgGradient || 'from-gray-500/5 to-gray-600/2'} border ${config?.borderColor || 'border-gray-500/40'} rounded-lg`}
      data-testid={`ranking-card-${ranking.scanType}`}
    >
      <div className={`w-8 h-8 flex items-center justify-center rounded-full border ${getRankBadge(ranking.rank)} text-sm font-bold`}>
        {ranking.rank}
      </div>
      <div className={`p-2 bg-gray-900/60 rounded-lg border ${config?.borderColor || 'border-gray-500/40'}`}>
        <Icon className={`w-4 h-4 ${config?.color || 'text-gray-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h5 className={`text-sm font-semibold ${config?.color || 'text-gray-400'} truncate`}>
          {config?.label || ranking.scanType}
        </h5>
        <p className="text-xs text-gray-500 truncate">
          {ranking.acceptanceRatio}% acceptance • {ranking.totalIdeas} ideas
        </p>
      </div>
      <div className="text-right">
        <div className={`text-lg font-mono font-bold ${config?.color || 'text-gray-400'}`}>
          {Math.round(ranking.score)}
        </div>
        <div className="text-xs text-gray-500">score</div>
      </div>
    </motion.div>
  );
}

function RecommendationCard({ recommendation, index }: { recommendation: ScanTypeRecommendation; index: number }) {
  const config = SCAN_TYPE_CONFIG[recommendation.scanType];
  const Icon = config?.icon || Target;

  const priorityColors: Record<1 | 2 | 3, string> = {
    1: 'bg-green-500/20 text-green-400 border-green-500/40',
    2: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    3: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  };

  const priorityLabels: Record<1 | 2 | 3, string> = {
    1: 'High Priority',
    2: 'Medium Priority',
    3: 'Explore',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-gradient-to-br from-purple-500/5 to-purple-600/2 border border-purple-500/30 rounded-lg p-4 backdrop-blur-sm"
      data-testid={`recommendation-card-${recommendation.scanType}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 bg-gray-900/60 rounded-lg border ${config?.borderColor || 'border-gray-500/40'}`}>
          <Icon className={`w-4 h-4 ${config?.color || 'text-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h5 className={`text-sm font-semibold ${config?.color || 'text-gray-400'}`}>
              {config?.label || recommendation.scanType}
            </h5>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[recommendation.priority]}`}>
              {priorityLabels[recommendation.priority]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-2">{recommendation.reason}</p>
          <div className="flex items-center gap-1 text-xs text-purple-400">
            <ArrowRight className="w-3 h-3" />
            <span>{recommendation.expectedImpact}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ExecutiveSummary({ filters }: ExecutiveSummaryProps) {
  const [report, setReport] = useState<ExecutiveInsightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    narrative: true,
    insights: true,
    rankings: false,
    recommendations: false,
  });

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchExecutiveInsights({
        projectId: filters.projectId,
        contextId: filters.contextId,
        timeWindow: filters.timeWindow,
        startDate: filters.dateRange?.startDate,
        endDate: filters.dateRange?.endDate,
      });
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="executive-summary-loading">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400 mr-3" />
        <span className="text-gray-400">Generating executive insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12" data-testid="executive-summary-error">
        <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
        <span className="text-red-400 mb-4">{error}</span>
        <button
          onClick={loadInsights}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
          data-testid="executive-summary-retry-btn"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="executive-summary">
      {/* Narrative Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-indigo-500/5 to-purple-600/5 border border-indigo-500/30 rounded-lg overflow-hidden"
      >
        <button
          onClick={() => toggleSection('narrative')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors"
          data-testid="executive-summary-narrative-toggle"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900/60 rounded-lg border border-indigo-500/40">
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-indigo-300">Executive Summary</h3>
              <p className="text-sm text-indigo-400/70">{report.narrative.headline}</p>
            </div>
          </div>
          {expandedSections.narrative ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.narrative && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                <p className="text-gray-300 leading-relaxed">{report.narrative.overview}</p>

                {report.narrative.keyFindings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Key Findings</h4>
                    <ul className="space-y-1">
                      {report.narrative.keyFindings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-700/50">
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Outlook</h4>
                  <p className="text-sm text-gray-500 italic">{report.narrative.outlook}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Actionable Insights Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden"
      >
        <button
          onClick={() => toggleSection('insights')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors"
          data-testid="executive-summary-insights-toggle"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900/60 rounded-lg border border-amber-500/40">
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-200">Actionable Insights</h3>
              <p className="text-sm text-gray-500">{report.insights.length} insights identified</p>
            </div>
          </div>
          {expandedSections.insights ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.insights && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 grid gap-3">
                {report.insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Specialist Rankings Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden"
      >
        <button
          onClick={() => toggleSection('rankings')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors"
          data-testid="executive-summary-rankings-toggle"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900/60 rounded-lg border border-cyan-500/40">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-200">Specialist Rankings</h3>
              <p className="text-sm text-gray-500">
                {report.specialistRankings.length} specialists ranked by performance
              </p>
            </div>
          </div>
          {expandedSections.rankings ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.rankings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2">
                {report.specialistRankings.slice(0, 10).map((ranking, idx) => (
                  <RankingCard key={ranking.scanType} ranking={ranking} index={idx} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Scan Recommendations Section */}
      {report.scanRecommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => toggleSection('recommendations')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors"
            data-testid="executive-summary-recommendations-toggle"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-900/60 rounded-lg border border-purple-500/40">
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-200">Scan Recommendations</h3>
                <p className="text-sm text-gray-500">
                  Suggested next steps based on current performance
                </p>
              </div>
            </div>
            {expandedSections.recommendations ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.recommendations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {report.scanRecommendations.map((rec, idx) => (
                    <RecommendationCard key={rec.scanType} recommendation={rec} index={idx} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Timestamp Footer */}
      <div className="text-center text-xs text-gray-600">
        Generated {new Date(report.generatedAt).toLocaleString()}
        {report.filterContext.projectName && (
          <span> • Project: {report.filterContext.projectName}</span>
        )}
        {report.filterContext.contextName && (
          <span> • Context: {report.filterContext.contextName}</span>
        )}
      </div>
    </div>
  );
}
