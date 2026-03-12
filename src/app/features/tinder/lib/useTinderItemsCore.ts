/**
 * Core state & helpers shared by local and remote tinder composables.
 * Owns: items list, currentIndex, stats, category state, optimistic updates.
 */

import { useState, useCallback, useRef } from 'react';
import {
  TinderItem,
  TinderFilterMode,
  TinderItemStats,
  TinderCombinedStats,
  CategoryCount,
  ScanTypeCount,
  ContextCountItem,
  FilterDimension,
  PrerequisiteNotification,
  initialTinderItemStats,
  isIdeaItem,
} from './tinderTypes';

export interface TinderCoreState {
  items: TinderItem[];
  currentIndex: number;
  loading: boolean;
  processing: boolean;
  hasMore: boolean;
  total: number;
  stats: TinderItemStats;
  combinedStats: TinderCombinedStats;
  filterMode: TinderFilterMode;
  counts: { ideas: number; directions: number };
  goalTitlesMap: Record<string, string>;
  selectedCategory: string | null;
  categories: CategoryCount[];
  categoriesLoading: boolean;
  // Scan type filter
  filterDimension: FilterDimension;
  selectedScanType: string | null;
  scanTypes: ScanTypeCount[];
  scanTypesLoading: boolean;
  // Context filter
  selectedContextId: string | null;
  contextCounts: ContextCountItem[];
  contextCountsLoading: boolean;
  prerequisiteNotification: PrerequisiteNotification | null;
  /** Synchronous loading guard — prevents double-fetches on rapid swipe */
  loadingRef: React.MutableRefObject<boolean>;
  /** Keyset cursor — ID of the last item from the most recent server response */
  nextCursorRef: React.MutableRefObject<string | null>;
}

export interface TinderCoreActions {
  setItems: React.Dispatch<React.SetStateAction<TinderItem[]>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  setStats: React.Dispatch<React.SetStateAction<TinderItemStats>>;
  setCounts: React.Dispatch<React.SetStateAction<{ ideas: number; directions: number }>>;
  setGoalTitlesMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCategories: React.Dispatch<React.SetStateAction<CategoryCount[]>>;
  setCategoriesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setScanTypes: React.Dispatch<React.SetStateAction<ScanTypeCount[]>>;
  setScanTypesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setContextCounts: React.Dispatch<React.SetStateAction<ContextCountItem[]>>;
  setContextCountsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPrerequisiteNotification: React.Dispatch<React.SetStateAction<PrerequisiteNotification | null>>;
  updateStats: (item: TinderItem, action: 'accepted' | 'rejected' | 'deleted') => void;
  updateCategoryCountOptimistic: (item: TinderItem) => void;
  updateCountsOptimistic: (type: 'ideas' | 'directions', decrement?: number) => void;
  /** Optimistically remove an item and return it for potential revert */
  optimisticRemove: (index: number) => TinderItem | undefined;
  /** Revert an optimistic removal */
  revertRemove: (index: number, item: TinderItem) => void;
  resetStats: () => void;
  handleSetFilterMode: (mode: TinderFilterMode) => void;
  handleSetCategory: (category: string | null) => void;
  handleSetFilterDimension: (dimension: FilterDimension) => void;
  handleSetScanType: (scanType: string | null) => void;
  handleSetContextId: (contextId: string | null) => void;
  dismissPrerequisiteNotification: () => void;
}

export type UseTinderItemsCoreResult = TinderCoreState & TinderCoreActions;

export function useTinderItemsCore(initialFilterMode: TinderFilterMode): UseTinderItemsCoreResult {
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

  const loadingRef = useRef(false);
  const nextCursorRef = useRef<string | null>(null);

  const combinedStats: TinderCombinedStats = {
    accepted: stats.ideas.accepted + stats.directions.accepted,
    rejected: stats.ideas.rejected + stats.directions.rejected,
    deleted: stats.ideas.deleted + stats.directions.deleted,
  };

  const updateStats = useCallback((item: TinderItem, action: 'accepted' | 'rejected' | 'deleted') => {
    setStats(prev => {
      const type = isIdeaItem(item) ? 'ideas' : 'directions';
      return {
        ...prev,
        [type]: {
          ...prev[type],
          [action]: prev[type][action] + 1,
        },
      };
    });
  }, []);

  const updateCategoryCountOptimistic = useCallback((item: TinderItem) => {
    if (!isIdeaItem(item)) return;
    const category = item.data.category;
    setCategories(prev =>
      prev.map(cat =>
        cat.category === category
          ? { ...cat, count: Math.max(0, cat.count - 1) }
          : cat
      ).filter(cat => cat.count > 0)
    );
  }, []);

  const updateCountsOptimistic = useCallback((type: 'ideas' | 'directions', decrement: number = 1) => {
    setCounts(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] - decrement),
    }));
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
      const newItems = [...prev];
      newItems.splice(index, 0, item);
      return newItems;
    });
  }, []);

  const resetStats = useCallback(() => {
    setStats(initialTinderItemStats);
  }, []);

  const handleSetFilterMode = useCallback((mode: TinderFilterMode) => {
    setFilterMode(mode);
    if (mode !== 'ideas') {
      setSelectedCategory(null);
    }
  }, []);

  const handleSetCategory = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  const handleSetFilterDimension = useCallback((dimension: FilterDimension) => {
    setFilterDimension(dimension);
    // Clear both selections when switching dimensions
    setSelectedCategory(null);
    setSelectedScanType(null);
  }, []);

  const handleSetScanType = useCallback((scanType: string | null) => {
    setSelectedScanType(scanType);
  }, []);

  const handleSetContextId = useCallback((contextId: string | null) => {
    setSelectedContextId(contextId);
  }, []);

  const dismissPrerequisiteNotification = useCallback(() => {
    setPrerequisiteNotification(null);
  }, []);

  return {
    // State
    items,
    currentIndex,
    loading,
    processing,
    hasMore,
    total,
    stats,
    combinedStats,
    filterMode,
    counts,
    goalTitlesMap,
    selectedCategory,
    categories,
    categoriesLoading,
    filterDimension,
    selectedScanType,
    scanTypes,
    scanTypesLoading,
    selectedContextId,
    contextCounts,
    contextCountsLoading,
    prerequisiteNotification,
    loadingRef,
    nextCursorRef,
    // Actions
    setItems,
    setCurrentIndex,
    setLoading,
    setProcessing,
    setHasMore,
    setTotal,
    setStats,
    setCounts,
    setGoalTitlesMap,
    setCategories,
    setCategoriesLoading,
    setScanTypes,
    setScanTypesLoading,
    setContextCounts,
    setContextCountsLoading,
    setPrerequisiteNotification,
    updateStats,
    updateCategoryCountOptimistic,
    updateCountsOptimistic,
    optimisticRemove,
    revertRemove,
    resetStats,
    handleSetFilterMode,
    handleSetCategory,
    handleSetFilterDimension,
    handleSetScanType,
    handleSetContextId,
    dismissPrerequisiteNotification,
  };
}
