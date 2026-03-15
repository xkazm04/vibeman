/**
 * Two-layer Tinder hook architecture:
 *   Layer 1 – useTinderItems: owns all shared state, delegates to one mode hook.
 *   Layer 2 – useLocalMode / useRemoteMode: mode-specific data fetching and handlers.
 *
 * Shared keyset pagination (loading guard + cursor refs + load-more check) is
 * extracted into useCursorPagination, consumed by both mode hooks.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  TinderItem,
  TinderFilterMode,
  TinderItemStats,
  CategoryCount,
  ScanTypeCount,
  ContextCountItem,
  FilterDimension,
  PrerequisiteNotification,
  initialTinderItemStats,
  isIdeaItem,
} from './tinderTypes';
import type { UseTinderItemsResult } from './tinderTypes';
import type { UseTinderItemsCoreResult } from './useTinderItemsCore';
import { useLocalMode } from './useLocalTinderItems';
import { useRemoteMode } from './useRemoteTinderItems';

interface UseTinderItemsOptions {
  selectedProjectId: string;
  remoteDeviceId?: string | null;
  effortRange?: [number, number] | null;
  riskRange?: [number, number] | null;
  sortOrder?: 'asc' | 'desc';
}

export function useTinderItems(
  selectedProjectIdOrOptions: string | UseTinderItemsOptions
): UseTinderItemsResult {
  const options = typeof selectedProjectIdOrOptions === 'string'
    ? { selectedProjectId: selectedProjectIdOrOptions, remoteDeviceId: null }
    : selectedProjectIdOrOptions;

  const {
    selectedProjectId,
    remoteDeviceId = null,
    effortRange = null,
    riskRange = null,
    sortOrder = 'asc',
  } = options;

  const isRemoteMode = !!remoteDeviceId;
  const initialFilterMode: TinderFilterMode = isRemoteMode ? 'directions' : 'both';

  // ── Shared state (Layer 1 owns all state; modes only own their refs) ────
  const [items, setItems] = useState<TinderItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TinderItemStats>(initialTinderItemStats);
  const [filterMode, setFilterMode] = useState<TinderFilterMode>(initialFilterMode);
  const [counts, setCounts] = useState({ ideas: 0, directions: 0 });
  const [goalTitlesMap, setGoalTitlesMap] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [filterDimension, setFilterDimension] = useState<FilterDimension>('category');
  const [selectedScanType, setSelectedScanType] = useState<string | null>(null);
  const [scanTypes, setScanTypes] = useState<ScanTypeCount[]>([]);
  const [scanTypesLoading, setScanTypesLoading] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [contextCounts, setContextCounts] = useState<ContextCountItem[]>([]);
  const [contextCountsLoading, setContextCountsLoading] = useState(false);
  const [prerequisiteNotification, setPrerequisiteNotification] = useState<PrerequisiteNotification | null>(null);

  const combinedStats = {
    accepted: stats.ideas.accepted + stats.directions.accepted,
    rejected: stats.ideas.rejected + stats.directions.rejected,
    deleted: stats.ideas.deleted + stats.directions.deleted,
  };

  const updateStats = useCallback((item: TinderItem, action: 'accepted' | 'rejected' | 'deleted') => {
    setStats(prev => {
      const type = isIdeaItem(item) ? 'ideas' : 'directions';
      return { ...prev, [type]: { ...prev[type], [action]: prev[type][action] + 1 } };
    });
  }, []);

  const updateCategoryCountOptimistic = useCallback((item: TinderItem) => {
    if (!isIdeaItem(item)) return;
    const category = item.data.category;
    setCategories(prev =>
      prev
        .map(cat => cat.category === category ? { ...cat, count: Math.max(0, cat.count - 1) } : cat)
        .filter(cat => cat.count > 0)
    );
  }, []);

  const updateCountsOptimistic = useCallback((type: 'ideas' | 'directions', decrement = 1) => {
    setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - decrement) }));
  }, []);

  const optimisticRemove = useCallback((index: number): TinderItem | undefined => {
    let removed: TinderItem | undefined;
    setItems(prev => {
      removed = prev[index];
      return prev.filter((_, i) => i !== index);
    });
    return removed;
  }, []);

  const revertRemove = useCallback((index: number, item: TinderItem) => {
    setItems(prev => {
      const next = [...prev];
      next.splice(index, 0, item);
      return next;
    });
  }, []);

  const resetStats = useCallback(() => setStats(initialTinderItemStats), []);

  const handleSetFilterMode = useCallback((mode: TinderFilterMode) => {
    setFilterMode(mode);
    if (mode !== 'ideas') setSelectedCategory(null);
  }, []);

  const handleSetCategory = useCallback((category: string | null) => setSelectedCategory(category), []);

  const handleSetFilterDimension = useCallback((dimension: FilterDimension) => {
    setFilterDimension(dimension);
    setSelectedCategory(null);
    setSelectedScanType(null);
  }, []);

  const handleSetScanType = useCallback((scanType: string | null) => setSelectedScanType(scanType), []);
  const handleSetContextId = useCallback((contextId: string | null) => setSelectedContextId(contextId), []);
  const dismissPrerequisiteNotification = useCallback(() => setPrerequisiteNotification(null), []);

  // ── Pass state to mode hooks ─────────────────────────────────────────────
  const core: UseTinderItemsCoreResult = {
    items, currentIndex, loading, processing, hasMore, total,
    stats, combinedStats, filterMode, counts, goalTitlesMap,
    selectedCategory, categories, categoriesLoading,
    filterDimension, selectedScanType, scanTypes, scanTypesLoading,
    selectedContextId, contextCounts, contextCountsLoading,
    prerequisiteNotification,
    setItems, setCurrentIndex, setLoading, setProcessing, setHasMore, setTotal,
    setStats, setCounts, setGoalTitlesMap,
    setCategories, setCategoriesLoading,
    setScanTypes, setScanTypesLoading,
    setContextCounts, setContextCountsLoading,
    setPrerequisiteNotification,
    updateStats, updateCategoryCountOptimistic, updateCountsOptimistic,
    optimisticRemove, revertRemove, resetStats,
    handleSetFilterMode, handleSetCategory, handleSetFilterDimension,
    handleSetScanType, handleSetContextId, dismissPrerequisiteNotification,
  };

  // ── Mode hooks — both always called (Rules of Hooks); only one is active ─
  const local = useLocalMode(core, {
    selectedProjectId, effortRange, riskRange, sortOrder, enabled: !isRemoteMode,
  });

  const remote = useRemoteMode(core, {
    remoteDeviceId: remoteDeviceId || '', enabled: isRemoteMode,
  });

  const active = isRemoteMode ? remote : local;

  return {
    items,
    currentIndex,
    loading,
    processing,
    hasMore,
    total,
    stats,
    combinedStats,
    remainingCount: items.length - currentIndex,
    currentItem: items[currentIndex],
    filterMode,
    counts,
    goalTitlesMap,
    selectedCategory,
    categories,
    categoriesLoading,
    setCategory: handleSetCategory,
    setFilterMode: handleSetFilterMode,
    filterDimension,
    setFilterDimension: handleSetFilterDimension,
    selectedScanType,
    setScanType: handleSetScanType,
    scanTypes,
    scanTypesLoading,
    selectedContextId,
    setContextId: handleSetContextId,
    contextCounts,
    contextCountsLoading,
    handleAccept: active.handleAccept,
    handleReject: active.handleReject,
    handleDelete: active.handleDelete,
    handleAcceptIdeaVariant: active.handleAcceptIdeaVariant,
    handleAcceptPairVariant: active.handleAcceptPairVariant,
    handleRejectPair: active.handleRejectPair,
    handleDeletePair: active.handleDeletePair,
    resetStats,
    loadItems: active.loadItems,
    prerequisiteNotification,
    dismissPrerequisiteNotification,
  };
}

/**
 * Keyboard shortcuts for tinder items (same as ideas)
 */
export function useTinderItemsKeyboardShortcuts(
  handleAccept: () => void,
  handleReject: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); handleReject(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleAccept(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAccept, handleReject, enabled]);
}
