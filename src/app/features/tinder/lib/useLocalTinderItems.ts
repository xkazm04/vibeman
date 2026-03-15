/**
 * Local mode hook (Layer 2) — handles fetching from the local DB,
 * keyset cursor pagination via useCursorPagination, accept/reject/delete
 * via local API endpoints, and filter data loading.
 * All UI state lives in useTinderItems (Layer 1).
 */

import { useEffect, useCallback } from 'react';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import {
  isIdeaItem,
  isDirectionPairItem,
  getTinderItemProjectId,
} from './tinderTypes';
import {
  fetchTinderItems,
  acceptTinderItem,
  rejectTinderItem,
  deleteTinderItem,
  fetchIdeaCategories,
  fetchScanTypes,
  fetchContextCounts,
  acceptPairVariant,
  rejectDirectionPair,
  deleteDirectionPair,
} from './tinderItemsApi';
import { TINDER_CONSTANTS } from './tinderUtils';
import { useCursorPagination } from './useCursorPagination';
import type { UseTinderItemsCoreResult } from './useTinderItemsCore';

interface UseLocalModeOptions {
  selectedProjectId: string;
  effortRange: [number, number] | null;
  riskRange: [number, number] | null;
  sortOrder: 'asc' | 'desc';
  /** When false, effects don't fire (inactive mode). */
  enabled: boolean;
}

export function useLocalMode(
  core: UseTinderItemsCoreResult,
  options: UseLocalModeOptions
) {
  const { selectedProjectId, effortRange, riskRange, sortOrder, enabled } = options;
  const { getProject } = useServerProjectStore();

  const {
    items,
    currentIndex,
    processing,
    hasMore,
    filterMode,
    selectedCategory,
    filterDimension,
    selectedScanType,
    selectedContextId,
    setItems,
    setCurrentIndex,
    setLoading,
    setProcessing,
    setHasMore,
    setTotal,
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
    setStats,
  } = core;

  // Pagination state — loading guard + keyset cursor
  const { loadingRef, nextCursorRef, loadMoreIfNeeded } = useCursorPagination({
    hasMore,
    itemsLength: items.length,
    currentIndex,
    threshold: TINDER_CONSTANTS.LOAD_MORE_THRESHOLD,
  });

  // Determine active scan type (only when in scan_type dimension)
  const activeScanType = filterDimension === 'scan_type' ? selectedScanType : null;
  // Category only applies when in category dimension
  const activeCategory = filterDimension === 'category' ? selectedCategory : null;

  // Load items from local DB with keyset cursor pagination
  const loadItems = useCallback(async (afterId: string | null = null) => {
    loadingRef.current = true;
    setLoading(true);

    try {
      const result = await fetchTinderItems(
        selectedProjectId === 'all' ? undefined : selectedProjectId,
        filterMode,
        afterId,
        TINDER_CONSTANTS.BATCH_SIZE,
        activeCategory,
        effortRange,
        riskRange,
        sortOrder,
        activeScanType,
        selectedContextId,
      );

      if (!afterId) {
        // First page — replace items
        setItems(result.items);
        setCurrentIndex(0);
        setGoalTitlesMap(result.goalTitlesMap);
      } else {
        // Subsequent page — append items
        setItems(prev => [...prev, ...result.items]);
        setGoalTitlesMap(prev => ({ ...prev, ...result.goalTitlesMap }));
      }

      nextCursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
      setTotal(result.total);
      setCounts(result.counts);
    } catch (error) {
      console.error('Failed to load tinder items:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [selectedProjectId, filterMode, activeCategory, activeScanType, selectedContextId, effortRange, riskRange, sortOrder, setItems, setCurrentIndex, setLoading, setHasMore, setTotal, setCounts, setGoalTitlesMap]); // loadingRef and nextCursorRef are stable refs

  // Load idea categories for filtering
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const result = await fetchIdeaCategories(
        selectedProjectId === 'all' ? undefined : selectedProjectId
      );
      setCategories(result.categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, [selectedProjectId, setCategories, setCategoriesLoading]);

  // Load scan types for filtering
  const loadScanTypes = useCallback(async () => {
    setScanTypesLoading(true);
    try {
      const result = await fetchScanTypes(
        selectedProjectId === 'all' ? undefined : selectedProjectId
      );
      setScanTypes(result.scanTypes);
    } catch (error) {
      console.error('Failed to load scan types:', error);
      setScanTypes([]);
    } finally {
      setScanTypesLoading(false);
    }
  }, [selectedProjectId, setScanTypes, setScanTypesLoading]);

  // Load context counts for filtering
  const loadContextCounts = useCallback(async () => {
    setContextCountsLoading(true);
    try {
      const result = await fetchContextCounts(
        selectedProjectId === 'all' ? undefined : selectedProjectId
      );
      setContextCounts(result.contexts);
    } catch (error) {
      console.error('Failed to load context counts:', error);
      setContextCounts([]);
    } finally {
      setContextCountsLoading(false);
    }
  }, [selectedProjectId, setContextCounts, setContextCountsLoading]);

  // Accept handler
  const handleAccept = useCallback(async () => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      const projectId = getTinderItemProjectId(currentItem);
      const selectedProject = getProject(projectId);

      if (!selectedProject || !selectedProject.path) {
        throw new Error('Project path not found. Cannot create requirement file.');
      }

      const result = await acceptTinderItem(currentItem, selectedProject.path);

      // Surface prerequisites/unlocks if any exist
      const pendingPrereqs = (result.prerequisites || []).filter(p => p.status === 'pending');
      const pendingUnlocks = (result.unlocks || []).filter(u => u.status === 'pending');
      if (pendingPrereqs.length > 0 || pendingUnlocks.length > 0) {
        const itemTitle = isIdeaItem(currentItem) ? currentItem.data.title : 'Item';
        setPrerequisiteNotification({
          acceptedTitle: itemTitle,
          prerequisites: pendingPrereqs,
          unlocks: pendingUnlocks,
        });
      }

      updateStats(currentItem, 'accepted');
      updateCategoryCountOptimistic(currentItem);
      updateCountsOptimistic(isIdeaItem(currentItem) ? 'ideas' : 'directions');
      loadMoreIfNeeded(loadItems);
    } catch (error) {
      alert('Failed to accept: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, getProject, loadMoreIfNeeded, loadItems, updateStats, updateCategoryCountOptimistic, updateCountsOptimistic, setItems, setProcessing, setPrerequisiteNotification]);

  // Reject handler
  const handleReject = useCallback(async (rejectionReason?: string) => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      const projectId = getTinderItemProjectId(currentItem);
      const selectedProject = getProject(projectId);
      await rejectTinderItem(currentItem, selectedProject?.path, rejectionReason);

      updateStats(currentItem, 'rejected');
      updateCategoryCountOptimistic(currentItem);
      updateCountsOptimistic(isIdeaItem(currentItem) ? 'ideas' : 'directions');
      loadMoreIfNeeded(loadItems);
    } catch (error) {
      alert('Failed to reject');
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, getProject, loadMoreIfNeeded, loadItems, updateStats, updateCategoryCountOptimistic, updateCountsOptimistic, setItems, setProcessing]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    const itemType = isIdeaItem(currentItem) ? 'idea' : 'direction';

    if (!confirm(`Are you sure you want to permanently delete this ${itemType}?`)) {
      return;
    }

    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      await deleteTinderItem(currentItem);
      updateStats(currentItem, 'deleted');
      updateCategoryCountOptimistic(currentItem);
      updateCountsOptimistic(isIdeaItem(currentItem) ? 'ideas' : 'directions');
      loadMoreIfNeeded(loadItems);
    } catch (error) {
      alert(`Failed to delete ${itemType}`);
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, loadMoreIfNeeded, loadItems, updateStats, updateCategoryCountOptimistic, updateCountsOptimistic, setItems, setProcessing]);

  // Accept idea variant (scope: MVP / Standard / Ambitious)
  const handleAcceptIdeaVariant = useCallback(async (ideaId: string, variant: { title: string; description: string; effort: number; impact: number; risk: number; scope: string }) => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    if (!isIdeaItem(currentItem)) return;

    const projectId = currentItem.data.project_id;
    const selectedProject = getProject(projectId);

    if (!selectedProject || !selectedProject.path) {
      alert('Project path not found. Cannot create requirement file.');
      return;
    }

    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ideaId,
          title: variant.title,
          description: variant.description,
          effort: variant.effort,
          impact: variant.impact,
          risk: variant.risk,
        }),
      });

      await acceptTinderItem(currentItem, selectedProject.path);

      updateStats(currentItem, 'accepted');
      updateCategoryCountOptimistic(currentItem);
      updateCountsOptimistic('ideas');
      loadMoreIfNeeded(loadItems);
    } catch (error) {
      alert('Failed to accept variant: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, getProject, loadMoreIfNeeded, loadItems, updateStats, updateCategoryCountOptimistic, updateCountsOptimistic, setItems, setProcessing]);

  // Accept a variant from a direction pair
  const handleAcceptPairVariant = useCallback(async (pairId: string, variant: 'A' | 'B') => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    if (!isDirectionPairItem(currentItem)) return;

    const projectId = currentItem.data.directionA.project_id;
    const selectedProject = getProject(projectId);

    if (!selectedProject || !selectedProject.path) {
      alert('Project path not found. Cannot create requirement file.');
      return;
    }

    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      await acceptPairVariant(pairId, variant, selectedProject.path);
      // Count as 2 directions processed (one accepted, one rejected)
      setStats(prev => ({
        ...prev,
        directions: {
          ...prev.directions,
          accepted: prev.directions.accepted + 1,
          rejected: prev.directions.rejected + 1,
        },
      }));
      updateCountsOptimistic('directions', 2);
      loadMoreIfNeeded(loadItems);
    } catch (error) {
      alert('Failed to accept direction variant: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, getProject, loadMoreIfNeeded, loadItems, updateCountsOptimistic, setItems, setProcessing, setStats]);

  // Reject both directions in a pair
  const handleRejectPair = useCallback(async (pairId: string) => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    if (!isDirectionPairItem(currentItem)) return;

    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      await rejectDirectionPair(pairId);
      // Count as 2 directions rejected
      setStats(prev => ({
        ...prev,
        directions: {
          ...prev.directions,
          rejected: prev.directions.rejected + 2,
        },
      }));
      updateCountsOptimistic('directions', 2);
      loadMoreIfNeeded(loadItems);
    } catch (error) {
      alert('Failed to reject direction pair');
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, loadMoreIfNeeded, loadItems, updateCountsOptimistic, setItems, setProcessing, setStats]);

  // Delete both directions in a pair
  const handleDeletePair = useCallback(async (pairId: string) => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    if (!isDirectionPairItem(currentItem)) return;

    if (!confirm('Are you sure you want to permanently delete both direction variants?')) {
      return;
    }

    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      await deleteDirectionPair(pairId);
      // Count as 2 directions deleted
      setStats(prev => ({
        ...prev,
        directions: {
          ...prev.directions,
          deleted: prev.directions.deleted + 2,
        },
      }));
      updateCountsOptimistic('directions', 2);
      loadMoreIfNeeded(loadItems);
    } catch (error) {
      alert('Failed to delete direction pair');
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, loadMoreIfNeeded, loadItems, updateCountsOptimistic, setItems, setProcessing, setStats]);

  // Load categories when in ideas mode
  useEffect(() => {
    if (!enabled) return;
    if (filterMode === 'ideas') {
      loadCategories();
      loadScanTypes();
      loadContextCounts();
    }
  }, [enabled, filterMode, loadCategories, loadScanTypes, loadContextCounts]);

  // Load items when dependencies change
  useEffect(() => {
    if (!enabled) return;
    loadItems(null);
  }, [enabled, selectedProjectId, filterMode, activeCategory, activeScanType, selectedContextId, effortRange, riskRange, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    loadItems: () => loadItems(null),
    handleAccept,
    handleReject,
    handleDelete,
    handleAcceptIdeaVariant,
    handleAcceptPairVariant,
    handleRejectPair,
    handleDeletePair,
  };
}
