'use client';

import { Filter } from 'lucide-react';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

type CategoryFilter = 'all' | 'performance' | 'maintainability' | 'security' | 'code-quality' | 'duplication' | 'architecture';
type SeverityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Props for ReviewFilters component
 */
export interface ReviewFiltersProps {
  filterCategory: CategoryFilter;
  filterSeverity: SeverityFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  onSeverityChange: (severity: SeverityFilter) => void;
  filteredCount: number;
  byCategory: Record<string, number>;
  onSelectByCategory: (category: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

/**
 * ReviewFilters - Filter dropdowns and quick select buttons for ReviewStep
 * 
 * Includes:
 * - Category filter dropdown
 * - Severity filter dropdown
 * - Quick select buttons by category
 * - Select All / Clear buttons
 */
export function ReviewFilters({
  filterCategory,
  filterSeverity,
  onCategoryChange,
  onSeverityChange,
  filteredCount,
  byCategory,
  onSelectByCategory,
  onSelectAll,
  onClearSelection,
}: ReviewFiltersProps) {
  return (
    <>
      {/* Category Quick Selection */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-gray-400 self-center mr-2">Quick select:</span>
          {Object.entries(byCategory).map(([category, count]) => (
            <button
              key={category}
              onClick={() => onSelectByCategory(category)}
              className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-300 transition-all"
            >
              {category} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />

          <UniversalSelect
            value={filterCategory}
            onChange={(value) => onCategoryChange(value as CategoryFilter)}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'performance', label: 'Performance' },
              { value: 'maintainability', label: 'Maintainability' },
              { value: 'security', label: 'Security' },
              { value: 'code-quality', label: 'Code Quality' },
              { value: 'duplication', label: 'Duplication' },
              { value: 'architecture', label: 'Architecture' },
            ]}
            variant="default"
            data-testid="filter-category-select"
          />

          <UniversalSelect
            value={filterSeverity}
            onChange={(value) => onSeverityChange(value as SeverityFilter)}
            options={[
              { value: 'all', label: 'All Severities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            variant="default"
            data-testid="filter-severity-select"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSelectAll}
            className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-all"
            data-testid="select-all-opportunities"
          >
            Select All ({filteredCount})
          </button>
          <button
            onClick={onClearSelection}
            className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-all"
            data-testid="clear-selection"
          >
            Clear
          </button>
        </div>
      </div>
    </>
  );
}
