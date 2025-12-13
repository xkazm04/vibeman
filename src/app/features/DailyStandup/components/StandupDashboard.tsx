'use client';

import React, { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useStandupStore } from '@/stores/standupStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { UniversalSelect } from '@/components/ui/UniversalSelect';
import { getDateRangeInfo } from '../lib/types';
import StandupSummaryCard from './StandupSummaryCard';
import StandupStatsRow from './StandupStatsRow';
import StandupBlockersHighlights from './StandupBlockersHighlights';
import StandupHistory from './StandupHistory';

export default function StandupDashboard() {
  const {
    currentSummary,
    filters,
    isLoading,
    isGenerating,
    error,
    setProjectId,
    setPeriodType,
    navigatePreviousPeriod,
    navigateNextPeriod,
    navigateToCurrentPeriod,
    loadSummary,
    generateSummary,
    loadHistory,
  } = useStandupStore();

  const { projects, initializeProjects } = useProjectConfigStore();
  const { activeProject } = useActiveProjectStore();

  // Get current date range info
  const dateRange = getDateRangeInfo(filters.periodType, filters.dateOffset);

  // Initialize projects
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Set project from active project if not set
  useEffect(() => {
    if (!filters.projectId && activeProject) {
      setProjectId(activeProject.id);
    }
  }, [activeProject, filters.projectId, setProjectId]);

  // Load summary and history when filters change
  useEffect(() => {
    if (filters.projectId) {
      loadSummary();
      loadHistory();
    }
  }, [filters.projectId, filters.periodType, filters.dateOffset, loadSummary, loadHistory]);

  const handleGenerate = useCallback(
    (forceRegenerate: boolean = false) => {
      generateSummary(forceRegenerate);
    },
    [generateSummary]
  );

  const handleRefresh = useCallback(() => {
    loadSummary();
  }, [loadSummary]);

  if (isLoading && !currentSummary) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="standup-loading">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mr-3" />
        <span className="text-gray-400">Loading standup summary...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="standup-dashboard">
      {/* Header with Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        {/* Period Navigator */}
        <div className="flex items-center gap-3">
          <button
            onClick={navigatePreviousPeriod}
            className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
            aria-label="Previous period"
            data-testid="standup-prev-period-btn"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900/30 border border-blue-500/40">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 font-medium">{dateRange.label}</span>
            {!dateRange.isToday && !dateRange.isCurrentWeek && (
              <span className="text-gray-500 text-sm">
                ({dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {filters.periodType === 'weekly' &&
                  ` - ${dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                )
              </span>
            )}
          </div>

          <button
            onClick={navigateNextPeriod}
            disabled={filters.dateOffset >= 0}
            className={`p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 transition-colors ${
              filters.dateOffset >= 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
            }`}
            aria-label="Next period"
            data-testid="standup-next-period-btn"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {filters.dateOffset !== 0 && (
            <button
              onClick={navigateToCurrentPeriod}
              className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition-colors"
              data-testid="standup-current-period-btn"
            >
              {filters.periodType === 'daily' ? 'Today' : 'This Week'}
            </button>
          )}
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-3">
          {/* Period Type Toggle */}
          <div className="flex rounded-lg bg-gray-800/60 border border-gray-700/40 p-1">
            <button
              onClick={() => setPeriodType('daily')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filters.periodType === 'daily'
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="standup-daily-btn"
            >
              Daily
            </button>
            <button
              onClick={() => setPeriodType('weekly')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filters.periodType === 'weekly'
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="standup-weekly-btn"
            >
              Weekly
            </button>
          </div>

          {/* Project Selector */}
          <div className="w-48">
            <UniversalSelect
              value={filters.projectId || ''}
              onChange={(value) => setProjectId(value || null)}
              options={[
                { value: '', label: 'Select Project' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              variant="compact"
              size="sm"
              data-testid="standup-project-select"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors disabled:opacity-50"
            aria-label="Refresh"
            data-testid="standup-refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Generate Button */}
          <button
            onClick={() => handleGenerate(currentSummary !== null)}
            disabled={isGenerating || !filters.projectId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="standup-generate-btn"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {currentSummary ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 rounded-lg bg-red-900/20 border border-red-500/40"
          data-testid="standup-error"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </motion.div>
      )}

      {/* No Project Selected */}
      {!filters.projectId && (
        <div className="text-center py-16" data-testid="standup-no-project">
          <div className="text-gray-500 text-lg mb-2">Select a project to view standups</div>
          <div className="text-gray-600 text-sm">
            Choose a project from the dropdown above to generate daily or weekly standup summaries
          </div>
        </div>
      )}

      {/* Summary Content */}
      {filters.projectId && (
        <>
          {currentSummary ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Stats Row */}
              <StandupStatsRow stats={currentSummary.stats} insights={currentSummary.insights} />

              {/* Summary Card */}
              <StandupSummaryCard summary={currentSummary} />

              {/* Blockers & Highlights */}
              <StandupBlockersHighlights
                blockers={currentSummary.blockers}
                highlights={currentSummary.highlights}
              />
            </motion.div>
          ) : (
            <div className="text-center py-16" data-testid="standup-no-summary">
              <div className="text-gray-500 text-lg mb-2">No standup summary for this period</div>
              <div className="text-gray-600 text-sm mb-6">
                Click &quot;Generate&quot; to create an AI-powered summary
              </div>
              <button
                onClick={() => handleGenerate(false)}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-colors disabled:opacity-50"
                data-testid="standup-generate-empty-btn"
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                Generate Standup Summary
              </button>
            </div>
          )}

          {/* History Section */}
          <StandupHistory />
        </>
      )}
    </div>
  );
}
