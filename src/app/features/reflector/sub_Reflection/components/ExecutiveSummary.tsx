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
  Bot,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
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
} from '../lib/RuleBasedInsightTypes';
import { SCAN_TYPE_CONFIG } from '../lib/config';
import { useReflectorStore } from '@/stores/reflectorStore';
import { ExecutiveAnalysisTrigger } from './ExecutiveAnalysisTrigger';
import { ExecutiveAnalysisTerminal } from './ExecutiveAnalysisTerminal';
import type { ExecutiveAIInsight } from '@/app/db/models/reflector.types';
import AnalyticsStudio from './analytics/AnalyticsStudio';

interface ExecutiveSummaryProps {
  filters: ComparisonFilterState;
}

type TabId = 'narrative' | 'insights' | 'rankings' | 'recommendations' | 'ai_analysis' | 'studio';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
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

const TAB_CONFIG: TabConfig[] = [
  { id: 'narrative', label: 'Summary', icon: FileText, color: 'text-indigo-400', borderColor: 'border-indigo-500/40' },
  { id: 'insights', label: 'Insights', icon: Lightbulb, color: 'text-amber-400', borderColor: 'border-amber-500/40' },
  { id: 'rankings', label: 'Rankings', icon: BarChart3, color: 'text-cyan-400', borderColor: 'border-cyan-500/40' },
  { id: 'recommendations', label: 'Actions', icon: Target, color: 'text-purple-400', borderColor: 'border-purple-500/40' },
  { id: 'ai_analysis', label: 'AI Analysis', icon: Bot, color: 'text-emerald-400', borderColor: 'border-emerald-500/40' },
  { id: 'studio', label: 'Studio', icon: LayoutDashboard, color: 'text-pink-400', borderColor: 'border-pink-500/40' },
];

function NarrativeContent({ report }: { report: ExecutiveInsightReport }) {
  return (
    <div className="space-y-4" data-testid="executive-summary-narrative-content">
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
  );
}

function InsightsContent({ report }: { report: ExecutiveInsightReport }) {
  return (
    <div className="grid gap-3" data-testid="executive-summary-insights-content">
      {report.insights.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No insights available for the current filters.</p>
      ) : (
        report.insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))
      )}
    </div>
  );
}

function RankingsContent({ report }: { report: ExecutiveInsightReport }) {
  return (
    <div className="space-y-2" data-testid="executive-summary-rankings-content">
      {report.specialistRankings.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No specialist rankings available.</p>
      ) : (
        report.specialistRankings.slice(0, 10).map((ranking, idx) => (
          <RankingCard key={ranking.scanType} ranking={ranking} index={idx} />
        ))
      )}
    </div>
  );
}

function RecommendationsContent({ report }: { report: ExecutiveInsightReport }) {
  return (
    <div className="space-y-3" data-testid="executive-summary-recommendations-content">
      {report.scanRecommendations.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No recommendations available for the current filters.</p>
      ) : (
        report.scanRecommendations.map((rec, idx) => (
          <RecommendationCard key={rec.scanType} recommendation={rec} index={idx} />
        ))
      )}
    </div>
  );
}

// AI Insight type colors
const aiInsightTypeColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  pattern: { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400', icon: 'text-blue-500' },
  anomaly: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', icon: 'text-red-500' },
  opportunity: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', icon: 'text-emerald-500' },
  warning: { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-400', icon: 'text-orange-500' },
  recommendation: { bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-400', icon: 'text-purple-500' },
};

function AIInsightCard({ insight, index }: { insight: ExecutiveAIInsight; index: number }) {
  const colors = aiInsightTypeColors[insight.type] || aiInsightTypeColors.pattern;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`${colors.bg} border ${colors.border} rounded-lg p-4 backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 bg-gray-900/60 rounded-lg border ${colors.border} flex-shrink-0`}>
          {insight.actionable ? (
            <CheckCircle2 className={`w-4 h-4 ${colors.icon}`} />
          ) : (
            <Lightbulb className={`w-4 h-4 ${colors.icon}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm font-semibold ${colors.text}`}>{insight.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} border ${colors.border} ${colors.text}`}>
              {insight.type}
            </span>
            <span className="text-xs text-gray-500 ml-auto">
              {insight.confidence}% confidence
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">{insight.description}</p>

          {insight.evidence.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 mb-1">Evidence:</p>
              <ul className="space-y-0.5">
                {insight.evidence.slice(0, 3).map((ev, idx) => (
                  <li key={idx} className="text-xs text-gray-500 flex items-start gap-1">
                    <span className={colors.text}>•</span>
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insight.suggestedAction && (
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <p className="text-xs text-gray-400">
                <ArrowRight className="w-3 h-3 inline mr-1 text-emerald-400" />
                {insight.suggestedAction}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface AIAnalysisContentProps {
  aiInsights: ExecutiveAIInsight[];
  aiNarrative: string | null;
  aiRecommendations: string[];
  lastAnalysisDate: string | null;
}

function AIAnalysisContent({ aiInsights, aiNarrative, aiRecommendations, lastAnalysisDate }: AIAnalysisContentProps) {
  const hasContent = aiInsights.length > 0 || aiNarrative || aiRecommendations.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-8">
        <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-2">No AI analysis results yet</p>
        <p className="text-xs text-gray-600">
          Click "AI Deep Analysis" to run Claude Code analysis on your ideas and directions data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="ai-analysis-content">
      {lastAnalysisDate && (
        <div className="text-xs text-gray-500 mb-2">
          Last analysis: {new Date(lastAnalysisDate).toLocaleString()}
        </div>
      )}

      {aiNarrative && (
        <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Analysis Summary
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed">{aiNarrative}</p>
        </div>
      )}

      {aiInsights.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-3">
            AI-Generated Insights ({aiInsights.length})
          </h4>
          <div className="space-y-3">
            {aiInsights.map((insight, idx) => (
              <AIInsightCard key={`${insight.type}-${idx}`} insight={insight} index={idx} />
            ))}
          </div>
        </div>
      )}

      {aiRecommendations.length > 0 && (
        <div className="bg-purple-500/5 border border-purple-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-400 mb-2">AI Recommendations</h4>
          <ul className="space-y-2">
            {aiRecommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ExecutiveSummary({ filters }: ExecutiveSummaryProps) {
  const [report, setReport] = useState<ExecutiveInsightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('narrative');

  // AI Analysis state from store
  const {
    analysisStatus,
    runningAnalysisId,
    promptContent,
    lastAnalysis,
    aiInsights,
    aiNarrative,
    aiRecommendations,
    fetchAnalysisStatus,
  } = useReflectorStore();

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

  // Fetch AI analysis status on mount and when filters change
  useEffect(() => {
    fetchAnalysisStatus(filters.projectId);
  }, [filters.projectId, fetchAnalysisStatus]);

  // Poll for status when analysis is running
  useEffect(() => {
    if (analysisStatus !== 'running') return;

    const interval = setInterval(() => {
      fetchAnalysisStatus(filters.projectId);
    }, 5000);

    return () => clearInterval(interval);
  }, [analysisStatus, filters.projectId, fetchAnalysisStatus]);

  // Refresh status callback for terminal
  const handleStatusRefresh = useCallback(() => {
    fetchAnalysisStatus(filters.projectId);
  }, [filters.projectId, fetchAnalysisStatus]);

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

  // Get available tabs (filter out recommendations if empty)
  const availableTabs = TAB_CONFIG.filter(
    (tab) => tab.id !== 'recommendations' || report.scanRecommendations.length > 0
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'narrative':
        return <NarrativeContent report={report} />;
      case 'insights':
        return <InsightsContent report={report} />;
      case 'rankings':
        return <RankingsContent report={report} />;
      case 'recommendations':
        return <RecommendationsContent report={report} />;
      case 'ai_analysis':
        return (
          <AIAnalysisContent
            aiInsights={aiInsights}
            aiNarrative={aiNarrative}
            aiRecommendations={aiRecommendations}
            lastAnalysisDate={lastAnalysis?.completed_at || null}
          />
        );
      case 'studio':
        return (
          <AnalyticsStudio
            aiInsights={aiInsights}
            report={report}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4" data-testid="executive-summary">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-indigo-500/5 to-purple-600/5 border border-indigo-500/30 rounded-lg overflow-hidden"
      >
        {/* Header with expand/collapse */}
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 hover:bg-gray-800/30 transition-colors rounded-lg -m-2 p-2 flex-1"
            data-testid="executive-summary-toggle"
          >
            <div className="p-2 bg-gray-900/60 rounded-lg border border-indigo-500/40">
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-indigo-300">Executive Summary</h3>
              <p className="text-sm text-indigo-400/70">{report.narrative.headline}</p>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400 ml-auto" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 ml-auto" />
            )}
          </button>

          {/* AI Analysis Trigger */}
          <div className="ml-4">
            <ExecutiveAnalysisTrigger
              filters={filters}
              projectName={report.filterContext.projectName ?? undefined}
              projectPath={undefined}
              onAnalysisStart={() => setActiveTab('ai_analysis')}
            />
          </div>
        </div>

        {/* Analysis Terminal */}
        {analysisStatus === 'running' && promptContent && (
          <ExecutiveAnalysisTerminal
            analysisStatus={analysisStatus}
            promptContent={promptContent}
            runningAnalysisId={runningAnalysisId}
            projectPath={process.cwd()}
            projectId={filters.projectId || 'reflector'}
            projectName={report.filterContext.projectName || 'Reflector'}
            onStatusRefresh={handleStatusRefresh}
          />
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {/* Tab Navigation */}
              <div className="px-4 border-b border-gray-700/50">
                <div className="flex gap-1 -mb-px" data-testid="executive-summary-tabs">
                  {availableTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                          isActive
                            ? `${tab.color} bg-gray-800/50 border-t border-x ${tab.borderColor}`
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                        }`}
                        data-testid={`executive-summary-tab-${tab.id}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                        {tab.id === 'insights' && report.insights.length > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-amber-500/20' : 'bg-gray-700/50'}`}>
                            {report.insights.length}
                          </span>
                        )}
                        {tab.id === 'rankings' && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-cyan-500/20' : 'bg-gray-700/50'}`}>
                            {report.specialistRankings.length}
                          </span>
                        )}
                        {tab.id === 'ai_analysis' && (
                          <>
                            {analysisStatus === 'running' ? (
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                            ) : aiInsights.length > 0 ? (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/20' : 'bg-gray-700/50'}`}>
                                {aiInsights.length}
                              </span>
                            ) : null}
                          </>
                        )}
                        {tab.id === 'studio' && (aiInsights.length > 0 || report.specialistRankings.length > 0) && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-pink-500/20' : 'bg-gray-700/50'}`}>
                            {aiInsights.length + report.specialistRankings.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {renderTabContent()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Timestamp Footer */}
              <div className="px-4 pb-3 text-xs text-gray-600 border-t border-gray-700/30 pt-3">
                Generated {new Date(report.generatedAt).toLocaleString()}
                {report.filterContext.projectName && (
                  <span> • Project: {report.filterContext.projectName}</span>
                )}
                {report.filterContext.contextName && (
                  <span> • Context: {report.filterContext.contextName}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
