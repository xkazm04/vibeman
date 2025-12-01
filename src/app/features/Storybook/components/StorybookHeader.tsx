'use client';

import { useStorybookStore } from '../lib/storybookStore';
import { Search, RefreshCw, Filter } from 'lucide-react';
import { MatchStatus, CoverageStats } from '../lib/types';

interface StorybookHeaderProps {
  coverage: CoverageStats | null;
}

const filterOptions: Array<{ value: MatchStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'matched', label: 'Matched' },
  { value: 'partial', label: 'Partial' },
  { value: 'missing', label: 'Missing' },
  { value: 'unique', label: 'Unique' }
];

export function StorybookHeader({ coverage }: StorybookHeaderProps) {
  const { filter, setFilter, searchQuery, setSearchQuery, fetchComponents, isLoading } = useStorybookStore();

  return (
    <div className="flex items-center justify-between" data-testid="storybook-header">
      <div>
        <h1 className="text-2xl font-bold text-white" data-testid="storybook-title">
          Component Coverage Analyzer
        </h1>
        <p className="text-gray-400">
          Compare Vibeman UI components against central Storybook
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative bg-white/5 rounded-lg" data-testid="storybook-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-transparent text-white text-sm focus:outline-none w-64 placeholder-gray-500"
            data-testid="storybook-search-input"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1" data-testid="storybook-filters">
          <Filter className="w-4 h-4 text-gray-400" />
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1.5 rounded text-sm transition-colors
                ${filter === option.value
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-gray-400 hover:text-white'
                }`}
              data-testid={`storybook-filter-${option.value}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={fetchComponents}
          disabled={isLoading}
          className="p-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
          data-testid="storybook-refresh-btn"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
