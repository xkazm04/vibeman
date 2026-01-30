/**
 * useRemoteMonitor Hook
 * Manages polling batch status and event feed from remote device
 */

import { useCallback, useEffect, useRef } from 'react';
import { useEmulatorStore, type RemoteBatchInfo, type RemoteEvent } from '@/stores/emulatorStore';

interface UseRemoteMonitorResult {
  // State
  batches: RemoteBatchInfo[];
  events: RemoteEvent[];
  isLoadingBatches: boolean;
  isLoadingEvents: boolean;
  batchError: string | null;

  // Actions
  refreshBatchStatus: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  pauseBatch: (batchId: string) => Promise<boolean>;
  cancelBatch: (batchId: string) => Promise<boolean>;
  clearError: () => void;
}

export function useRemoteMonitor(
  targetDeviceId: string | null,
  options: { pollInterval?: number; autoPoll?: boolean } = {}
): UseRemoteMonitorResult {
  const { pollInterval = 5000, autoPoll = true } = options;

  const {
    remoteBatches,
    eventFeed,
    isLoadingBatches,
    isLoadingEvents,
    batchError,
    setRemoteBatches,
    setLoadingBatches,
    setBatchError,
    updateBatchStatus,
    setEventFeed,
    addEvent,
    setLoadingEvents,
    localDeviceId,
    localDeviceName,
  } = useEmulatorStore();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Refresh batch status from target device
   */
  const refreshBatchStatus = useCallback(async () => {
    if (!targetDeviceId) return;

    // Don't set loading if we're just polling
    // setLoadingBatches(true);

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'get_batch_status',
          target_device_id: targetDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {},
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.success) return;

      // Poll for result with shorter timeout
      const result = await pollForResult(data.command_id, 8000);

      if (result.sessions) {
        // Map CLI sessions to batch info
        const batches: RemoteBatchInfo[] = result.sessions.map((session: any) => ({
          batch_id: `session-${session.id}`,
          session_id: session.id,
          total_tasks: session.total_tasks || 0,
          completed_tasks: session.completed_tasks || 0,
          failed_tasks: session.failed_tasks || 0,
          status: mapSessionStatus(session.status),
          current_task: session.current_task,
          started_at: session.started_at,
        }));
        setRemoteBatches(batches);
      }
    } catch (error) {
      // Silent fail for polling
      console.debug('[useRemoteMonitor] refreshBatchStatus:', error);
    }
  }, [targetDeviceId, localDeviceId, localDeviceName, setRemoteBatches]);

  /**
   * Refresh events from target device
   */
  const refreshEvents = useCallback(async () => {
    if (!targetDeviceId) return;

    try {
      // Fetch recent events from Supabase events table
      const response = await fetch(`/api/remote/events?limit=20`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.events) {
        const events: RemoteEvent[] = data.events.map((e: any) => ({
          id: e.id,
          event_type: e.event_type,
          payload: e.payload || {},
          created_at: e.created_at,
        }));
        setEventFeed(events);
      }
    } catch (error) {
      console.debug('[useRemoteMonitor] refreshEvents:', error);
    }
  }, [targetDeviceId, setEventFeed]);

  /**
   * Pause a running batch
   */
  const pauseBatch = useCallback(async (batchId: string): Promise<boolean> => {
    if (!targetDeviceId) return false;

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'batch_stop',
          target_device_id: targetDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {
            batch_id: batchId,
            action: 'pause',
          },
        }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (!data.success) return false;

      const result = await pollForResult(data.command_id, 10000);

      if (result.success) {
        updateBatchStatus(batchId, { status: 'paused' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useRemoteMonitor] pauseBatch error:', error);
      setBatchError(error instanceof Error ? error.message : 'Failed to pause batch');
      return false;
    }
  }, [targetDeviceId, localDeviceId, localDeviceName, updateBatchStatus, setBatchError]);

  /**
   * Cancel a running batch
   */
  const cancelBatch = useCallback(async (batchId: string): Promise<boolean> => {
    if (!targetDeviceId) return false;

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'batch_stop',
          target_device_id: targetDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {
            batch_id: batchId,
            action: 'cancel',
          },
        }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (!data.success) return false;

      const result = await pollForResult(data.command_id, 10000);

      if (result.success) {
        updateBatchStatus(batchId, { status: 'failed' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useRemoteMonitor] cancelBatch error:', error);
      setBatchError(error instanceof Error ? error.message : 'Failed to cancel batch');
      return false;
    }
  }, [targetDeviceId, localDeviceId, localDeviceName, updateBatchStatus, setBatchError]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setBatchError(null);
  }, [setBatchError]);

  // Auto-poll when enabled and has running batches
  useEffect(() => {
    if (!autoPoll || !targetDeviceId) return;

    // Check if any batch is running
    const hasRunningBatch = remoteBatches.some(b => b.status === 'running');

    if (hasRunningBatch) {
      // Start polling
      pollIntervalRef.current = setInterval(() => {
        refreshBatchStatus();
        refreshEvents();
      }, pollInterval);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [autoPoll, targetDeviceId, remoteBatches, pollInterval, refreshBatchStatus, refreshEvents]);

  // Initial fetch when target changes
  useEffect(() => {
    if (targetDeviceId) {
      refreshBatchStatus();
      refreshEvents();
    }
  }, [targetDeviceId, refreshBatchStatus, refreshEvents]);

  return {
    batches: remoteBatches,
    events: eventFeed,
    isLoadingBatches,
    isLoadingEvents,
    batchError,
    refreshBatchStatus,
    refreshEvents,
    pauseBatch,
    cancelBatch,
    clearError,
  };
}

/**
 * Poll for command result with timeout
 */
async function pollForResult(commandId: string, timeoutMs: number): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`/api/remote/mesh/commands?command_id=${commandId}`);
      if (!response.ok) {
        throw new Error('Failed to check command status');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch command');
      }

      const commands = data.commands;
      const command = commands?.find((c: any) => c.id === commandId);

      if (command) {
        if (command.status === 'completed') {
          return command.result || { success: true };
        }
        if (command.status === 'failed') {
          throw new Error(command.error || 'Command failed');
        }
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      throw error;
    }
  }

  throw new Error('Command timed out');
}

/**
 * Map CLI session status to batch status
 */
function mapSessionStatus(status: string): RemoteBatchInfo['status'] {
  switch (status) {
    case 'idle':
      return 'pending';
    case 'running':
      return 'running';
    case 'paused':
      return 'paused';
    case 'completed':
      return 'completed';
    case 'error':
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}
