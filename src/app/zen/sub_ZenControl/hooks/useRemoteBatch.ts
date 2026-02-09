/**
 * useRemoteBatch Hook
 * Manages fetching requirements from remote device and starting batches
 */

import { useCallback, useRef } from 'react';
import { useRemoteWorkStore, type RemoteRequirement, type RemoteBatchInfo } from '@/stores/remoteWorkStore';
import { useDeviceMeshStore } from '@/stores/deviceMeshStore';

interface UseRemoteBatchResult {
  // State
  requirements: RemoteRequirement[];
  selectedIds: string[];
  isLoading: boolean;
  error: string | null;
  batches: RemoteBatchInfo[];
  isLoadingBatches: boolean;
  batchError: string | null;

  // Actions
  fetchRequirements: () => Promise<void>;
  toggleSelection: (requirementId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  startBatch: () => Promise<boolean>;
  getBatchStatus: () => Promise<void>;
  clearError: () => void;
}

export function useRemoteBatch(targetDeviceId: string | null): UseRemoteBatchResult {
  const {
    remoteRequirements,
    selectedRequirementIds,
    isLoadingRequirements,
    requirementsError,
    remoteBatches,
    isLoadingBatches,
    batchError,
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
  } = useRemoteWorkStore();

  const {
    localDeviceId,
    localDeviceName,
  } = useDeviceMeshStore();

  const pendingCommandRef = useRef<string | null>(null);

  /**
   * Fetch requirements from target device
   */
  const fetchRequirements = useCallback(async () => {
    if (!targetDeviceId) {
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
          target_device_id: targetDeviceId,
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

      const commandId = data.command_id;
      pendingCommandRef.current = commandId;

      // Poll for result
      const result = await pollForResult(commandId, 15000);

      if (pendingCommandRef.current === commandId) {
        const requirements = result.requirements || [];
        setRemoteRequirements(requirements);
      }
    } catch (error) {
      console.error('[useRemoteBatch] fetchRequirements error:', error);
      setRequirementsError(error instanceof Error ? error.message : 'Failed to fetch requirements');
    } finally {
      setLoadingRequirements(false);
    }
  }, [targetDeviceId, localDeviceId, localDeviceName, setLoadingRequirements, setRequirementsError, setRemoteRequirements]);

  /**
   * Start a batch on target device with selected requirements
   */
  const startBatch = useCallback(async (): Promise<boolean> => {
    if (!targetDeviceId) {
      setBatchError('No target device selected');
      return false;
    }

    if (selectedRequirementIds.length === 0) {
      setBatchError('No requirements selected');
      return false;
    }

    setLoadingBatches(true);
    setBatchError(null);

    try {
      // Get requirement names from selection
      const selectedRequirements = remoteRequirements.filter(r =>
        selectedRequirementIds.includes(r.id)
      );
      const requirementNames = selectedRequirements.map(r => r.name);

      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'start_remote_batch',
          target_device_id: targetDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {
            requirement_names: requirementNames,
            project_id: selectedRequirements[0]?.project_id,
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

      // Poll for result
      const result = await pollForResult(data.command_id, 20000);

      if (result.success) {
        // Add batch to tracking
        const newBatch: RemoteBatchInfo = {
          batch_id: result.batch_id || `batch-${Date.now()}`,
          session_id: result.session_id,
          total_tasks: requirementNames.length,
          completed_tasks: 0,
          failed_tasks: 0,
          status: 'running',
          started_at: new Date().toISOString(),
        };
        setRemoteBatches([newBatch, ...remoteBatches]);
        clearRequirementSelection();
        return true;
      }

      throw new Error(result.error || 'Failed to start batch');
    } catch (error) {
      console.error('[useRemoteBatch] startBatch error:', error);
      setBatchError(error instanceof Error ? error.message : 'Failed to start batch');
      return false;
    } finally {
      setLoadingBatches(false);
    }
  }, [
    targetDeviceId,
    localDeviceId,
    localDeviceName,
    selectedRequirementIds,
    remoteRequirements,
    remoteBatches,
    setLoadingBatches,
    setBatchError,
    setRemoteBatches,
    clearRequirementSelection,
  ]);

  /**
   * Get batch status from target device
   */
  const getBatchStatus = useCallback(async () => {
    if (!targetDeviceId || remoteBatches.length === 0) return;

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'get_batch_status',
          target_device_id: targetDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {
            batch_id: remoteBatches[0]?.batch_id,
          },
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.success) return;

      const result = await pollForResult(data.command_id, 10000);

      if (result.batch) {
        updateBatchStatus(result.batch.batch_id, result.batch);
      }
    } catch (error) {
      console.error('[useRemoteBatch] getBatchStatus error:', error);
    }
  }, [targetDeviceId, localDeviceId, localDeviceName, remoteBatches, updateBatchStatus]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setRequirementsError(null);
    setBatchError(null);
  }, [setRequirementsError, setBatchError]);

  return {
    requirements: remoteRequirements,
    selectedIds: selectedRequirementIds,
    isLoading: isLoadingRequirements,
    error: requirementsError,
    batches: remoteBatches,
    isLoadingBatches,
    batchError,
    fetchRequirements,
    toggleSelection: toggleRequirementSelection,
    selectAll: selectAllRequirements,
    clearSelection: clearRequirementSelection,
    startBatch,
    getBatchStatus,
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
      console.error('[pollForResult] Error:', error);
      throw error;
    }
  }

  throw new Error('Command timed out');
}
