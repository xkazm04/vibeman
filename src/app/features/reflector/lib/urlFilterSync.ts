/**
 * URL Filter Sync Helpers
 * Sync filters with URL search parameters
 */

import { IdeaFilterState, UnifiedFilterState } from './filterIdeas';
import { SuggestionFilter } from './unifiedTypes';

/**
 * Parse filters from URL search params
 */
export function parseFiltersFromURL(searchParams: URLSearchParams): IdeaFilterState {
  const projectIds = searchParams.get('projects')?.split(',').filter(Boolean) || [];
  const contextIds = searchParams.get('contexts')?.split(',').filter(Boolean) || [];
  const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || [];
  const scanTypes = searchParams.get('scanTypes')?.split(',').filter(Boolean) || [];
  const effortLevels = searchParams.get('effortLevels')?.split(',').filter(Boolean) || [];
  const impactLevels = searchParams.get('impactLevels')?.split(',').filter(Boolean) || [];
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const searchQuery = searchParams.get('search') || '';

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
  };
}

/**
 * Build URL params from filters
 */
export function buildURLFromFilters(filters: IdeaFilterState, basePath: string = '/reflector'): string {
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

  return params.toString() ? `${basePath}?${params.toString()}` : basePath;
}

/**
 * Parse suggestion type from URL
 */
export function parseSuggestionTypeFromURL(searchParams: URLSearchParams): SuggestionFilter {
  const type = searchParams.get('type');
  if (type === 'ideas' || type === 'directions' || type === 'both') {
    return type;
  }
  return 'both'; // Default to both
}

/**
 * Parse unified filters from URL search params
 */
export function parseUnifiedFiltersFromURL(searchParams: URLSearchParams): UnifiedFilterState {
  const baseFilters = parseFiltersFromURL(searchParams);
  const suggestionType = parseSuggestionTypeFromURL(searchParams);
  const weekOffset = parseInt(searchParams.get('weekOffset') || '0', 10);

  return {
    ...baseFilters,
    suggestionType,
    weekOffset,
  };
}

/**
 * Build URL params from unified filters
 */
export function buildURLFromUnifiedFilters(
  filters: UnifiedFilterState,
  basePath: string = '/reflector'
): string {
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
  if (filters.suggestionType !== 'both') {
    params.set('type', filters.suggestionType);
  }
  if (filters.weekOffset !== 0) {
    params.set('weekOffset', filters.weekOffset.toString());
  }

  return params.toString() ? `${basePath}?${params.toString()}` : basePath;
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














