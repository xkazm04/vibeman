'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  Settings,
  History,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useProjectHealthStore } from '@/stores/projectHealthStore';
import { HealthScoreCategory, CategoryScores } from '@/app/db/models/project-health.types';
import HealthScoreGauge from './HealthScoreGauge';
import CategoryScoreCard from './CategoryScoreCard';
import HealthTrendChart from './HealthTrendChart';
import AIInsightsPanel from './AIInsightsPanel';
import { getStatusColors, formatHealthDate } from '../lib/healthHelpers';

interface ProjectHealthDashboardProps {
  projectId: string;
  projectName?: string;
}

export default function ProjectHealthDashboard({
  projectId,
  projectName,
}: ProjectHealthDashboardProps) {
  const {
    health,
    stats,
    history,
    loading,
    calculating,
    error,
    selectedCategory,
    showHistory,
    aiExplanation,
    aiRecommendation,
    aiFocusArea,
    generatingInsights,
    fetchHealth,
    calculateHealth,
    generateAIInsights,
    setSelectedCategory,
    setShowHistory,
  } = useProjectHealthStore();

  // Fetch health on mount and when project changes
  useEffect(() => {
    if (projectId) {
      fetchHealth(projectId, true);
    }
  }, [projectId, fetchHealth]);

  // Parse category scores
  const categoryScores: CategoryScores | null = health?.category_scores
    ? JSON.parse(health.category_scores)
    : null;

  const categories: HealthScoreCategory[] = [
    'idea_backlog',
    'tech_debt',
    'security',
    'test_coverage',
    'goal_completion',
    'code_quality',
  ];

  const statusColors = health ? getStatusColors(health.status) : null;

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="health-dashboard-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-gray-400">Loading health metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="project-health-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-xl">
            <Activity className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Project Health Score</h1>
            {projectName && (
              <p className="text-sm text-gray-400">{projectName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Last calculated */}
          {health && (
            <span className="text-xs text-gray-500">
              Last updated: {formatHealthDate(health.created_at)}
            </span>
          )}

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              showHistory
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
            }`}
            data-testid="toggle-history-btn"
          >
            <History className="w-4 h-4" />
            History
          </button>

          {/* Calculate button */}
          <button
            onClick={() => calculateHealth(projectId)}
            disabled={calculating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
              bg-gradient-to-r from-emerald-500 to-cyan-500
              hover:from-emerald-600 hover:to-cyan-600
              text-white font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all shadow-lg shadow-cyan-500/20"
            data-testid="calculate-health-btn"
          >
            {calculating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Recalculate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-500/20 border border-red-500/50"
        >
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {/* No data state */}
      {!health && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 rounded-xl border border-white/10 bg-white/5"
        >
          <Activity className="w-16 h-16 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No Health Score Yet</h3>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
            Calculate your first project health score to get insights into your codebase health across multiple dimensions.
          </p>
          <button
            onClick={() => calculateHealth(projectId)}
            disabled={calculating}
            className="flex items-center gap-2 px-6 py-3 rounded-lg
              bg-gradient-to-r from-emerald-500 to-cyan-500
              text-white font-medium
              disabled:opacity-50 transition-all"
            data-testid="initial-calculate-btn"
          >
            <RefreshCw className={`w-5 h-5 ${calculating ? 'animate-spin' : ''}`} />
            Calculate Health Score
          </button>
        </motion.div>
      )}

      {/* Main content */}
      {health && categoryScores && (
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Main score and categories */}
          <div className="col-span-8 space-y-6">
            {/* Score and quick stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-xl border backdrop-blur-sm ${statusColors?.bg} ${statusColors?.border}`}
            >
              <div className="flex items-start gap-8">
                {/* Main gauge */}
                <HealthScoreGauge
                  score={health.overall_score}
                  status={health.status}
                  previousScore={stats?.previousScore}
                  size="xl"
                />

                {/* Quick stats */}
                <div className="flex-1 space-y-4">
                  <h2 className="text-lg font-semibold text-white">Health Overview</h2>

                  {/* Category summary */}
                  <div className="grid grid-cols-3 gap-3">
                    {categories.slice(0, 6).map((category) => {
                      const score = categoryScores[category];
                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedCategory === category
                              ? 'bg-white/10 border-cyan-500/50'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                          data-testid={`quick-category-${category}`}
                        >
                          <div className="text-2xl font-bold text-white">{score.score}</div>
                          <div className="text-xs text-gray-400 truncate">
                            {category.replace('_', ' ')}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Trend summary */}
                  {stats && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">Trend:</span>
                      <span className={stats.trendDirection === 'up' ? 'text-emerald-400' : stats.trendDirection === 'down' ? 'text-red-400' : 'text-gray-400'}>
                        {stats.trendDirection === 'up' ? '↑ Improving' : stats.trendDirection === 'down' ? '↓ Declining' : '→ Stable'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Category cards */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Category Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category, index) => (
                  <CategoryScoreCard
                    key={category}
                    category={category}
                    data={categoryScores[category]}
                    isSelected={selectedCategory === category}
                    isFocusArea={aiFocusArea === category}
                    onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                    delay={index * 0.05}
                  />
                ))}
              </div>
            </div>

            {/* History chart */}
            <AnimatePresence>
              {showHistory && stats?.historyData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 rounded-xl border border-white/10 bg-white/5">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                      Health Score Trend
                    </h3>
                    <HealthTrendChart data={stats.historyData} height={250} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right column - AI insights */}
          <div className="col-span-4 space-y-6">
            <AIInsightsPanel
              explanation={aiExplanation}
              recommendation={aiRecommendation}
              focusArea={aiFocusArea}
              isGenerating={generatingInsights}
              onGenerate={() => generateAIInsights(projectId)}
              onFocusAreaClick={setSelectedCategory}
            />

            {/* Top issue highlight */}
            {stats?.topIssue && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-400 mb-1">
                      Needs Attention
                    </h4>
                    <p className="text-xs text-gray-400 mb-2">
                      {stats.topIssue.category.replace('_', ' ')} score: {stats.topIssue.score}/100
                    </p>
                    <p className="text-sm text-gray-300">
                      {stats.topIssue.recommendation}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
