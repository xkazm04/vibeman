/**
 * Custom hook for unified Tinder functionality (Ideas + Directions)
 */

import { useState, useEffect, useCallback } from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import {
  TinderItem,
  TinderFilterMode,
  TinderItemStats,
  TinderCombinedStats,
  UseTinderItemsResult,
  initialTinderItemStats,
  isIdeaItem,
  isDirectionItem,
  getTinderItemProjectId,
} from './tinderTypes';
import {
  fetchTinderItems,
  acceptTinderItem,
  rejectTinderItem,
  deleteTinderItem,
} from './tinderItemsApi';
import { TINDER_CONSTANTS } from './tinderUtils';

export function useTinderItems(selectedProjectId: string): UseTinderItemsResult {
  const [items, setItems] = useState<TinderItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TinderItemStats>(initialTinderItemStats);
  const [filterMode, setFilterMode] = useState<TinderFilterMode>('both');
  const [counts, setCounts] = useState({ ideas: 0, directions: 0 });

  const { getProject } = useProjectConfigStore();

  // Compute combined stats
  const combinedStats: TinderCombinedStats = {
    accepted: stats.ideas.accepted + stats.directions.accepted,
    rejected: stats.ideas.rejected + stats.directions.rejected,
    deleted: stats.ideas.deleted + stats.directions.deleted,
  };

  const loadItems = useCallback(async (offset: number = 0) => {
    setLoading(true);
    try {
      const result = await fetchTinderItems(
        selectedProjectId === 'all' ? undefined : selectedProjectId,
        filterMode,
        offset,
        TINDER_CONSTANTS.BATCH_SIZE
      );

      if (offset === 0) {
        setItems(result.items);
        setCurrentIndex(0);
      } else {
        setItems(prev => [...prev, ...result.items]);
      }

      setHasMore(result.hasMore);
      setTotal(result.total);
      setCounts(result.counts);
    } catch (error) {
      console.error('Failed to load tinder items:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, filterMode]);

  const loadMoreIfNeeded = useCallback(() => {
    if (currentIndex >= items.length - TINDER_CONSTANTS.LOAD_MORE_THRESHOLD && hasMore && !loading) {
      loadItems(items.length);
    }
  }, [currentIndex, items.length, hasMore, loading, loadItems]);

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

  const handleAccept = useCallback(async () => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    const projectId = getTinderItemProjectId(currentItem);
    const selectedProject = getProject(projectId);

    if (!selectedProject || !selectedProject.path) {
      alert('Project path not found. Cannot create requirement file.');
      return;
    }

    setProcessing(true);

    // Optimistically remove the item
    setItems(prev => prev.filter((_, index) => index !== currentIndex));

    try {
      await acceptTinderItem(currentItem, selectedProject.path);
      updateStats(currentItem, 'accepted');
      loadMoreIfNeeded();
    } catch (error) {
      alert('Failed to accept: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Revert: re-insert the item at the same position
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, getProject, loadMoreIfNeeded, updateStats]);

  const handleReject = useCallback(async () => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    const projectId = getTinderItemProjectId(currentItem);
    const selectedProject = getProject(projectId);

    setProcessing(true);

    // Optimistically remove the item
    setItems(prev => prev.filter((_, index) => index !== currentIndex));

    try {
      await rejectTinderItem(currentItem, selectedProject?.path);
      updateStats(currentItem, 'rejected');
      loadMoreIfNeeded();
    } catch (error) {
      alert('Failed to reject');
      // Revert: re-insert the item at the same position
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, getProject, loadMoreIfNeeded, updateStats]);

  const handleDelete = useCallback(async () => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    const itemType = isIdeaItem(currentItem) ? 'idea' : 'direction';

    if (!confirm(`Are you sure you want to permanently delete this ${itemType}?`)) {
      return;
    }

    setProcessing(true);

    // Optimistically remove the item
    setItems(prev => prev.filter((_, index) => index !== currentIndex));

    try {
      await deleteTinderItem(currentItem);
      updateStats(currentItem, 'deleted');
      loadMoreIfNeeded();
    } catch (error) {
      alert(`Failed to delete ${itemType}`);
      // Revert: re-insert the item at the same position
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, items, loadMoreIfNeeded, updateStats]);

  const resetStats = useCallback(() => {
    setStats(initialTinderItemStats);
  }, []);

  const handleSetFilterMode = useCallback((mode: TinderFilterMode) => {
    setFilterMode(mode);
    // Items will be reloaded automatically via useEffect
  }, []);

  // Load items when selectedProjectId or filterMode changes
  useEffect(() => {
    loadItems(0);
  }, [loadItems]);

  const currentItem = items[currentIndex];
  const remainingCount = total - currentIndex;

  return {
    items,
    currentIndex,
    loading,
    processing,
    hasMore,
    total,
    stats,
    combinedStats,
    remainingCount,
    currentItem,
    filterMode,
    counts,
    setFilterMode: handleSetFilterMode,
    handleAccept,
    handleReject,
    handleDelete,
    resetStats,
    loadItems: () => loadItems(0),
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
