'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, GitCompare } from 'lucide-react';
import { ComparisonFilterState } from '../lib/types';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

interface FilterPanelProps {
  filters: ComparisonFilterState;
  onFilterChange: (filters: ComparisonFilterState) => void;
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
    onFilterChange({
      projectId: null,
      contextId: null,
      comparisonMode: false,
      period1: undefined,
      period2: undefined
    });
  };

  const toggleComparisonMode = () => {
    onFilterChange({
      ...filters,
      comparisonMode: !filters.comparisonMode,
      period1: !filters.comparisonMode ? { startDate: null, endDate: null, label: 'Period 1' } : undefined,
      period2: !filters.comparisonMode ? { startDate: null, endDate: null, label: 'Period 2' } : undefined
    });
  };

  const hasFilters = filters.projectId || filters.contextId || filters.comparisonMode;

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
        <div className="flex items-center gap-2">
          <button
            onClick={toggleComparisonMode}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors ${
              filters.comparisonMode
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/40 border border-transparent'
            }`}
          >
            <GitCompare className="w-3 h-3" />
            Compare Periods
          </button>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Project</label>
          <UniversalSelect
            value={filters.projectId || ''}
            onChange={(value) =>
              onFilterChange({
                ...filters,
                projectId: value || null,
                contextId: null
              })
            }
            options={[
              { value: '', label: 'All Projects' },
              ...projects.map(project => ({
                value: project.id,
                label: project.name
              }))
            ]}
            variant="default"
          />
        </div>

        {/* Context Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Context</label>
          <UniversalSelect
            value={filters.contextId || ''}
            onChange={(value) =>
              onFilterChange({
                ...filters,
                contextId: value || null
              })
            }
            options={[
              {
                value: '',
                label: filters.projectId ? 'All Contexts' : 'Select project first'
              },
              ...filteredContexts.map(context => ({
                value: context.id,
                label: context.name
              }))
            ]}
            disabled={!filters.projectId}
            variant="default"
          />
        </div>
      </div>

      <AnimatePresence>
        {filters.comparisonMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-700/40">
              <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
                <GitCompare className="w-3 h-3" />
                Period Comparison
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Period 1 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs text-gray-500">Period 1</label>
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={filters.period1?.label || ''}
                      onChange={(e) =>
                        onFilterChange({
                          ...filters,
                          period1: { ...filters.period1!, label: e.target.value }
                        })
                      }
                      className="w-32 px-2 py-1 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filters.period1?.startDate || ''}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            period1: { ...filters.period1!, startDate: e.target.value }
                          })
                        }
                        className="w-full px-2 py-1.5 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={filters.period1?.endDate || ''}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            period1: { ...filters.period1!, endDate: e.target.value }
                          })
                        }
                        className="w-full px-2 py-1.5 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Period 2 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs text-gray-500">Period 2</label>
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={filters.period2?.label || ''}
                      onChange={(e) =>
                        onFilterChange({
                          ...filters,
                          period2: { ...filters.period2!, label: e.target.value }
                        })
                      }
                      className="w-32 px-2 py-1 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filters.period2?.startDate || ''}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            period2: { ...filters.period2!, startDate: e.target.value }
                          })
                        }
                        className="w-full px-2 py-1.5 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={filters.period2?.endDate || ''}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            period2: { ...filters.period2!, endDate: e.target.value }
                          })
                        }
                        className="w-full px-2 py-1.5 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
