'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Network, BarChart3 } from 'lucide-react';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useContextStore } from '@/stores/contextStore';
import TotalViewFilters from '@/app/features/reflector/components/TotalViewFilters';
import TotalViewDashboard from '@/app/features/reflector/components/TotalViewDashboard';
import ActiveFiltersDisplay from '@/app/features/reflector/components/ActiveFiltersDisplay';
import DependenciesTab from '@/app/features/Depndencies/DependenciesTab';
import ReflectionDashboard from '@/app/features/reflector/sub_Reflection/components/ReflectionDashboard';
import { IdeaFilterState, getEmptyFilterState, applyFilters } from '@/app/features/reflector/lib/filterIdeas';

const ReflectorLayout = () => {
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'weekly' | 'total' | 'ideas_stats' | 'dependencies'>('weekly');
  const [filters, setFilters] = useState<IdeaFilterState>(getEmptyFilterState());

  const { projects, initializeProjects } = useProjectConfigStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize projects and load ideas
  useEffect(() => {
    initializeProjects();
    loadImplementedIdeas();
  }, []);

  // Sync filters with URL parameters
  useEffect(() => {
    const projectIds = searchParams.get('projects')?.split(',').filter(Boolean) || [];
    const contextIds = searchParams.get('contexts')?.split(',').filter(Boolean) || [];
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || [];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchQuery = searchParams.get('search') || '';

    setFilters({
      projectIds,
      contextIds,
      statuses,
      dateRange: {
        start: startDate ? new Date(startDate) : null,
        end: endDate ? new Date(endDate) : null,
      },
      searchQuery,
    });
  }, [searchParams]);

  const loadImplementedIdeas = async () => {
    try {
      const response = await fetch('/api/ideas?status=implemented');
      if (response.ok) {
        const data = await response.json();
        setIdeas(data.ideas || []);
      }
    } catch (error) {
      // Error loading implemented ideas
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and view mode
  const displayedIdeas = React.useMemo(() => {
    let filtered = ideas;

    // Apply view mode filter first (weekly vs total)
    if (viewMode === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      filtered = filtered.filter(idea => {
        if (!idea.implemented_at) return false;
        const implementedDate = new Date(idea.implemented_at);
        return implementedDate >= oneWeekAgo;
      });
    }

    // Apply user filters only in total view
    if (viewMode === 'total') {
      filtered = applyFilters(filtered, filters);
    }

    return filtered;
  }, [ideas, viewMode, filters]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return {
      today: ideas.filter(i => {
        if (!i.implemented_at) return false;
        const date = new Date(i.implemented_at);
        return date >= today;
      }).length,
      week: ideas.filter(i => {
        if (!i.implemented_at) return false;
        const date = new Date(i.implemented_at);
        return date >= weekAgo;
      }).length,
      month: ideas.filter(i => {
        if (!i.implemented_at) return false;
        const date = new Date(i.implemented_at);
        return date >= monthAgo;
      }).length,
    };
  }, [ideas]);

  // Update URL when filters change
  const handleFilterChange = React.useCallback((newFilters: IdeaFilterState) => {
    setFilters(newFilters);

    const params = new URLSearchParams();
    if (newFilters.projectIds.length > 0) {
      params.set('projects', newFilters.projectIds.join(','));
    }
    if (newFilters.contextIds.length > 0) {
      params.set('contexts', newFilters.contextIds.join(','));
    }
    if (newFilters.statuses.length > 0) {
      params.set('statuses', newFilters.statuses.join(','));
    }
    if (newFilters.dateRange.start) {
      params.set('startDate', newFilters.dateRange.start.toISOString());
    }
    if (newFilters.dateRange.end) {
      params.set('endDate', newFilters.dateRange.end.toISOString());
    }
    if (newFilters.searchQuery.trim()) {
      params.set('search', newFilters.searchQuery);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/reflector';
    router.push(newUrl, { scroll: false });
  }, [router]);

  // Remove individual filter
  const handleRemoveFilter = React.useCallback((filterType: keyof IdeaFilterState, value?: string) => {
    const newFilters = { ...filters };

    if (filterType === 'projectIds' && value) {
      newFilters.projectIds = newFilters.projectIds.filter(id => id !== value);
    } else if (filterType === 'contextIds' && value) {
      newFilters.contextIds = newFilters.contextIds.filter(id => id !== value);
    } else if (filterType === 'statuses' && value) {
      newFilters.statuses = newFilters.statuses.filter(s => s !== value);
    } else if (filterType === 'dateRange') {
      newFilters.dateRange = { start: null, end: null };
    } else if (filterType === 'searchQuery') {
      newFilters.searchQuery = '';
    }

    handleFilterChange(newFilters);
  }, [filters, handleFilterChange]);

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 via-yellow-900/10 to-gray-900">
      {/* Header */}
      <motion.div
        className="border-b border-yellow-700/40 bg-gray-900/60 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            {/* Left: Title */}
            <div className="flex items-center space-x-4">
              <motion.div
                className="p-3 bg-gradient-to-br from-yellow-500/20 to-amber-500/30 rounded-xl border border-yellow-500/40"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Trophy className="w-6 h-6 text-yellow-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                  Reflector
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Implemented ideas and achievements
                </p>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <div className="text-sm">
                  <span className="text-gray-500">Today:</span>{' '}
                  <span className="text-yellow-400 font-mono font-semibold">{stats.today}</span>
                </div>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Week:</span>{' '}
                <span className="text-yellow-400 font-mono font-semibold">{stats.week}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Month:</span>{' '}
                <span className="text-amber-400 font-mono font-semibold">{stats.month}</span>
              </div>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('total')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'total'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
              }`}
            >
              Implemented
            </button>
            <button
              onClick={() => setViewMode('ideas_stats')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'ideas_stats'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Ideas Stats
            </button>
            <button
              onClick={() => setViewMode('dependencies')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'dependencies'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
              }`}
            >
              <Network className="w-4 h-4" />
              Dependencies
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && viewMode !== 'dependencies' && viewMode !== 'ideas_stats' ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : viewMode === 'weekly' ? (
          <div className="text-center py-24 text-gray-400">
            Weekly view content will be implemented here
            <br />
            {displayedIdeas.length} ideas implemented in the last 7 days
          </div>
        ) : viewMode === 'dependencies' ? (
          <DependenciesTab />
        ) : viewMode === 'ideas_stats' ? (
          <ReflectionDashboard />
        ) : (
          <div className="space-y-6">
            {/* Filters and Active Filter Display */}
            <div className="space-y-4">
              <TotalViewFilters
                projects={projects}
                filters={filters}
                onChange={handleFilterChange}
                ideas={ideas}
              />
              <ActiveFiltersDisplay
                filters={filters}
                projects={projects}
                onRemoveFilter={handleRemoveFilter}
              />
            </div>

            {/* Dashboard */}
            <TotalViewDashboard
              ideas={displayedIdeas}
              isFiltered={
                filters.projectIds.length > 0 ||
                filters.contextIds.length > 0 ||
                filters.statuses.length > 0 ||
                !!filters.dateRange.start ||
                !!filters.dateRange.end ||
                !!filters.searchQuery.trim()
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ReflectorLayout);
