'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { WeeklyStats, WeeklyFilters } from '../lib/types';
import { fetchWeeklyStats } from '../lib/weeklyApi';
import WeeklyKPICards from './WeeklyKPICards';
import DailyActivityChart, { DailyBarClickData } from './DailyActivityChart';
import SpecialistBreakdown from './SpecialistBreakdown';
import ProjectImplementationRanking from './ProjectImplementationRanking';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import FilterBar from '../../components/FilterBar';
import SuggestionTypeToggle from '../../components/SuggestionTypeToggle';
import DrillDownDrawer, { DrillDownContext, dbIdeaToDrillDown } from '../../components/DrillDownDrawer';
import {
  FilterState,
  FilterBarConfig,
  getEmptyFilterState
} from '../../lib/filterIdeas';
import { SuggestionFilter } from '../../lib/unifiedTypes';
import { DbIdea } from '@/app/db';

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
  const [unifiedFilters, setUnifiedFilters] = useState<FilterState>(getEmptyFilterState());
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);

  const { projects, initializeProjects } = useProjectConfigStore();

  // Convert unified filters to WeeklyFilters for API calls
  const filters: WeeklyFilters = useMemo(() => ({
    projectId: unifiedFilters.projectIds[0] || null,
    contextId: unifiedFilters.contextIds[0] || null,
    weekOffset: unifiedFilters.weekOffset ?? 0,
    suggestionType: unifiedFilters.suggestionType ?? 'both',
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
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWeeklyStats(filters);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load weekly stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [filters]);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setUnifiedFilters(newFilters);
  }, []);

  const handleSuggestionTypeChange = useCallback((type: SuggestionFilter) => {
    setUnifiedFilters(prev => ({ ...prev, suggestionType: type }));
  }, []);

  /** Fetch ideas for a specific date and status, then open drill-down */
  const handleDailyBarClick = useCallback(async (data: DailyBarClickData) => {
    if (!stats) return;

    // Map the display status back to API status values
    const statusMap: Record<string, string[]> = {
      accepted: ['accepted', 'implemented'],
      rejected: ['rejected'],
      pending: ['pending'],
    };
    const statuses = statusMap[data.status] || [data.status];

    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId);

      const response = await fetch(`/api/ideas?${params}`);
      if (!response.ok) return;
      const result = await response.json();
      const allIdeas: DbIdea[] = result.ideas || [];

      // Filter by date and status client-side
      const filtered = allIdeas.filter(i => {
        const ideaDate = new Date(i.created_at).toISOString().split('T')[0];
        return ideaDate === data.date && statuses.includes(i.status);
      });

      setDrillDown({
        title: `${data.dayName} — ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
        subtitle: `${data.date} · ${data.count} ideas`,
        accentColor: data.status === 'accepted' ? 'rgba(16, 185, 129, 0.4)'
          : data.status === 'rejected' ? 'rgba(239, 68, 68, 0.4)'
          : 'rgba(168, 85, 247, 0.4)',
        ideas: filtered.map(dbIdeaToDrillDown),
        stats: {
          total: filtered.length,
          accepted: filtered.filter(i => i.status === 'accepted' || i.status === 'implemented').length,
          rejected: filtered.filter(i => i.status === 'rejected').length,
          pending: filtered.filter(i => i.status === 'pending').length,
          acceptanceRate: data.acceptanceRate,
        },
      });
    } catch {
      // Silently fail
    }
  }, [stats, filters.projectId]);

  const handleIdeaAction = useCallback((_ideaId: string, _action: 'accepted' | 'rejected') => {
    // Refresh stats after action
    loadStats();
  }, [loadStats]);

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
          value={unifiedFilters.suggestionType ?? 'both'}
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
        <DailyActivityChart
          dailyBreakdown={stats.dailyBreakdown}
          onBarClick={handleDailyBarClick}
        />
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

      {/* Drill-Down Drawer */}
      <DrillDownDrawer
        context={drillDown}
        onClose={() => setDrillDown(null)}
        onIdeaAction={handleIdeaAction}
      />
    </div>
  );
}
