'use client';

import { useState, useMemo, useCallback, useDeferredValue } from 'react';
import type { FeedbackItem } from '../lib/types/feedbackTypes';
import type { FilterState } from '../lib/types/filterTypes';
import { DEFAULT_FILTER_STATE } from '../lib/types/filterTypes';

function getItemSLAStatus(item: FeedbackItem): 'ok' | 'warning' | 'critical' | 'overdue' {
  if (item.status === 'done') return 'ok';
  const now = Date.now();
  const created = new Date(item.timestamp).getTime();
  const ageMinutes = (now - created) / (1000 * 60);

  const thresholds = {
    critical: { warning: 30, critical: 60, overdue: 120 },
    high: { warning: 120, critical: 240, overdue: 480 },
    medium: { warning: 480, critical: 1440, overdue: 2880 },
    low: { warning: 1440, critical: 2880, overdue: 4320 },
  }[item.priority];

  if (ageMinutes >= thresholds.overdue) return 'overdue';
  if (ageMinutes >= thresholds.critical) return 'critical';
  if (ageMinutes >= thresholds.warning) return 'warning';
  return 'ok';
}

function matchesSearch(item: FeedbackItem, search: string): boolean {
  if (!search) return true;
  const searchLower = search.toLowerCase();

  return (
    item.content.body.toLowerCase().includes(searchLower) ||
    (item.content.subject?.toLowerCase().includes(searchLower) ?? false) ||
    item.author.name.toLowerCase().includes(searchLower) ||
    (item.author.handle?.toLowerCase().includes(searchLower) ?? false) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
    (item.analysis?.bugTag?.toLowerCase().includes(searchLower) ?? false)
  );
}

function matchesDateRange(item: FeedbackItem, dateRange: FilterState['dateRange']): boolean {
  if (dateRange.preset === 'all') return true;

  const itemDate = new Date(item.timestamp);
  const now = new Date();

  if (dateRange.preset === 'today') {
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    return itemDate >= startOfDay;
  }
  if (dateRange.preset === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return itemDate >= weekAgo;
  }
  if (dateRange.preset === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return itemDate >= monthAgo;
  }
  if (dateRange.from && itemDate < dateRange.from) return false;
  if (dateRange.to && itemDate > dateRange.to) return false;
  return true;
}

export function useFilters(items: FeedbackItem[]) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const deferredFilters = useDeferredValue(filters);

  const setFilter = useCallback(<K extends keyof FilterState>(
    field: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
  }, []);

  const toggleArrayFilter = useCallback(<T extends string>(
    field: 'channels' | 'priorities' | 'sentiments' | 'statuses' | 'slaStatuses',
    value: T
  ) => {
    setFilters(prev => {
      const current = prev[field] as T[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!matchesSearch(item, deferredFilters.search)) return false;
      if (deferredFilters.channels.length && !deferredFilters.channels.includes(item.channel)) return false;
      if (deferredFilters.priorities.length && !deferredFilters.priorities.includes(item.priority)) return false;
      if (deferredFilters.statuses.length && !deferredFilters.statuses.includes(item.status)) return false;
      if (deferredFilters.sentiments.length) {
        const sentiment = item.analysis?.sentiment;
        if (!sentiment || !deferredFilters.sentiments.includes(sentiment)) return false;
      }
      if (deferredFilters.slaStatuses.length) {
        const slaStatus = getItemSLAStatus(item);
        if (!deferredFilters.slaStatuses.includes(slaStatus)) return false;
      }
      if (!matchesDateRange(item, deferredFilters.dateRange)) return false;
      return true;
    });
  }, [items, deferredFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.channels.length) count++;
    if (filters.priorities.length) count++;
    if (filters.sentiments.length) count++;
    if (filters.statuses.length) count++;
    if (filters.slaStatuses.length) count++;
    if (filters.dateRange.preset !== 'all') count++;
    return count;
  }, [filters]);

  const isFiltering = filters !== deferredFilters;

  return {
    filters,
    setFilter,
    clearFilters,
    toggleArrayFilter,
    filteredItems,
    activeFilterCount,
    totalCount: items.length,
    filteredCount: filteredItems.length,
    isFiltering,
  };
}
