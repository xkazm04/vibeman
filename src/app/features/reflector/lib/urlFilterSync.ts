/**
 * URL Filter Sync Helpers
 * Sync filters with URL search parameters
 */

import { FilterState } from './filterIdeas';
import { SuggestionFilter } from './unifiedTypes';

/**
 * Parse filters from URL search params
 */
export function parseFiltersFromURL(searchParams: URLSearchParams): FilterState {
  const projectIds = searchParams.get('projects')?.split(',').filter(Boolean) || [];
  const contextIds = searchParams.get('contexts')?.split(',').filter(Boolean) || [];
  const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || [];
  const scanTypes = searchParams.get('scanTypes')?.split(',').filter(Boolean) || [];
  const effortLevels = searchParams.get('effortLevels')?.split(',').filter(Boolean) || [];
  const impactLevels = searchParams.get('impactLevels')?.split(',').filter(Boolean) || [];
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const searchQuery = searchParams.get('search') || '';
  const weekOffset = parseInt(searchParams.get('weekOffset') || '0', 10);
  const typeParam = searchParams.get('type');
  const suggestionType: SuggestionFilter =
    (typeParam === 'ideas' || typeParam === 'directions' || typeParam === 'both')
      ? typeParam : 'both';

  return {
    projectIds,
    contextIds,
    statuses,
    scanTypes,
    effortLevels,
    impactLevels,
    dateRange: {
      start: startDate ? new Date(startDate) : null,
      end: endDate ? new Date(endDate) : null,
    },
    searchQuery,
    weekOffset,
    suggestionType,
  };
}

/** @deprecated Use parseFiltersFromURL instead */
export const parseUnifiedFiltersFromURL = parseFiltersFromURL;

/**
 * Build URL params from filters
 */
export function buildURLFromFilters(filters: FilterState, basePath: string = '/reflector'): string {
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
  if (filters.scanTypes.length > 0) {
    params.set('scanTypes', filters.scanTypes.join(','));
  }
  if (filters.effortLevels.length > 0) {
    params.set('effortLevels', filters.effortLevels.join(','));
  }
  if (filters.impactLevels.length > 0) {
    params.set('impactLevels', filters.impactLevels.join(','));
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
  if (filters.suggestionType && filters.suggestionType !== 'both') {
    params.set('type', filters.suggestionType);
  }
  if (filters.weekOffset && filters.weekOffset !== 0) {
    params.set('weekOffset', filters.weekOffset.toString());
  }

  return params.toString() ? `${basePath}?${params.toString()}` : basePath;
}

/** @deprecated Use buildURLFromFilters instead */
export const buildURLFromUnifiedFilters = buildURLFromFilters;

/**
 * Remove a filter value from the filter state
 */
export function removeFilterValue(
  filters: FilterState,
  filterType: keyof FilterState,
  value?: string
): FilterState {
  const newFilters = { ...filters };

  if (filterType === 'projectIds' && value) {
    newFilters.projectIds = newFilters.projectIds.filter(id => id !== value);
  } else if (filterType === 'contextIds' && value) {
    newFilters.contextIds = newFilters.contextIds.filter(id => id !== value);
  } else if (filterType === 'statuses' && value) {
    newFilters.statuses = newFilters.statuses.filter(s => s !== value);
  } else if (filterType === 'scanTypes' && value) {
    newFilters.scanTypes = newFilters.scanTypes.filter(s => s !== value);
  } else if (filterType === 'effortLevels' && value) {
    newFilters.effortLevels = newFilters.effortLevels.filter(e => e !== value);
  } else if (filterType === 'impactLevels' && value) {
    newFilters.impactLevels = newFilters.impactLevels.filter(i => i !== value);
  } else if (filterType === 'dateRange') {
    newFilters.dateRange = { start: null, end: null };
  } else if (filterType === 'searchQuery') {
    newFilters.searchQuery = '';
  }

  return newFilters;
}














