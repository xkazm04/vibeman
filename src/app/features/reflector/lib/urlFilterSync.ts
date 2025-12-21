/**
 * URL Filter Sync Helpers
 * Sync filters with URL search parameters
 */

import { IdeaFilterState } from './filterIdeas';

/**
 * Parse filters from URL search params
 */
export function parseFiltersFromURL(searchParams: URLSearchParams): IdeaFilterState {
  const projectIds = searchParams.get('projects')?.split(',').filter(Boolean) || [];
  const contextIds = searchParams.get('contexts')?.split(',').filter(Boolean) || [];
  const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || [];
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const searchQuery = searchParams.get('search') || '';

  return {
    projectIds,
    contextIds,
    statuses,
    dateRange: {
      start: startDate ? new Date(startDate) : null,
      end: endDate ? new Date(endDate) : null,
    },
    searchQuery,
  };
}

/**
 * Build URL params from filters
 */
export function buildURLFromFilters(filters: IdeaFilterState): string {
  const params = new URLSearchParams();
  
  if (filters.projectIds.length > 0) {
    params.set('projects', filters.projectIds.join(','));
  }
  if (filters.contextIds.length > 0) {
    params.set('contexts', filters.contextIds.join(','));
  }
  if (filters.statuses.length > 0) {
    params.set('statuses', filters.statuses.join(','));
  }
  if (filters.dateRange.start) {
    params.set('startDate', filters.dateRange.start.toISOString());
  }
  if (filters.dateRange.end) {
    params.set('endDate', filters.dateRange.end.toISOString());
  }
  if (filters.searchQuery.trim()) {
    params.set('search', filters.searchQuery);
  }

  return params.toString() ? `?${params.toString()}` : '/reflector';
}

/**
 * Remove a filter value from the filter state
 */
export function removeFilterValue(
  filters: IdeaFilterState,
  filterType: keyof IdeaFilterState,
  value?: string
): IdeaFilterState {
  const newFilters = { ...filters };

  if (filterType === 'projectIds' && value) {
    newFilters.projectIds = newFilters.projectIds.filter(id => id !== value);
  } else if (filterType === 'contextIds' && value) {
    newFilters.contextIds = newFilters.contextIds.filter(id => id !== value);
  } else if (filterType === 'statuses' && value) {
    newFilters.statuses = newFilters.statuses.filter(s => s !== value);
  } else if (filterType === 'dateRange') {
    newFilters.dateRange = { start: null, end: null };
  } else if (filterType === 'searchQuery') {
    newFilters.searchQuery = '';
  }

  return newFilters;
}














