'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, Layers, CheckCircle2, Calendar } from 'lucide-react';
import { IdeaFilterState } from '../lib/filterIdeas';

interface ActiveFiltersDisplayProps {
  filters: IdeaFilterState;
  projects: Array<{ id: string; name: string }>;
  onRemoveFilter: (filterType: keyof IdeaFilterState, value?: string) => void;
}

export default function ActiveFiltersDisplay({
  filters,
  projects,
  onRemoveFilter,
}: ActiveFiltersDisplayProps) {
  const hasActiveFilters =
    filters.projectIds.length > 0 ||
    filters.contextIds.length > 0 ||
    filters.statuses.length > 0 ||
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.searchQuery.trim();

  if (!hasActiveFilters) {
    return null;
  }

  const removeProjectFilter = (projectId: string) => {
    onRemoveFilter('projectIds', projectId);
  };

  const removeContextFilter = (contextId: string) => {
    onRemoveFilter('contextIds', contextId);
  };

  const removeStatusFilter = (status: string) => {
    onRemoveFilter('statuses', status);
  };

  const removeDateFilter = () => {
    onRemoveFilter('dateRange');
  };

  const removeSearchFilter = () => {
    onRemoveFilter('searchQuery');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      className="flex flex-wrap items-center gap-2 mb-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Active Filters:
      </span>

      <AnimatePresence mode="popLayout">
        {/* Project Filters */}
        {filters.projectIds.map((projectId) => {
          const project = projects.find((p) => p.id === projectId);
          return (
            <FilterTag
              key={`project-${projectId}`}
              icon={<Folder className="w-3 h-3" />}
              label={project?.name || projectId}
              onRemove={() => removeProjectFilter(projectId)}
              color="blue"
            />
          );
        })}

        {/* Context Filters */}
        {filters.contextIds.map((contextId) => (
          <FilterTag
            key={`context-${contextId}`}
            icon={<Layers className="w-3 h-3" />}
            label={contextId === 'null' ? 'No Context' : contextId}
            onRemove={() => removeContextFilter(contextId)}
            color="purple"
          />
        ))}

        {/* Status Filters */}
        {filters.statuses.map((status) => (
          <FilterTag
            key={`status-${status}`}
            icon={<CheckCircle2 className="w-3 h-3" />}
            label={status}
            onRemove={() => removeStatusFilter(status)}
            color="green"
          />
        ))}

        {/* Date Range Filter */}
        {(filters.dateRange.start || filters.dateRange.end) && (
          <FilterTag
            key="date-range"
            icon={<Calendar className="w-3 h-3" />}
            label={`${filters.dateRange.start ? formatDate(filters.dateRange.start) : '...'} - ${
              filters.dateRange.end ? formatDate(filters.dateRange.end) : '...'
            }`}
            onRemove={removeDateFilter}
            color="yellow"
          />
        )}

        {/* Search Filter */}
        {filters.searchQuery.trim() && (
          <FilterTag
            key="search"
            icon={null}
            label={`"${filters.searchQuery}"`}
            onRemove={removeSearchFilter}
            color="cyan"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface FilterTagProps {
  icon: React.ReactNode;
  label: string;
  onRemove: () => void;
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'cyan';
}

function FilterTag({ icon, label, onRemove, color }: FilterTagProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30',
    green: 'bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded-full text-xs font-medium transition-all ${colorClasses[color]}`}
    >
      {icon}
      <span className="max-w-[150px] truncate">{label}</span>
      <button
        onClick={onRemove}
        className="ml-1 hover:scale-110 transition-transform"
        aria-label="Remove filter"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
