'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Calendar } from 'lucide-react';
import { WeeklyStats, WeeklyFilters } from '../lib/types';
import { fetchWeeklyStats, getWeekRange } from '../lib/weeklyApi';
import WeeklyKPICards from './WeeklyKPICards';
import DailyActivityChart from './DailyActivityChart';
import SpecialistBreakdown from './SpecialistBreakdown';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

export default function WeeklyDashboard() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WeeklyFilters>({
    projectId: null,
    contextId: null,
    weekOffset: 0,
  });

  const { projects, initializeProjects } = useProjectConfigStore();
  const weekRange = getWeekRange(filters.weekOffset);

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

  const handlePreviousWeek = () => {
    setFilters(f => ({ ...f, weekOffset: f.weekOffset - 1 }));
  };

  const handleNextWeek = () => {
    if (filters.weekOffset < 0) {
      setFilters(f => ({ ...f, weekOffset: f.weekOffset + 1 }));
    }
  };

  const handleCurrentWeek = () => {
    setFilters(f => ({ ...f, weekOffset: 0 }));
  };

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
      {/* Week Navigation & Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        {/* Week Navigator */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-900/30 border border-amber-500/40">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-medium">{weekRange.label}</span>
            <span className="text-gray-500 text-sm">
              ({new Date(stats.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(stats.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
            </span>
          </div>
          
          <button
            onClick={handleNextWeek}
            disabled={filters.weekOffset >= 0}
            className={`p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 transition-colors ${
              filters.weekOffset >= 0 
                ? 'text-gray-600 cursor-not-allowed' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
            }`}
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {filters.weekOffset !== 0 && (
            <button
              onClick={handleCurrentWeek}
              className="px-3 py-1.5 text-xs rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
            >
              Current Week
            </button>
          )}
        </div>

        {/* Project Filter */}
        <div className="flex items-center gap-3">
          <div className="w-48">
            <UniversalSelect
              value={filters.projectId || ''}
              onChange={(value) => setFilters(f => ({ ...f, projectId: value || null, contextId: null }))}
              options={[
                { value: '', label: 'All Projects' },
                ...projects.map(p => ({ value: p.id, label: p.name })),
              ]}
              variant="compact"
              size="sm"
            />
          </div>
          <button
            onClick={loadStats}
            className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

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

      {/* Footer */}
      <div className="text-center text-xs text-gray-600">
        Data from {new Date(stats.weekStart).toLocaleDateString()} to {new Date(stats.weekEnd).toLocaleDateString()}
        {' '}• Compared against previous week
      </div>
    </div>
  );
}









