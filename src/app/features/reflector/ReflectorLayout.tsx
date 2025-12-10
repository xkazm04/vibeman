'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

// Lib imports
import { IdeaFilterState, getEmptyFilterState, applyFilters } from '@/app/features/reflector/lib/filterIdeas';
import { calculateImplementedStats, filterIdeasByViewMode } from '@/app/features/reflector/lib/statsHelpers';
import { parseFiltersFromURL, buildURLFromFilters, removeFilterValue } from '@/app/features/reflector/lib/urlFilterSync';

// Component imports
import ReflectorHeader from '@/app/features/reflector/components/ReflectorHeader';
import ReflectorViewTabs, { ViewMode } from '@/app/features/reflector/components/ReflectorViewTabs';
import TotalViewFilters from '@/app/features/reflector/components/TotalViewFilters';
import TotalViewDashboard from '@/app/features/reflector/components/TotalViewDashboard';
import ActiveFiltersDisplay from '@/app/features/reflector/components/ActiveFiltersDisplay';
import DependenciesTab from '@/app/features/Depndencies/DependenciesTab';
import ReflectionDashboard from '@/app/features/reflector/sub_Reflection/components/ReflectionDashboard';
import { WeeklyDashboard } from '@/app/features/reflector/sub_Weekly/components';

const ReflectorLayout = () => {
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [filters, setFilters] = useState<IdeaFilterState>(getEmptyFilterState());

  const { projects, initializeProjects } = useProjectConfigStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize projects and load ideas
  useEffect(() => {
    initializeProjects();
    loadImplementedIdeas();
  }, [initializeProjects]);

  // Sync filters with URL parameters
  useEffect(() => {
    setFilters(parseFiltersFromURL(searchParams));
  }, [searchParams]);

  const loadImplementedIdeas = async () => {
    try {
      const response = await fetch('/api/ideas?status=implemented');
      if (response.ok) {
        const data = await response.json();
        setIdeas(data.ideas || []);
      }
    } catch (error) {
      console.error('Error loading implemented ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and view mode
  const displayedIdeas = useMemo(() => {
    let filtered = filterIdeasByViewMode(ideas, viewMode);

    // Apply user filters only in total view
    if (viewMode === 'total') {
      filtered = applyFilters(filtered, filters);
    }

    return filtered;
  }, [ideas, viewMode, filters]);

  // Calculate stats
  const stats = useMemo(() => calculateImplementedStats(ideas), [ideas]);

  // Update URL when filters change
  const handleFilterChange = useCallback((newFilters: IdeaFilterState) => {
    setFilters(newFilters);
    const newUrl = buildURLFromFilters(newFilters);
    router.push(newUrl, { scroll: false });
  }, [router]);

  // Remove individual filter
  const handleRemoveFilter = useCallback((filterType: keyof IdeaFilterState, value?: string) => {
    const newFilters = removeFilterValue(filters, filterType, value);
    handleFilterChange(newFilters);
  }, [filters, handleFilterChange]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => (
    filters.projectIds.length > 0 ||
    filters.contextIds.length > 0 ||
    filters.statuses.length > 0 ||
    !!filters.dateRange.start ||
    !!filters.dateRange.end ||
    !!filters.searchQuery.trim()
  ), [filters]);

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 via-yellow-900/10 to-gray-900">
      {/* Header with Stats */}
      <ReflectorHeader stats={stats} />

      {/* View Mode Tabs - inside header section */}
      <div className="border-b border-yellow-700/40 bg-gray-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <ReflectorViewTabs viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && viewMode !== 'dependencies' && viewMode !== 'ideas_stats' ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : viewMode === 'weekly' ? (
          <WeeklyDashboard />
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
              isFiltered={hasActiveFilters}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ReflectorLayout);
