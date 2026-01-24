'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DbIdea, DbDirection } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { SuggestionFilter } from '@/app/features/reflector/lib/unifiedTypes';
import SuggestionTypeToggle from '@/app/features/reflector/components/SuggestionTypeToggle';

// Lib imports
import {
  IdeaFilterState,
  UnifiedFilterState,
  FilterBarConfig,
  getEmptyFilterState,
  getEmptyUnifiedFilterState,
  toUnifiedFilterState,
  toIdeaFilterState,
  applyFilters
} from '@/app/features/reflector/lib/filterIdeas';
import { calculateImplementedStats, filterIdeasByViewMode } from '@/app/features/reflector/lib/statsHelpers';
import { parseFiltersFromURL, buildURLFromFilters, removeFilterValue } from '@/app/features/reflector/lib/urlFilterSync';

// Component imports
import ReflectorHeader from '@/app/features/reflector/components/ReflectorHeader';
import ReflectorViewTabs, { ViewMode } from '@/app/features/reflector/components/ReflectorViewTabs';
import FilterBar from '@/app/features/reflector/components/FilterBar';
import TotalViewDashboard from '@/app/features/reflector/components/TotalViewDashboard';
import ActiveFiltersDisplay from '@/app/features/reflector/components/ActiveFiltersDisplay';
import DependenciesTab from '@/app/features/Depndencies/DependenciesTab';
import ReflectionDashboard from '@/app/features/reflector/sub_Reflection/components/ReflectionDashboard';
import { WeeklyDashboard } from '@/app/features/reflector/sub_Weekly/components';
import ExportButton from '@/app/features/reflector/components/ExportButton';
import ObservatoryDashboard from '@/app/features/reflector/sub_Observability/ObservatoryDashboard';

// FilterBar configuration for TotalViewDashboard
const TOTAL_VIEW_FILTER_CONFIG: FilterBarConfig = {
  showProjectFilter: true,
  showContextFilter: true,
  showStatusFilter: true,
  showDateRangeFilter: true,
  showSearchFilter: true,
  variant: 'panel',
};

const ReflectorLayout = () => {
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [directions, setDirections] = useState<DbDirection[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [unifiedFilters, setUnifiedFilters] = useState<UnifiedFilterState>(getEmptyUnifiedFilterState());
  const [suggestionType, setSuggestionType] = useState<SuggestionFilter>('ideas');

  const { projects, initializeProjects } = useProjectConfigStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Convert unified filters to IdeaFilterState for backwards compatibility
  const filters: IdeaFilterState = useMemo(() => toIdeaFilterState(unifiedFilters), [unifiedFilters]);

  // Initialize projects and load ideas/directions
  useEffect(() => {
    initializeProjects();
    loadImplementedIdeas();
    loadAcceptedDirections();
  }, [initializeProjects]);

  // Sync filters with URL parameters
  useEffect(() => {
    const parsedFilters = parseFiltersFromURL(searchParams);
    setUnifiedFilters(toUnifiedFilterState(parsedFilters, unifiedFilters.weekOffset));
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

  const loadAcceptedDirections = async () => {
    try {
      const response = await fetch('/api/directions?status=accepted');
      if (response.ok) {
        const data = await response.json();
        setDirections(data.directions || []);
      }
    } catch (error) {
      console.error('Error loading accepted directions:', error);
    }
  };

  const handleSuggestionTypeChange = useCallback((type: SuggestionFilter) => {
    setSuggestionType(type);
  }, []);

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

  // Update URL when unified filters change
  const handleUnifiedFilterChange = useCallback((newFilters: UnifiedFilterState) => {
    setUnifiedFilters(newFilters);
    const ideaFilters = toIdeaFilterState(newFilters);
    const newUrl = buildURLFromFilters(ideaFilters);
    router.push(newUrl, { scroll: false });
  }, [router]);

  // Remove individual filter (for ActiveFiltersDisplay)
  const handleRemoveFilter = useCallback((filterType: keyof IdeaFilterState, value?: string) => {
    const newFilters = removeFilterValue(filters, filterType, value);
    setUnifiedFilters(toUnifiedFilterState(newFilters, unifiedFilters.weekOffset));
    const newUrl = buildURLFromFilters(newFilters);
    router.push(newUrl, { scroll: false });
  }, [filters, unifiedFilters.weekOffset, router]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => (
    filters.projectIds.length > 0 ||
    filters.contextIds.length > 0 ||
    filters.statuses.length > 0 ||
    filters.scanTypes.length > 0 ||
    filters.effortLevels.length > 0 ||
    filters.impactLevels.length > 0 ||
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
        {loading && viewMode !== 'dependencies' && viewMode !== 'ideas_stats' && viewMode !== 'observability' ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : viewMode === 'weekly' ? (
          <WeeklyDashboard />
        ) : viewMode === 'dependencies' ? (
          <DependenciesTab />
        ) : viewMode === 'ideas_stats' ? (
          <ReflectionDashboard />
        ) : viewMode === 'observability' ? (
          <ObservatoryDashboard />
        ) : (
          <div className="space-y-6">
            {/* Suggestion Type Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <SuggestionTypeToggle
                value={suggestionType}
                onChange={handleSuggestionTypeChange}
                ideasCount={ideas.length}
                directionsCount={directions.length}
              />
            </div>

            {/* Unified FilterBar and Active Filter Display */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <FilterBar
                    projects={projects}
                    filters={unifiedFilters}
                    onChange={handleUnifiedFilterChange}
                    config={TOTAL_VIEW_FILTER_CONFIG}
                    ideas={ideas}
                  />
                </div>
                <ExportButton
                  ideas={displayedIdeas}
                  filename="implemented-ideas"
                />
              </div>
              <ActiveFiltersDisplay
                filters={filters}
                projects={projects}
                onRemoveFilter={handleRemoveFilter}
              />
            </div>

            {/* Dashboard */}
            <TotalViewDashboard
              ideas={displayedIdeas}
              directions={directions}
              suggestionType={suggestionType}
              isFiltered={hasActiveFilters}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ReflectorLayout);
