'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, Sparkles } from 'lucide-react';
import { FilterState, getEmptyFilterState, countActiveFilters, getSuggestedFilters } from '../lib/filterIdeas';
import ProjectFilter from './ProjectFilter';
import ContextFilter from './ContextFilter';
import StatusFilter from './StatusFilter';
import DateRangeFilter from './DateRangeFilter';
import SearchInput from './SearchInput';
import { DbIdea } from '@/app/db';

interface TotalViewFiltersProps {
  projects: Array<{ id: string; name: string }>;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  ideas: DbIdea[]; // For smart suggestions
}

export default function TotalViewFilters({ projects, filters, onChange, ideas }: TotalViewFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const activeFilterCount = countActiveFilters(filters);
  const suggestions = getSuggestedFilters(ideas);

  const handleClearAll = () => {
    onChange(getEmptyFilterState());
  };

  const handleProjectChange = (projectIds: string[]) => {
    onChange({ ...filters, projectIds });
  };

  const handleContextChange = (contextIds: string[]) => {
    onChange({ ...filters, contextIds });
  };

  const handleStatusChange = (statuses: string[]) => {
    onChange({ ...filters, statuses });
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    onChange({ ...filters, dateRange: { start, end } });
  };

  const handleSearchChange = (searchQuery: string) => {
    onChange({ ...filters, searchQuery });
  };

  const applySuggestion = (suggestion: Partial<FilterState>) => {
    onChange({ ...filters, ...suggestion });
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <div className="flex items-center space-x-3">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800/80 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-semibold">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </motion.button>

        {/* Smart Suggestions Button */}
        {suggestions.length > 0 && (
          <motion.button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 border border-purple-500/40 rounded-lg text-sm font-medium text-purple-300 hover:bg-purple-500/30 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
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
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-300 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Suggested Filters</span>
              </h3>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
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
        {isOpen && (
          <motion.div
            className="fixed top-0 right-0 h-screen w-96 bg-gray-900/95 backdrop-blur-xl border-l border-yellow-700/40 shadow-2xl z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900/80 backdrop-blur-xl border-b border-yellow-700/40 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-yellow-400" />
                  <span>Filter Ideas</span>
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
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
              <SearchInput
                value={filters.searchQuery}
                onChange={handleSearchChange}
                placeholder="Search ideas..."
              />

              {/* Project Filter */}
              <ProjectFilter
                projects={projects}
                selectedProjectIds={filters.projectIds}
                onChange={handleProjectChange}
              />

              {/* Context Filter */}
              <ContextFilter
                selectedProjectIds={filters.projectIds}
                selectedContextIds={filters.contextIds}
                onChange={handleContextChange}
              />

              {/* Status Filter */}
              <StatusFilter
                selectedStatuses={filters.statuses}
                onChange={handleStatusChange}
              />

              {/* Date Range Filter */}
              <DateRangeFilter
                startDate={filters.dateRange.start}
                endDate={filters.dateRange.end}
                onChange={handleDateRangeChange}
              />
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900/80 backdrop-blur-xl border-t border-yellow-700/40 px-6 py-4">
              <button
                onClick={handleClearAll}
                className="w-full px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/30 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
