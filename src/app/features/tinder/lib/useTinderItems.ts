/**
 * Custom hook for unified Tinder functionality (Ideas + Directions)
 * Supports both local and remote modes via optional remoteDeviceId parameter.
 *
 * Delegates to composables:
 * - useTinderItemsCore: shared state, stats, category management
 * - useLocalTinderItems: local DB fetching, pagination, local CRUD
 * - useRemoteTinderItems: remote mesh commands, polling, remote triage
 */

import { useEffect } from 'react';
import type { UseTinderItemsResult } from './tinderTypes';
import { useTinderItemsCore } from './useTinderItemsCore';
import { useLocalTinderItems } from './useLocalTinderItems';
import { useRemoteTinderItems } from './useRemoteTinderItems';

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
  // Normalize parameters to support both old signature and new options object
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

  // Shared state & helpers
  const core = useTinderItemsCore(isRemoteMode ? 'directions' : 'both');

  // Both composables are always called (Rules of Hooks) but only one is "active"
  const local = useLocalTinderItems(core, {
    selectedProjectId,
    effortRange,
    riskRange,
    sortOrder,
    enabled: !isRemoteMode,
  });

  const remote = useRemoteTinderItems(core, {
    remoteDeviceId: remoteDeviceId || '',
    enabled: isRemoteMode,
  });

  // Pick the active composable's handlers
  const active = isRemoteMode ? remote : local;

  const currentItem = core.items[core.currentIndex];
  const remainingCount = core.items.length - core.currentIndex;

  return {
    items: core.items,
    currentIndex: core.currentIndex,
    loading: core.loading,
    processing: core.processing,
    hasMore: core.hasMore,
    total: core.total,
    stats: core.stats,
    combinedStats: core.combinedStats,
    remainingCount,
    currentItem,
    filterMode: core.filterMode,
    counts: core.counts,
    goalTitlesMap: core.goalTitlesMap,
    // Category filtering
    selectedCategory: core.selectedCategory,
    categories: core.categories,
    categoriesLoading: core.categoriesLoading,
    setCategory: core.handleSetCategory,
    setFilterMode: core.handleSetFilterMode,
    // Scan type filtering
    filterDimension: core.filterDimension,
    setFilterDimension: core.handleSetFilterDimension,
    selectedScanType: core.selectedScanType,
    setScanType: core.handleSetScanType,
    scanTypes: core.scanTypes,
    scanTypesLoading: core.scanTypesLoading,
    // Context filtering
    selectedContextId: core.selectedContextId,
    setContextId: core.handleSetContextId,
    contextCounts: core.contextCounts,
    contextCountsLoading: core.contextCountsLoading,
    handleAccept: active.handleAccept,
    handleReject: active.handleReject,
    handleDelete: active.handleDelete,
    // Idea variant handler
    handleAcceptIdeaVariant: active.handleAcceptIdeaVariant,
    // Paired direction handlers
    handleAcceptPairVariant: active.handleAcceptPairVariant,
    handleRejectPair: active.handleRejectPair,
    handleDeletePair: active.handleDeletePair,
    resetStats: core.resetStats,
    loadItems: active.loadItems,
    // Dependency awareness
    prerequisiteNotification: core.prerequisiteNotification,
    dismissPrerequisiteNotification: core.dismissPrerequisiteNotification,
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
      // Ignore if user is typing in an input or select
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleReject();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleAccept();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAccept, handleReject, enabled]);
}
