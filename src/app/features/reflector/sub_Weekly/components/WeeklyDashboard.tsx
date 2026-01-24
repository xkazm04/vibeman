'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { WeeklyStats, WeeklyFilters } from '../lib/types';
import { fetchWeeklyStats } from '../lib/weeklyApi';
import WeeklyKPICards from './WeeklyKPICards';
import DailyActivityChart from './DailyActivityChart';
import SpecialistBreakdown from './SpecialistBreakdown';
import ProjectImplementationRanking from './ProjectImplementationRanking';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import FilterBar from '../../components/FilterBar';
import SuggestionTypeToggle from '../../components/SuggestionTypeToggle';
import {
  UnifiedFilterState,
  FilterBarConfig,
  getEmptyUnifiedFilterState
} from '../../lib/filterIdeas';
import { SuggestionFilter } from '../../lib/unifiedTypes';

// FilterBar configuration for WeeklyDashboard
const WEEKLY_FILTER_CONFIG: FilterBarConfig = {
  showProjectFilter: true,
  showWeekNavigation: true,
  singleProjectSelect: true,
  variant: 'inline',
};

export default function WeeklyDashboard() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unifiedFilters, setUnifiedFilters] = useState<UnifiedFilterState>(getEmptyUnifiedFilterState());

  const { projects, initializeProjects } = useProjectConfigStore();

  // Convert unified filters to WeeklyFilters for API calls
  const filters: WeeklyFilters = useMemo(() => ({
    projectId: unifiedFilters.projectIds[0] || null,
    contextId: unifiedFilters.contextIds[0] || null,
    weekOffset: unifiedFilters.weekOffset,
    suggestionType: unifiedFilters.suggestionType,
  }), [unifiedFilters]);

  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchWeeklyStats(filters);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weekly stats');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleFilterChange = useCallback((newFilters: UnifiedFilterState) => {
    setUnifiedFilters(newFilters);
  }, []);

  const handleSuggestionTypeChange = useCallback((type: SuggestionFilter) => {
    setUnifiedFilters(prev => ({ ...prev, suggestionType: type }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="weekly-loading">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mr-3" />
        <span className="text-gray-400">Loading weekly insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24" data-testid="weekly-error">
        <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
        <span className="text-red-400 mb-4">{error}</span>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="weekly-dashboard">
      {/* Type Toggle + Unified FilterBar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <SuggestionTypeToggle
          value={unifiedFilters.suggestionType}
          onChange={handleSuggestionTypeChange}
          ideasCount={stats?.overall.ideasTotal}
          directionsCount={stats?.overall.directionsTotal}
        />
        <div className="flex-1">
          <FilterBar
            projects={projects}
            filters={unifiedFilters}
            onChange={handleFilterChange}
            config={WEEKLY_FILTER_CONFIG}
            onRefresh={loadStats}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <WeeklyKPICards stats={stats} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyActivityChart dailyBreakdown={stats.dailyBreakdown} />
        <SpecialistBreakdown
          specialists={stats.specialists}
          topPerformers={stats.topPerformers}
          needsAttention={stats.needsAttention}
        />
      </div>

      {/* Project Implementation Ranking */}
      <ProjectImplementationRanking />

      {/* Footer */}
      <div className="text-center text-xs text-gray-600">
        Data from {new Date(stats.weekStart).toLocaleDateString()} to {new Date(stats.weekEnd).toLocaleDateString()}
        {' '}• Compared against previous week
      </div>
    </div>
  );
}














