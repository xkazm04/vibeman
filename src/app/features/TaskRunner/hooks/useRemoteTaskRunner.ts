'use client';

/**
 * Hook for remote TaskRunner batch management
 * Fetches requirements from remote device via mesh commands
 * Manages remote batch execution and status polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useEmulatorStore,
  useSelectedDevice,
  type RemoteRequirement,
  type RemoteBatchInfo,
} from '@/stores/emulatorStore';

const BATCH_POLL_INTERVAL_MS = 10_000; // 10 seconds

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

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('[pollForResult] Error:', error);
      throw error;
    }
  }

  throw new Error('Command timed out');
}

export interface UseRemoteTaskRunnerResult {
  // Device state
  isRemoteAvailable: boolean;
  isRemoteMode: boolean;
  targetDeviceId: string | null;
  targetDeviceName: string | null;

  // Requirements state
  requirements: RemoteRequirement[];
  selectedRequirementIds: string[];
  isLoadingRequirements: boolean;
  requirementsError: string | null;

  // Batch state
  activeBatches: RemoteBatchInfo[];
  isLoadingBatches: boolean;
  batchError: string | null;

  // Actions
  toggleRemoteMode: () => void;
  fetchRequirements: () => Promise<void>;
  toggleRequirementSelection: (id: string) => void;
  selectAllRequirements: () => void;
  clearRequirementSelection: () => void;
  startBatch: (requirementIds: string[]) => Promise<boolean>;
  refreshBatchStatus: () => Promise<void>;
}

export function useRemoteTaskRunner(): UseRemoteTaskRunnerResult {
  const {
    localDeviceId,
    localDeviceName,
    isRegistered,
    selectedDeviceId,
    isRemoteTaskRunnerMode,
    remoteRequirements,
    selectedRequirementIds,
    isLoadingRequirements,
    requirementsError,
    remoteBatches,
    isLoadingBatches,
    batchError,
    setRemoteTaskRunnerMode,
    setRemoteRequirements,
    setLoadingRequirements,
    setRequirementsError,
    toggleRequirementSelection,
    selectAllRequirements,
    clearRequirementSelection,
    setRemoteBatches,
    setLoadingBatches,
    setBatchError,
    updateBatchStatus,
  } = useEmulatorStore();

  const selectedDevice = useSelectedDevice();
  const batchPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isRemoteAvailable = isRegistered && !!selectedDeviceId;

  /**
   * Toggle remote TaskRunner mode
   */
  const toggleRemoteMode = useCallback(() => {
    if (!isRemoteAvailable) return;
    setRemoteTaskRunnerMode(!isRemoteTaskRunnerMode);
  }, [isRemoteAvailable, isRemoteTaskRunnerMode, setRemoteTaskRunnerMode]);

  /**
   * Fetch requirements from remote device
   */
  const fetchRequirements = useCallback(async () => {
    if (!selectedDeviceId) {
      setRequirementsError('No target device selected');
      return;
    }

    setLoadingRequirements(true);
    setRequirementsError(null);

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'fetch_requirements',
          target_device_id: selectedDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {},
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send fetch_requirements command');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Command failed');
      }

      const result = await pollForResult(data.command_id, 15000);

      if (result.requirements) {
        setRemoteRequirements(result.requirements);
      }
    } catch (error) {
      console.error('[useRemoteTaskRunner] fetchRequirements error:', error);
      setRequirementsError(
        error instanceof Error ? error.message : 'Failed to fetch requirements'
      );
    } finally {
      setLoadingRequirements(false);
    }
  }, [
    selectedDeviceId,
    localDeviceId,
    localDeviceName,
    setLoadingRequirements,
    setRequirementsError,
    setRemoteRequirements,
  ]);

  /**
   * Start a batch execution on remote device
   */
  const startBatch = useCallback(
    async (requirementIds: string[]): Promise<boolean> => {
      if (!selectedDeviceId || requirementIds.length === 0) {
        setBatchError('No device or requirements selected');
        return false;
      }

      setLoadingBatches(true);
      setBatchError(null);

      try {
        const response = await fetch('/api/remote/mesh/commands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command_type: 'start_remote_batch',
            target_device_id: selectedDeviceId,
            source_device_id: localDeviceId,
            source_device_name: localDeviceName,
            payload: {
              requirement_ids: requirementIds,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send start_remote_batch command');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Command failed');
        }

        const result = await pollForResult(data.command_id, 20000);

        if (result.batch_id) {
          // Add new batch to tracking
          const newBatch: RemoteBatchInfo = {
            batch_id: result.batch_id,
            session_id: result.session_id,
            total_tasks: requirementIds.length,
            completed_tasks: 0,
            failed_tasks: 0,
            status: 'running',
            started_at: new Date().toISOString(),
          };

          setRemoteBatches([newBatch, ...remoteBatches]);
          clearRequirementSelection();

          // Remove started requirements from list
          const remainingReqs = remoteRequirements.filter(
            (r) => !requirementIds.includes(r.id)
          );
          setRemoteRequirements(remainingReqs);

          return true;
        }

        return false;
      } catch (error) {
        console.error('[useRemoteTaskRunner] startBatch error:', error);
        setBatchError(
          error instanceof Error ? error.message : 'Failed to start batch'
        );
        return false;
      } finally {
        setLoadingBatches(false);
      }
    },
    [
      selectedDeviceId,
      localDeviceId,
      localDeviceName,
      remoteBatches,
      remoteRequirements,
      setLoadingBatches,
      setBatchError,
      setRemoteBatches,
      setRemoteRequirements,
      clearRequirementSelection,
    ]
  );

  /**
   * Refresh batch status from remote device
   */
  const refreshBatchStatus = useCallback(async () => {
    if (!selectedDeviceId) return;

    const runningBatches = remoteBatches.filter(
      (b) => b.status === 'running' || b.status === 'pending'
    );

    if (runningBatches.length === 0) return;

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'get_batch_status',
          target_device_id: selectedDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {
            batch_ids: runningBatches.map((b) => b.batch_id),
          },
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.success) return;

      const result = await pollForResult(data.command_id, 10000);

      if (result.batches) {
        for (const batchUpdate of result.batches) {
          updateBatchStatus(batchUpdate.batch_id, {
            completed_tasks: batchUpdate.completed_tasks,
            failed_tasks: batchUpdate.failed_tasks,
            status: batchUpdate.status,
            current_task: batchUpdate.current_task,
          });
        }
      }
    } catch (error) {
      console.error('[useRemoteTaskRunner] refreshBatchStatus error:', error);
    }
  }, [
    selectedDeviceId,
    localDeviceId,
    localDeviceName,
    remoteBatches,
    updateBatchStatus,
  ]);

  // Auto-fetch requirements when entering remote mode
  useEffect(() => {
    if (isRemoteTaskRunnerMode && selectedDeviceId) {
      fetchRequirements();
    }
  }, [isRemoteTaskRunnerMode, selectedDeviceId, fetchRequirements]);

  // Start batch status polling when there are running batches
  useEffect(() => {
    const hasRunningBatches = remoteBatches.some(
      (b) => b.status === 'running' || b.status === 'pending'
    );

    if (isRemoteTaskRunnerMode && hasRunningBatches) {
      // Clear any existing interval
      if (batchPollIntervalRef.current) {
        clearInterval(batchPollIntervalRef.current);
      }

      // Start polling
      batchPollIntervalRef.current = setInterval(() => {
        refreshBatchStatus();
      }, BATCH_POLL_INTERVAL_MS);

      // Initial refresh
      refreshBatchStatus();
    } else if (batchPollIntervalRef.current) {
      clearInterval(batchPollIntervalRef.current);
      batchPollIntervalRef.current = null;
    }

    return () => {
      if (batchPollIntervalRef.current) {
        clearInterval(batchPollIntervalRef.current);
        batchPollIntervalRef.current = null;
      }
    };
  }, [isRemoteTaskRunnerMode, remoteBatches, refreshBatchStatus]);

  // Clear remote mode when device disconnects
  useEffect(() => {
    if (!isRemoteAvailable && isRemoteTaskRunnerMode) {
      setRemoteTaskRunnerMode(false);
    }
  }, [isRemoteAvailable, isRemoteTaskRunnerMode, setRemoteTaskRunnerMode]);

  return {
    // Device state
    isRemoteAvailable,
    isRemoteMode: isRemoteTaskRunnerMode,
    targetDeviceId: selectedDeviceId,
    targetDeviceName: selectedDevice?.device_name || null,

    // Requirements state
    requirements: remoteRequirements,
    selectedRequirementIds,
    isLoadingRequirements,
    requirementsError,

    // Batch state
    activeBatches: remoteBatches,
    isLoadingBatches,
    batchError,

    // Actions
    toggleRemoteMode,
    fetchRequirements,
    toggleRequirementSelection,
    selectAllRequirements,
    clearRequirementSelection,
    startBatch,
    refreshBatchStatus,
  };
}

export default useRemoteTaskRunner;
