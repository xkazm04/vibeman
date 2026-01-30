/**
 * Custom hook for unified Tinder functionality (Ideas + Directions)
 * Supports both local and remote modes via optional remoteDeviceId parameter
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useEmulatorStore, type RemoteDirection } from '@/stores/emulatorStore';
import {
  TinderItem,
  TinderFilterMode,
  TinderItemStats,
  TinderCombinedStats,
  UseTinderItemsResult,
  initialTinderItemStats,
  isIdeaItem,
  getTinderItemProjectId,
} from './tinderTypes';
import {
  fetchTinderItems,
  acceptTinderItem,
  rejectTinderItem,
  deleteTinderItem,
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
      context_name: direction.context_name || null,
      context_map_title: direction.context_map_title || null,
      status: direction.status,
      created_at: direction.created_at,
      accepted_at: null,
      rejected_at: null,
      requirement_id: null,
      requirement_path: null,
    },
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
}

export function useTinderItems(
  selectedProjectIdOrOptions: string | UseTinderItemsOptions
): UseTinderItemsResult {
  // Normalize parameters to support both old signature and new options object
  const options = typeof selectedProjectIdOrOptions === 'string'
    ? { selectedProjectId: selectedProjectIdOrOptions, remoteDeviceId: null }
    : selectedProjectIdOrOptions;

  const { selectedProjectId, remoteDeviceId } = options;
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

  const { getProject } = useProjectConfigStore();
  const { localDeviceId, localDeviceName } = useEmulatorStore();
  const pendingCommandRef = useRef<string | null>(null);

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

  // Load items - handles both local and remote modes
  const loadItems = useCallback(async (offset: number = 0) => {
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
          setItems(tinderItems);
          setCurrentIndex(0);
          setHasMore(false);
          setTotal(tinderItems.length);
          setCounts({ ideas: 0, directions: tinderItems.length });
        }
      } catch (error) {
        console.error('[useTinderItems] Remote load error:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Local mode: fetch from local database
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
          setGoalTitlesMap(result.goalTitlesMap);
        } else {
          setItems(prev => [...prev, ...result.items]);
          // Merge new goal titles into existing map
          setGoalTitlesMap(prev => ({ ...prev, ...result.goalTitlesMap }));
        }

        setHasMore(result.hasMore);
        setTotal(result.total);
        setCounts(result.counts);
      } catch (error) {
        console.error('Failed to load tinder items:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [isRemoteMode, remoteDeviceId, selectedProjectId, filterMode, localDeviceId, localDeviceName]);

  const loadMoreIfNeeded = useCallback(() => {
    if (!isRemoteMode && currentIndex >= items.length - TINDER_CONSTANTS.LOAD_MORE_THRESHOLD && hasMore && !loading) {
      loadItems(items.length);
    }
  }, [isRemoteMode, currentIndex, items.length, hasMore, loading, loadItems]);

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
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    setProcessing(true);

    // Optimistically remove the item
    setItems(prev => prev.filter((_, index) => index !== currentIndex));

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

        await acceptTinderItem(currentItem, selectedProject.path);
      }

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
  }, [processing, currentIndex, items, isRemoteMode, getProject, loadMoreIfNeeded, updateStats, sendRemoteTriageCommand]);

  const handleReject = useCallback(async () => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    setProcessing(true);

    // Optimistically remove the item
    setItems(prev => prev.filter((_, index) => index !== currentIndex));

    try {
      if (isRemoteMode) {
        // Remote mode: send triage command
        if (currentItem.type !== 'direction') return;
        await sendRemoteTriageCommand(currentItem.data.id, 'reject');
      } else {
        // Local mode: use existing API
        const projectId = getTinderItemProjectId(currentItem);
        const selectedProject = getProject(projectId);
        await rejectTinderItem(currentItem, selectedProject?.path);
      }

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
  }, [processing, currentIndex, items, isRemoteMode, getProject, loadMoreIfNeeded, updateStats, sendRemoteTriageCommand]);

  const handleDelete = useCallback(async () => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    const itemType = isIdeaItem(currentItem) ? 'idea' : 'direction';

    if (isRemoteMode) {
      // Remote mode: delete just skips locally (no confirmation needed)
      setItems(prev => prev.filter((_, i) => i !== currentIndex));
      updateStats(currentItem, 'deleted');
      return;
    }

    // Local mode: confirm and delete
    if (!confirm(`Are you sure you want to permanently delete this ${itemType}?`)) {
      return;
    }

    setProcessing(true);
    setItems(prev => prev.filter((_, index) => index !== currentIndex));

    try {
      await deleteTinderItem(currentItem);
      updateStats(currentItem, 'deleted');
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
  }, [processing, currentIndex, items, isRemoteMode, loadMoreIfNeeded, updateStats]);

  const resetStats = useCallback(() => {
    setStats(initialTinderItemStats);
  }, []);

  const handleSetFilterMode = useCallback((mode: TinderFilterMode) => {
    setFilterMode(mode);
    // Items will be reloaded automatically via useEffect
  }, []);

  // Load items when dependencies change
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
  }, [isRemoteMode, remoteDeviceId, selectedProjectId, filterMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
    goalTitlesMap,
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
