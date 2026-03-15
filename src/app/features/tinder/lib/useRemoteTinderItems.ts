/**
 * Remote mode hook (Layer 2) — handles fetching directions from a remote device
 * via mesh commands, polling for results, and remote accept/reject triage.
 * All UI state lives in useTinderItems (Layer 1).
 * Pagination refs are managed by useCursorPagination (hasMore: false — remote fetches all at once).
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDeviceMeshStore } from '@/stores/deviceMeshStore';
import { type RemoteDirection } from '@/stores/remoteWorkStore';
import type { DbDirection } from '@/app/db/models/types';
import {
  TinderItem,
  isIdeaItem,
} from './tinderTypes';
import { useCursorPagination } from './useCursorPagination';
import type { UseTinderItemsCoreResult } from './useTinderItemsCore';

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

interface UseRemoteModeOptions {
  remoteDeviceId: string;
  /** When false, effects don't fire (inactive mode). */
  enabled: boolean;
}

export function useRemoteMode(
  core: UseTinderItemsCoreResult,
  options: UseRemoteModeOptions
) {
  const { remoteDeviceId, enabled } = options;
  const { localDeviceId, localDeviceName } = useDeviceMeshStore();
  const pendingCommandRef = useRef<string | null>(null);

  // Remote mode fetches all items at once — no cursor pagination, but we consume
  // useCursorPagination for the loading guard ref (consistent with local mode).
  const { loadingRef, nextCursorRef } = useCursorPagination({
    hasMore: false,
    itemsLength: 0,
    currentIndex: 0,
  });

  const {
    items,
    currentIndex,
    processing,
    setItems,
    setCurrentIndex,
    setLoading,
    setProcessing,
    setHasMore,
    setTotal,
    setCounts,
    updateStats,
    updateCategoryCountOptimistic,
    updateCountsOptimistic,
  } = core;

  // Load directions from remote device via mesh commands
  const loadItems = useCallback(async () => {
    loadingRef.current = true;
    setLoading(true);

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
        nextCursorRef.current = null; // Remote mode fetches all at once
        setItems(tinderItems);
        setCurrentIndex(0);
        setHasMore(false);
        setTotal(tinderItems.length);
        setCounts({ ideas: 0, directions: tinderItems.length });
      }
    } catch (error) {
      console.error('[useRemoteMode] Remote load error:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [remoteDeviceId, localDeviceId, localDeviceName, setItems, setCurrentIndex, setLoading, setHasMore, setTotal, setCounts]); // loadingRef and nextCursorRef are stable refs

  // Send remote triage command (accept/reject)
  const sendRemoteTriageCommand = useCallback(async (
    directionId: string,
    action: 'accept' | 'reject'
  ): Promise<void> => {
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

  // Accept handler
  const handleAccept = useCallback(async () => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    if (currentItem.type !== 'direction') return;

    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      await sendRemoteTriageCommand(currentItem.data.id, 'accept');
      updateStats(currentItem, 'accepted');
      updateCategoryCountOptimistic(currentItem);
      updateCountsOptimistic('directions');
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
  }, [processing, currentIndex, items, sendRemoteTriageCommand, updateStats, updateCategoryCountOptimistic, updateCountsOptimistic, setItems, setProcessing]);

  // Reject handler
  const handleReject = useCallback(async (_rejectionReason?: string) => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    if (currentItem.type !== 'direction') return;

    setProcessing(true);
    setItems(prev => prev.filter(item => item !== currentItem));

    try {
      await sendRemoteTriageCommand(currentItem.data.id, 'reject');
      updateStats(currentItem, 'rejected');
      updateCategoryCountOptimistic(currentItem);
      updateCountsOptimistic('directions');
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
  }, [processing, currentIndex, items, sendRemoteTriageCommand, updateStats, updateCategoryCountOptimistic, updateCountsOptimistic, setItems, setProcessing]);

  // Delete handler — remote mode just removes locally
  const handleDelete = useCallback(async () => {
    if (processing || currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    setItems(prev => prev.filter(item => item !== currentItem));
    updateStats(currentItem, 'deleted');
    updateCategoryCountOptimistic(currentItem);
    updateCountsOptimistic(isIdeaItem(currentItem) ? 'ideas' : 'directions');
  }, [processing, currentIndex, items, updateStats, updateCategoryCountOptimistic, updateCountsOptimistic, setItems]);

  // No-op handlers for features not supported in remote mode
  const handleAcceptIdeaVariant = useCallback(async () => {}, []);
  const handleAcceptPairVariant = useCallback(async () => {}, []);
  const handleRejectPair = useCallback(async () => {}, []);
  const handleDeletePair = useCallback(async () => {}, []);

  // Load items when remote device changes
  useEffect(() => {
    if (!enabled) return;
    if (remoteDeviceId) {
      loadItems();
    } else {
      setItems([]);
      setCurrentIndex(0);
    }
  }, [enabled, remoteDeviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    loadItems,
    handleAccept,
    handleReject,
    handleDelete,
    handleAcceptIdeaVariant,
    handleAcceptPairVariant,
    handleRejectPair,
    handleDeletePair,
  };
}
