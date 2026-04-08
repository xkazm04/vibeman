'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { InsightType, SortField, SortDir } from '../components/InsightsTable';

// ============================================================================
// TYPES
// ============================================================================

export interface InsightFilterState {
  typeFilter: InsightType | 'all' | 'conflicts';
  sortField: SortField;
  sortDir: SortDir;
  searchQuery: string;
  tagFilter: string | null;
}

export interface SavedView {
  id: string;
  name: string;
  filters: InsightFilterState;
  isPreset?: boolean;
  createdAt: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'brain-insight-saved-views';

const DEFAULT_FILTERS: InsightFilterState = {
  typeFilter: 'all',
  sortField: 'confidence',
  sortDir: 'desc',
  searchQuery: '',
  tagFilter: null,
};

const PRESET_VIEWS: SavedView[] = [
  {
    id: 'preset-high-confidence',
    name: 'High Confidence Patterns',
    filters: {
      typeFilter: 'pattern_detected',
      sortField: 'confidence',
      sortDir: 'desc',
      searchQuery: '',
      tagFilter: null,
    },
    isPreset: true,
    createdAt: 0,
  },
  {
    id: 'preset-unresolved-conflicts',
    name: 'Unresolved Conflicts',
    filters: {
      typeFilter: 'conflicts',
      sortField: 'confidence',
      sortDir: 'desc',
      searchQuery: '',
      tagFilter: null,
    },
    isPreset: true,
    createdAt: 0,
  },
  {
    id: 'preset-warnings',
    name: 'Active Warnings',
    filters: {
      typeFilter: 'warning',
      sortField: 'confidence',
      sortDir: 'desc',
      searchQuery: '',
      tagFilter: null,
    },
    isPreset: true,
    createdAt: 0,
  },
];

// ============================================================================
// URL ENCODING / DECODING
// ============================================================================

const PARAM_MAP = {
  typeFilter: 'type',
  sortField: 'sort',
  sortDir: 'dir',
  searchQuery: 'q',
  tagFilter: 'tag',
} as const;

function encodeFiltersToParams(filters: InsightFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.typeFilter !== 'all') params.set(PARAM_MAP.typeFilter, filters.typeFilter);
  if (filters.sortField !== 'confidence') params.set(PARAM_MAP.sortField, filters.sortField);
  if (filters.sortDir !== 'desc') params.set(PARAM_MAP.sortDir, filters.sortDir);
  if (filters.searchQuery) params.set(PARAM_MAP.searchQuery, filters.searchQuery);
  if (filters.tagFilter) params.set(PARAM_MAP.tagFilter, filters.tagFilter);
  return params;
}

const VALID_TYPE_FILTERS = new Set<string>(['all', 'conflicts', 'preference_learned', 'pattern_detected', 'warning', 'recommendation', 'best_practice']);
const VALID_SORT_FIELDS = new Set<string>(['type', 'title', 'confidence', 'evidence']);
const VALID_SORT_DIRS = new Set<string>(['asc', 'desc']);

function decodeFiltersFromParams(params: URLSearchParams): InsightFilterState | null {
  // Only decode if at least one insight filter param is present
  const hasParams = [PARAM_MAP.typeFilter, PARAM_MAP.sortField, PARAM_MAP.sortDir, PARAM_MAP.searchQuery, PARAM_MAP.tagFilter]
    .some(key => params.has(key));
  if (!hasParams) return null;

  const typeRaw = params.get(PARAM_MAP.typeFilter) ?? 'all';
  const sortRaw = params.get(PARAM_MAP.sortField) ?? 'confidence';
  const dirRaw = params.get(PARAM_MAP.sortDir) ?? 'desc';

  return {
    typeFilter: (VALID_TYPE_FILTERS.has(typeRaw) ? typeRaw : 'all') as InsightFilterState['typeFilter'],
    sortField: (VALID_SORT_FIELDS.has(sortRaw) ? sortRaw : 'confidence') as SortField,
    sortDir: (VALID_SORT_DIRS.has(dirRaw) ? dirRaw : 'desc') as SortDir,
    searchQuery: params.get(PARAM_MAP.searchQuery) ?? '',
    tagFilter: params.get(PARAM_MAP.tagFilter) ?? null,
  };
}

// ============================================================================
// LOCAL STORAGE
// ============================================================================

function loadSavedViews(): SavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function persistSavedViews(views: SavedView[]) {
  if (typeof window === 'undefined') return;
  try {
    // Only persist user-created views, not presets
    const userViews = views.filter(v => !v.isPreset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userViews));
  } catch { /* localStorage full or unavailable */ }
}

// ============================================================================
// HOOK
// ============================================================================

export function useInsightFilterViews() {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [filters, setFilters] = useState<InsightFilterState>(DEFAULT_FILTERS);

  // All views = presets + user-created
  const allViews = useMemo(() => [...PRESET_VIEWS, ...savedViews], [savedViews]);

  // Initialize from URL params on mount, then from localStorage
  useEffect(() => {
    const userViews = loadSavedViews();
    setSavedViews(userViews);

    // Check URL for shared filter state
    const params = new URLSearchParams(window.location.search);
    const urlFilters = decodeFiltersFromParams(params);
    if (urlFilters) {
      setFilters(urlFilters);
      // Check if URL matches a saved view
      const allAvailable = [...PRESET_VIEWS, ...userViews];
      const match = allAvailable.find(v => filtersEqual(v.filters, urlFilters));
      if (match) setActiveViewId(match.id);
    }
  }, []);

  // Apply a saved view
  const applyView = useCallback((viewId: string) => {
    const view = [...PRESET_VIEWS, ...savedViews].find(v => v.id === viewId);
    if (!view) return;
    setFilters(view.filters);
    setActiveViewId(viewId);
    updateUrl(view.filters);
  }, [savedViews]);

  // Save current filters as a new view
  const saveCurrentView = useCallback((name: string) => {
    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name,
      filters: { ...filters },
      createdAt: Date.now(),
    };
    setSavedViews(prev => {
      const next = [...prev, newView];
      persistSavedViews(next);
      return next;
    });
    setActiveViewId(newView.id);
    return newView;
  }, [filters]);

  // Delete a user-created view
  const deleteView = useCallback((viewId: string) => {
    setSavedViews(prev => {
      const next = prev.filter(v => v.id !== viewId);
      persistSavedViews(next);
      return next;
    });
    if (activeViewId === viewId) setActiveViewId(null);
  }, [activeViewId]);

  // Update filters (clears active view if filters diverge)
  const updateFilters = useCallback((partial: Partial<InsightFilterState>) => {
    setFilters(prev => {
      const next = { ...prev, ...partial };
      // Check if new state matches active view
      const allAvailable = [...PRESET_VIEWS, ...savedViews];
      const match = allAvailable.find(v => filtersEqual(v.filters, next));
      setActiveViewId(match?.id ?? null);
      updateUrl(next);
      return next;
    });
  }, [savedViews]);

  // Reset to default
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setActiveViewId(null);
    updateUrl(DEFAULT_FILTERS);
  }, []);

  // Generate a shareable URL for the current filter state
  const getShareableUrl = useCallback(() => {
    const params = encodeFiltersToParams(filters);
    const url = new URL(window.location.href);
    // Clear existing insight params
    for (const key of Object.values(PARAM_MAP)) {
      url.searchParams.delete(key);
    }
    // Add current filters
    params.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  }, [filters]);

  const hasActiveFilters = filters.typeFilter !== 'all' || filters.sortField !== 'confidence' || filters.sortDir !== 'desc' || filters.searchQuery !== '' || filters.tagFilter !== null;

  return {
    filters,
    updateFilters,
    resetFilters,
    allViews,
    activeViewId,
    applyView,
    saveCurrentView,
    deleteView,
    getShareableUrl,
    hasActiveFilters,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function filtersEqual(a: InsightFilterState, b: InsightFilterState): boolean {
  return (
    a.typeFilter === b.typeFilter &&
    a.sortField === b.sortField &&
    a.sortDir === b.sortDir &&
    a.searchQuery === b.searchQuery &&
    a.tagFilter === b.tagFilter
  );
}

function updateUrl(filters: InsightFilterState) {
  if (typeof window === 'undefined') return;
  const params = encodeFiltersToParams(filters);
  const url = new URL(window.location.href);
  // Clear existing insight params
  for (const key of Object.values(PARAM_MAP)) {
    url.searchParams.delete(key);
  }
  // Add non-default filters
  params.forEach((value, key) => url.searchParams.set(key, value));
  window.history.replaceState({}, '', url.toString());
}
