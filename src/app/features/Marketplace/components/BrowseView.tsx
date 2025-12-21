'use client';

import { useState } from 'react';
import { Search, Filter, TrendingUp, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import PatternCard from './PatternCard';
import type { PatternCategory, PatternScope } from '@/app/db/models/marketplace.types';

const categories: { value: PatternCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'migration', label: 'Migration' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'security', label: 'Security' },
  { value: 'performance', label: 'Performance' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'testing', label: 'Testing' },
  { value: 'modernization', label: 'Modernization' },
  { value: 'best-practices', label: 'Best Practices' },
];

const scopes: { value: PatternScope | 'all'; label: string }[] = [
  { value: 'all', label: 'All Scopes' },
  { value: 'file', label: 'File' },
  { value: 'module', label: 'Module' },
  { value: 'project', label: 'Project' },
  { value: 'framework', label: 'Framework' },
];

const sortOptions: { value: 'rating' | 'downloads' | 'recent'; label: string }[] = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'downloads', label: 'Most Downloaded' },
  { value: 'recent', label: 'Most Recent' },
];

export default function BrowseView() {
  const {
    patterns,
    featuredPatterns,
    filters,
    setFilter,
    isLoadingPatterns,
    hasMore,
    loadMore,
    error,
  } = useMarketplaceStore();

  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter('search', searchInput);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    // Debounce search
    if (e.target.value === '') {
      setFilter('search', '');
    }
  };

  return (
    <div className="space-y-8">
      {/* Featured Section */}
      {featuredPatterns.length > 0 && filters.search === '' && filters.category === 'all' && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Featured Patterns</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredPatterns.slice(0, 3).map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </section>
      )}

      {/* Search & Filters */}
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search patterns by name, description, or tags..."
            className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 focus:border-purple-500/50 rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
            data-testid="marketplace-search-input"
          />
          {searchInput && (
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              Search
            </button>
          )}
        </form>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-black/20 hover:bg-black/30 rounded-lg transition-colors"
            data-testid="marketplace-toggle-filters"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <select
              value={filters.sortBy}
              onChange={(e) => setFilter('sortBy', e.target.value as 'rating' | 'downloads' | 'recent')}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-purple-500/50"
              data-testid="marketplace-sort-select"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black/20 rounded-xl border border-white/5">
            <div>
              <label className="block text-xs text-gray-500 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilter('category', e.target.value as PatternCategory | 'all')}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-purple-500/50"
                data-testid="marketplace-category-select"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Scope</label>
              <select
                value={filters.scope}
                onChange={(e) => setFilter('scope', e.target.value as PatternScope | 'all')}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-purple-500/50"
                data-testid="marketplace-scope-select"
              >
                {scopes.map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Language</label>
              <input
                type="text"
                value={filters.language || ''}
                onChange={(e) => setFilter('language', e.target.value)}
                placeholder="e.g., typescript"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-purple-500/50"
                data-testid="marketplace-language-input"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Framework</label>
              <input
                type="text"
                value={filters.framework || ''}
                onChange={(e) => setFilter('framework', e.target.value)}
                placeholder="e.g., nextjs"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-purple-500/50"
                data-testid="marketplace-framework-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoadingPatterns && patterns.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-gray-400">Loading patterns...</p>
          </div>
        </div>
      )}

      {/* Patterns Grid */}
      {patterns.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">All Patterns</h2>
            <span className="text-sm text-gray-500">{patterns.length} patterns</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => loadMore()}
                disabled={isLoadingPatterns}
                className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                data-testid="marketplace-load-more"
              >
                {isLoadingPatterns ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Empty State */}
      {!isLoadingPatterns && patterns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-12 h-12 text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No patterns found</h3>
          <p className="text-sm text-gray-500 max-w-md">
            {filters.search
              ? `No patterns match "${filters.search}". Try a different search term.`
              : 'Be the first to share a refactoring pattern with the community!'}
          </p>
        </div>
      )}
    </div>
  );
}
