'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, X, ChevronDown, ChevronLeft, ChevronRight,
  Calendar, Sparkles, RefreshCw
} from 'lucide-react';
import {
  FilterState,
  FilterBarConfig,
  getEmptyFilterState,
  countActiveFilters,
  getSuggestedFilters,
} from '../lib/filterIdeas';
import { getWeekRange } from '../sub_Weekly/lib/weeklyApi';
import ProjectFilter from './ProjectFilter';
import ContextFilter from './ContextFilter';
import StatusFilter from './StatusFilter';
import DateRangeFilter from './DateRangeFilter';
import SearchInput from './SearchInput';
import { UniversalSelect } from '@/components/ui/UniversalSelect';
import { DbIdea } from '@/app/db';

interface FilterBarProps {
  projects: Array<{ id: string; name: string }>;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  config: FilterBarConfig;
  ideas?: DbIdea[];
  onRefresh?: () => void;
}

export default function FilterBar({
  projects,
  filters,
  onChange,
  config,
  ideas = [],
  onRefresh
}: FilterBarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const activeFilterCount = countActiveFilters(filters);

  // Only calculate suggestions if panel mode and ideas are provided
  const suggestions = config.variant === 'panel' && ideas.length > 0
    ? getSuggestedFilters(ideas)
    : [];

  const weekRange = config.showWeekNavigation ? getWeekRange(filters.weekOffset ?? 0) : null;

  const handleClearAll = useCallback(() => {
    const empty = getEmptyFilterState();
    // Preserve weekOffset when clearing filters
    onChange({ ...empty, weekOffset: filters.weekOffset ?? 0 });
  }, [filters.weekOffset, onChange]);

  const handleProjectChange = useCallback((projectIds: string[]) => {
    onChange({ ...filters, projectIds, contextIds: [] });
  }, [filters, onChange]);

  const handleSingleProjectChange = useCallback((projectId: string | null) => {
    onChange({
      ...filters,
      projectIds: projectId ? [projectId] : [],
      contextIds: []
    });
  }, [filters, onChange]);

  const handleContextChange = useCallback((contextIds: string[]) => {
    onChange({ ...filters, contextIds });
  }, [filters, onChange]);

  const handleStatusChange = useCallback((statuses: string[]) => {
    onChange({ ...filters, statuses });
  }, [filters, onChange]);

  const handleDateRangeChange = useCallback((start: Date | null, end: Date | null) => {
    onChange({ ...filters, dateRange: { start, end } });
  }, [filters, onChange]);

  const handleSearchChange = useCallback((searchQuery: string) => {
    onChange({ ...filters, searchQuery });
  }, [filters, onChange]);

  const handlePreviousWeek = useCallback(() => {
    onChange({ ...filters, weekOffset: (filters.weekOffset ?? 0) - 1 });
  }, [filters, onChange]);

  const handleNextWeek = useCallback(() => {
    if ((filters.weekOffset ?? 0) < 0) {
      onChange({ ...filters, weekOffset: (filters.weekOffset ?? 0) + 1 });
    }
  }, [filters, onChange]);

  const handleCurrentWeek = useCallback(() => {
    onChange({ ...filters, weekOffset: 0 });
  }, [filters, onChange]);

  const applySuggestion = useCallback((suggestion: Partial<FilterState>) => {
    onChange({ ...filters, ...suggestion });
    setShowSuggestions(false);
  }, [filters, onChange]);

  // Inline variant - used by WeeklyDashboard
  if (config.variant === 'inline') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        data-testid="filter-bar-inline"
      >
        {/* Week Navigator */}
        {config.showWeekNavigation && weekRange && (
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-all duration-200 hover:shadow-md hover:shadow-black/20 active:scale-95"
              aria-label="Previous week"
              data-testid="filter-bar-prev-week-btn"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-900/30 border border-amber-500/40 shadow-sm shadow-amber-500/10 transition-all duration-200">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-medium" data-testid="filter-bar-week-label">
                {weekRange.label}
              </span>
              <span className="text-gray-500 text-sm">
                ({weekRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
              </span>
            </div>

            <button
              onClick={handleNextWeek}
              disabled={(filters.weekOffset ?? 0) >= 0}
              className={`p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 transition-all duration-200 ${
                (filters.weekOffset ?? 0) >= 0
                  ? 'text-gray-600 cursor-not-allowed opacity-50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/60 hover:shadow-md hover:shadow-black/20 active:scale-95'
              }`}
              aria-label="Next week"
              data-testid="filter-bar-next-week-btn"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {(filters.weekOffset ?? 0) !== 0 && (
              <button
                onClick={handleCurrentWeek}
                className="px-3 py-1.5 text-xs rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all duration-200 hover:shadow-md hover:shadow-amber-500/20 active:scale-95"
                data-testid="filter-bar-current-week-btn"
              >
                Current Week
              </button>
            )}
          </div>
        )}

        {/* Inline Filters */}
        <div className="flex items-center gap-3">
          {/* Project Filter (single-select dropdown for inline) */}
          {config.showProjectFilter && config.singleProjectSelect && (
            <div className="w-48" data-testid="filter-bar-project-select">
              <UniversalSelect
                value={filters.projectIds[0] || ''}
                onChange={(value) => handleSingleProjectChange(value || null)}
                options={[
                  { value: '', label: 'All Projects' },
                  ...projects.map(p => ({ value: p.id, label: p.name })),
                ]}
                variant="compact"
                size="sm"
              />
            </div>
          )}

          {/* Search Input */}
          {config.showSearchFilter && (
            <div className="w-64" data-testid="filter-bar-search">
              <SearchInput
                value={filters.searchQuery}
                onChange={handleSearchChange}
                placeholder="Search..."
              />
            </div>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-all duration-200 hover:shadow-md hover:shadow-black/20 active:scale-95 active:rotate-180"
              aria-label="Refresh"
              data-testid="filter-bar-refresh-btn"
            >
              <RefreshCw className="w-4 h-4 transition-transform duration-300" />
            </button>
          )}

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-all duration-200 hover:shadow-md hover:shadow-red-500/20 active:scale-95"
              data-testid="filter-bar-clear-btn"
            >
              <X className="w-3 h-3" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Panel variant - used by TotalViewDashboard
  return (
    <div className="relative" data-testid="filter-bar-panel">
      {/* Filter Toggle Button */}
      <div className="flex items-center space-x-3">
        <motion.button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800/80 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          data-testid="filter-bar-toggle-btn"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-semibold">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} />
        </motion.button>

        {/* Smart Suggestions Button */}
        {suggestions.length > 0 && (
          <motion.button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 border border-purple-500/40 rounded-lg text-sm font-medium text-purple-300 hover:bg-purple-500/30 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="filter-bar-suggestions-btn"
          >
            <Sparkles className="w-4 h-4" />
            <span>Smart Suggestions</span>
          </motion.button>
        )}

        {/* Clear All Button */}
        {activeFilterCount > 0 && (
          <motion.button
            onClick={handleClearAll}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/30 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="filter-bar-clear-all-btn"
          >
            <X className="w-4 h-4" />
            <span>Clear All</span>
          </motion.button>
        )}
      </div>

      {/* Smart Suggestions Panel */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            className="absolute top-full mt-2 left-0 right-0 bg-gray-800/95 backdrop-blur-xl border border-purple-500/40 rounded-xl shadow-2xl z-50 p-4"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.3 }}
            data-testid="filter-bar-suggestions-panel"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-300 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Suggested Filters</span>
              </h3>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                data-testid="filter-bar-close-suggestions-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  onClick={() => applySuggestion(suggestion.filter)}
                  className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 rounded-lg text-sm text-purple-300 hover:bg-purple-500/30 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid={`filter-bar-suggestion-${index}`}
                >
                  {suggestion.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Panel with Glassmorphism */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            className="fixed top-0 right-0 h-screen w-96 bg-gray-900/95 backdrop-blur-xl border-l border-yellow-700/40 shadow-2xl z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            data-testid="filter-bar-panel-content"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900/80 backdrop-blur-xl border-b border-yellow-700/40 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-yellow-400" />
                  <span>Filter Ideas</span>
                </h2>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                  data-testid="filter-bar-close-panel-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {activeFilterCount > 0 && (
                <div className="mt-2 text-sm text-gray-400">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </div>
              )}
            </div>

            {/* Filter Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Search */}
              {config.showSearchFilter && (
                <SearchInput
                  value={filters.searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search ideas..."
                />
              )}

              {/* Project Filter */}
              {config.showProjectFilter && !config.singleProjectSelect && (
                <ProjectFilter
                  projects={projects}
                  selectedProjectIds={filters.projectIds}
                  onChange={handleProjectChange}
                />
              )}

              {/* Context Filter */}
              {config.showContextFilter && (
                <ContextFilter
                  selectedProjectIds={filters.projectIds}
                  selectedContextIds={filters.contextIds}
                  onChange={handleContextChange}
                />
              )}

              {/* Status Filter */}
              {config.showStatusFilter && (
                <StatusFilter
                  selectedStatuses={filters.statuses}
                  onChange={handleStatusChange}
                />
              )}

              {/* Date Range Filter */}
              {config.showDateRangeFilter && (
                <DateRangeFilter
                  startDate={filters.dateRange.start}
                  endDate={filters.dateRange.end}
                  onChange={handleDateRangeChange}
                />
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900/80 backdrop-blur-xl border-t border-yellow-700/40 px-6 py-4">
              <button
                onClick={handleClearAll}
                className="w-full px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/30 transition-all"
                data-testid="filter-bar-footer-clear-btn"
              >
                Clear All Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPanelOpen(false)}
            data-testid="filter-bar-backdrop"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
