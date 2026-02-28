/**
 * Custom hook for unified Tinder functionality (Ideas + Directions)
 * Supports both local and remote modes via optional remoteDeviceId parameter
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { DbDirection } from '@/app/db/models/types';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useDeviceMeshStore } from '@/stores/deviceMeshStore';
import { type RemoteDirection } from '@/stores/remoteWorkStore';
import {
  TinderItem,
  TinderFilterMode,
  TinderItemStats,
  TinderCombinedStats,
  UseTinderItemsResult,
  PrerequisiteNotification,
  initialTinderItemStats,
  isIdeaItem,
  isDirectionPairItem,
  getTinderItemProjectId,
  CategoryCount,
} from './tinderTypes';
import {
  fetchTinderItems,
  acceptTinderItem,
  rejectTinderItem,
  deleteTinderItem,
  fetchIdeaCategories,
  acceptPairVariant,
  rejectDirectionPair,
  deleteDirectionPair,
} from './tinderItemsApi';
import { TINDER_CONSTANTS } from './tinderUtils';

/** Convert RemoteDirection to TinderItem format */
function remoteDirectionToTinderItem(direction: RemoteDirection): TinderItem {
  return {
    type: 'direction',
    data: {
      id: direction.id,
      project_id: direction.project_id,
      summary: direction.summary,
      direction: direction.direction,
      context_name: direction.context_name ?? '',
      context_map_title: direction.context_map_title ?? '',
      status: direction.status,
      created_at: direction.created_at,
      requirement_id: null,
      requirement_path: null,
    } as unknown as DbDirection,
  };
}

/** Poll for remote command result with timeout */
async function pollForResult(commandId: string, timeoutMs: number): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`/api/remote/mesh/commands?command_id=${commandId}`);
    if (!response.ok) {
      throw new Error('Failed to check command status');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch command');
    }

    const command = data.commands?.find((c: any) => c.id === commandId);
    if (command) {
      if (command.status === 'completed') {
        return command.result || { success: true };
      }
      if (command.status === 'failed') {
        throw new Error(command.error || 'Command failed');
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Command timed out');
}

interface UseTinderItemsOptions {
  selectedProjectId: string;
  remoteDeviceId?: string | null;
  effortRange?: [number, number] | null;
  riskRange?: [number, number] | null;
}

export function useTinderItems(
  selectedProjectIdOrOptions: string | UseTinderItemsOptions
): UseTinderItemsResult {
  // Normalize parameters to support both old signature and new options object
  const options = typeof selectedProjectIdOrOptions === 'string'
    ? { selectedProjectId: selectedProjectIdOrOptions, remoteDeviceId: null }
    : selectedProjectIdOrOptions;

  const { selectedProjectId, remoteDeviceId, effortRange = null, riskRange = null } = options;
  const isRemoteMode = !!remoteDeviceId;

  const [items, setItems] = useState<TinderItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TinderItemStats>(initialTinderItemStats);
  const [filterMode, setFilterMode] = useState<TinderFilterMode>(isRemoteMode ? 'directions' : 'both');
  const [counts, setCounts] = useState({ ideas: 0, directions: 0 });
  const [goalTitlesMap, setGoalTitlesMap] = useState<Record<string, string>>({});
  // Category filtering for ideas
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Dependency awareness: prerequisite notification
  const [prerequisiteNotification, setPrerequisiteNotification] = useState<PrerequisiteNotification | null>(null);

  const { getProject } = useProjectConfigStore();
  const { localDeviceId, localDeviceName } = useDeviceMeshStore();
  const pendingCommandRef = useRef<string | null>(null);
  // Synchronous loading guard to prevent duplicate fetches on rapid swipe
  const loadingRef = useRef(false);
  // Track how many items the server has returned (for correct pagination offset)
  const serverFetchedCountRef = useRef(0);

  // Compute combined stats
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

  // Optimistically update category counts when an idea is processed
  const updateCategoryCountOptimistic = useCallback((item: TinderItem) => {
    if (!isIdeaItem(item)) return;

    const category = item.data.category;
    setCategories(prev =>
      prev.map(cat =>
        cat.category === category
          ? { ...cat, count: Math.max(0, cat.count - 1) }
          : cat
      ).filter(cat => cat.count > 0) // Remove categories with 0 count
    );
  }, []);

  // Load idea categories for filtering
  const loadCategories = useCallback(async () => {
    if (isRemoteMode) return; // No category filtering in remote mode

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
  }, [isRemoteMode, selectedProjectId]);

  // Derive filtered items for display (effort/risk filtering is client-side)
  const filteredItems = useMemo(() => {
    if (!effortRange && !riskRange) return items;
    return items.filter(item => {
      if (!isIdeaItem(item)) return true;
      const idea = item.data;
      if (effortRange) {
        if (idea.effort === null || idea.effort < effortRange[0] || idea.effort > effortRange[1]) return false;
      }
      if (riskRange) {
        if (idea.risk === null || idea.risk < riskRange[0] || idea.risk > riskRange[1]) return false;
      }
      return true;
    });
  }, [items, effortRange, riskRange]);

  // Load items - handles both local and remote modes
  // Category filtering is server-side, effort/risk filtering is client-side
  const loadItems = useCallback(async (offset: number = 0) => {
    loadingRef.current = true;
    setLoading(true);

    if (isRemoteMode && remoteDeviceId) {
      // Remote mode: fetch from remote device via mesh commands
      try {
        const response = await fetch('/api/remote/mesh/commands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command_type: 'fetch_directions',
            target_device_id: remoteDeviceId,
            source_device_id: localDeviceId,
            source_device_name: localDeviceName,
            payload: { status: 'pending', limit: 50 },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send fetch_directions command');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Command failed');
        }

        const commandId = data.command_id;
        pendingCommandRef.current = commandId;

        const result = await pollForResult(commandId, 15000);

        if (pendingCommandRef.current === commandId && result.directions) {
          const tinderItems = result.directions.map(remoteDirectionToTinderItem);
          serverFetchedCountRef.current = tinderItems.length;
          setItems(tinderItems);
          setCurrentIndex(0);
          setHasMore(false);
          setTotal(tinderItems.length);
          setCounts({ ideas: 0, directions: tinderItems.length });
        }
      } catch (error) {
        console.error('[useTinderItems] Remote load error:', error);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    } else {
      // Local mode: fetch from local database (category filter is server-side)
      try {
        const result = await fetchTinderItems(
          selectedProjectId === 'all' ? undefined : selectedProjectId,
          filterMode,
          offset,
          TINDER_CONSTANTS.BATCH_SIZE,
          selectedCategory
        );

        if (offset === 0) {
          serverFetchedCountRef.current = result.items.length;
          setItems(result.items);
          setCurrentIndex(0);
          setGoalTitlesMap(result.goalTitlesMap);
        } else {
          serverFetchedCountRef.current += result.items.length;
          setItems(prev => [...prev, ...result.items]);
          setGoalTitlesMap(prev => ({ ...prev, ...result.goalTitlesMap }));
        }

        setHasMore(result.hasMore);
        setTotal(result.total);
        setCounts(result.counts);
      } catch (error) {
        console.error('Failed to load tinder items:', error);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [isRemoteMode, remoteDeviceId, selectedProjectId, filterMode, selectedCategory, localDeviceId, localDeviceName]);

  const loadMoreIfNeeded = useCallback(() => {
    if (!isRemoteMode && currentIndex >= filteredItems.length - TINDER_CONSTANTS.LOAD_MORE_THRESHOLD && hasMore && !loadingRef.current) {
      loadItems(serverFetchedCountRef.current);
    }
  }, [isRemoteMode, currentIndex, filteredItems.length, hasMore, loadItems]);

  // Send remote triage command
  const sendRemoteTriageCommand = useCallback(async (
    directionId: string,
    action: 'accept' | 'reject'
  ): Promise<void> => {
    if (!remoteDeviceId) return;

    const response = await fetch('/api/remote/mesh/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command_type: 'triage_direction',
        target_device_id: remoteDeviceId,
        source_device_id: localDeviceId,
        source_device_name: localDeviceName,
        payload: { direction_id: directionId, action },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send triage command');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Command failed');
    }

    await pollForResult(data.command_id, 10000);
  }, [remoteDeviceId, localDeviceId, localDeviceName]);

  const handleAccept = useCallback(async () => {
    if (processing || currentIndex >= filteredItems.length) return;

    const currentItem = filteredItems[currentIndex];
    setProcessing(true);

    // Optimistically remove the item from the full items array by identity
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      if (isRemoteMode) {
        // Remote mode: send triage command
        if (currentItem.type !== 'direction') return;
        await sendRemoteTriageCommand(currentItem.data.id, 'accept');
      } else {
        // Local mode: use existing API
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
      }

      updateStats(currentItem, 'accepted');
      updateCategoryCountOptimistic(currentItem);
      loadMoreIfNeeded();
    } catch (error) {
      alert('Failed to accept: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Revert: re-insert the item
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, filteredItems, isRemoteMode, getProject, loadMoreIfNeeded, updateStats, updateCategoryCountOptimistic, sendRemoteTriageCommand]);

  const handleReject = useCallback(async (rejectionReason?: string) => {
    if (processing || currentIndex >= filteredItems.length) return;

    const currentItem = filteredItems[currentIndex];
    setProcessing(true);

    // Optimistically remove the item from the full items array by identity
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      if (isRemoteMode) {
        // Remote mode: send triage command
        if (currentItem.type !== 'direction') return;
        await sendRemoteTriageCommand(currentItem.data.id, 'reject');
      } else {
        // Local mode: use existing API
        const projectId = getTinderItemProjectId(currentItem);
        const selectedProject = getProject(projectId);
        await rejectTinderItem(currentItem, selectedProject?.path, rejectionReason);
      }

      updateStats(currentItem, 'rejected');
      updateCategoryCountOptimistic(currentItem);
      loadMoreIfNeeded();
    } catch (error) {
      alert('Failed to reject');
      // Revert: re-insert the item
      setItems(prev => {
        const newItems = [...prev];
        newItems.splice(currentIndex, 0, currentItem);
        return newItems;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, filteredItems, isRemoteMode, getProject, loadMoreIfNeeded, updateStats, updateCategoryCountOptimistic, sendRemoteTriageCommand]);

  const handleDelete = useCallback(async () => {
    if (processing || currentIndex >= filteredItems.length) return;

    const currentItem = filteredItems[currentIndex];
    const itemType = isIdeaItem(currentItem) ? 'idea' : 'direction';

    if (isRemoteMode) {
      // Remote mode: delete just skips locally (no confirmation needed)
      setItems(prev => prev.filter(item => item !== currentItem));
      updateStats(currentItem, 'deleted');
      updateCategoryCountOptimistic(currentItem);
      return;
    }

    // Local mode: confirm and delete
    if (!confirm(`Are you sure you want to permanently delete this ${itemType}?`)) {
      return;
    }

    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      await deleteTinderItem(currentItem);
      updateStats(currentItem, 'deleted');
      updateCategoryCountOptimistic(currentItem);
      loadMoreIfNeeded();
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
  }, [processing, currentIndex, filteredItems, isRemoteMode, loadMoreIfNeeded, updateStats, updateCategoryCountOptimistic]);

  const resetStats = useCallback(() => {
    setStats(initialTinderItemStats);
  }, []);

  const handleSetFilterMode = useCallback((mode: TinderFilterMode) => {
    setFilterMode(mode);
    // Reset category when switching away from ideas mode
    if (mode !== 'ideas') {
      setSelectedCategory(null);
    }
    // Items will be reloaded automatically via useEffect
  }, []);

  const handleSetCategory = useCallback((category: string | null) => {
    setSelectedCategory(category);
    // Items reload via useEffect when selectedCategory changes (server-side filter)
  }, []);

  const dismissPrerequisiteNotification = useCallback(() => {
    setPrerequisiteNotification(null);
  }, []);

  // Handler for accepting an idea scope variant (MVP / Standard / Ambitious)
  const handleAcceptIdeaVariant = useCallback(async (ideaId: string, variant: { title: string; description: string; effort: number; impact: number; risk: number; scope: string }) => {
    if (processing || currentIndex >= filteredItems.length) return;

    const currentItem = filteredItems[currentIndex];
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
      // 1. Update idea with variant's description and scores
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

      // 2. Accept the updated idea (creates requirement file)
      await acceptTinderItem(currentItem, selectedProject.path);

      updateStats(currentItem, 'accepted');
      updateCategoryCountOptimistic(currentItem);
      loadMoreIfNeeded();
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
  }, [processing, currentIndex, filteredItems, getProject, loadMoreIfNeeded, updateStats, updateCategoryCountOptimistic]);

  // Handler for accepting a variant from a direction pair
  const handleAcceptPairVariant = useCallback(async (pairId: string, variant: 'A' | 'B') => {
    if (processing || currentIndex >= filteredItems.length) return;

    const currentItem = filteredItems[currentIndex];
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
      loadMoreIfNeeded();
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
  }, [processing, currentIndex, filteredItems, getProject, loadMoreIfNeeded]);

  // Handler for rejecting both directions in a pair
  const handleRejectPair = useCallback(async (pairId: string) => {
    if (processing || currentIndex >= filteredItems.length) return;

    const currentItem = filteredItems[currentIndex];
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
      loadMoreIfNeeded();
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
  }, [processing, currentIndex, filteredItems, loadMoreIfNeeded]);

  // Handler for deleting both directions in a pair
  const handleDeletePair = useCallback(async (pairId: string) => {
    if (processing || currentIndex >= filteredItems.length) return;

    const currentItem = filteredItems[currentIndex];
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
      loadMoreIfNeeded();
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
  }, [processing, currentIndex, filteredItems, loadMoreIfNeeded]);

  // Load categories when in ideas mode
  useEffect(() => {
    if (filterMode === 'ideas' && !isRemoteMode) {
      loadCategories();
    }
  }, [filterMode, isRemoteMode, loadCategories]);

  // Load items when dependencies change (category is server-side, effort/risk is client-side)
  useEffect(() => {
    if (isRemoteMode) {
      if (remoteDeviceId) {
        loadItems(0);
      } else {
        setItems([]);
        setCurrentIndex(0);
      }
    } else {
      loadItems(0);
    }
  }, [isRemoteMode, remoteDeviceId, selectedProjectId, filterMode, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentItem = filteredItems[currentIndex];
  const remainingCount = filteredItems.length - currentIndex;

  return {
    items: filteredItems,
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
    goalTitlesMap,
    // Category filtering
    selectedCategory,
    categories,
    categoriesLoading,
    setCategory: handleSetCategory,
    setFilterMode: handleSetFilterMode,
    handleAccept,
    handleReject,
    handleDelete,
    // Idea variant handler
    handleAcceptIdeaVariant,
    // Paired direction handlers
    handleAcceptPairVariant,
    handleRejectPair,
    handleDeletePair,
    resetStats,
    loadItems: () => loadItems(0),
    // Dependency awareness
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
