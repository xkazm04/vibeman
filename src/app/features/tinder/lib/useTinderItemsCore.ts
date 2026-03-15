/**
 * Types shared by local and remote tinder mode hooks.
 * State is owned directly by useTinderItems; modes receive it via this interface.
 * Pagination refs (loadingRef, nextCursorRef) are managed per-mode by useCursorPagination.
 */

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
  filterDimension: FilterDimension;
  selectedScanType: string | null;
  scanTypes: ScanTypeCount[];
  scanTypesLoading: boolean;
  selectedContextId: string | null;
  contextCounts: ContextCountItem[];
  contextCountsLoading: boolean;
  prerequisiteNotification: PrerequisiteNotification | null;
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
  optimisticRemove: (index: number) => TinderItem | undefined;
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
