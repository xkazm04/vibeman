'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import { FilterState } from '../lib/types';

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  projects: Array<{ id: string; name: string }>;
  contexts: Array<{ id: string; name: string; project_id: string }>;
}

export default function FilterPanel({
  filters,
  onFilterChange,
  projects,
  contexts
}: FilterPanelProps) {
  const filteredContexts = filters.projectId
    ? contexts.filter(c => c.project_id === filters.projectId)
    : contexts;

  const clearFilters = () => {
    onFilterChange({ projectId: null, contextId: null });
  };

  const hasFilters = filters.projectId || filters.contextId;

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-4 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">Filters</h3>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/40 rounded transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Project</label>
          <select
            value={filters.projectId || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                projectId: e.target.value || null,
                contextId: null // Reset context when project changes
              })
            }
            className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Context Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Context</label>
          <select
            value={filters.contextId || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                contextId: e.target.value || null
              })
            }
            disabled={!filters.projectId}
            className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {filters.projectId ? 'All Contexts' : 'Select project first'}
            </option>
            {filteredContexts.map(context => (
              <option key={context.id} value={context.id}>
                {context.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );
}
