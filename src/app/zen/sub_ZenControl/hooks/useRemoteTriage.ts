/**
 * useRemoteTriage Hook
 * Manages fetching directions from remote device and sending triage actions
 */

import { useCallback, useRef } from 'react';
import { useRemoteWorkStore, type RemoteDirection } from '@/stores/remoteWorkStore';
import { useDeviceMeshStore } from '@/stores/deviceMeshStore';

interface UseRemoteTriageResult {
  // State
  directions: RemoteDirection[];
  isLoading: boolean;
  error: string | null;
  triageStats: {
    reviewed: number;
    total: number;
    accepted: number;
    rejected: number;
  };

  // Actions
  fetchDirections: () => Promise<void>;
  acceptDirection: (directionId: string) => Promise<boolean>;
  rejectDirection: (directionId: string) => Promise<boolean>;
  skipDirection: (directionId: string) => void;
  clearError: () => void;
}

export function useRemoteTriage(targetDeviceId: string | null): UseRemoteTriageResult {
  const {
    remoteDirections,
    isLoadingDirections,
    directionsError,
    triageStats,
    setRemoteDirections,
    setLoadingDirections,
    setDirectionsError,
    updateTriageStats,
    removeDirection,
  } = useRemoteWorkStore();

  const {
    localDeviceId,
    localDeviceName,
  } = useDeviceMeshStore();

  // Track pending commands to avoid duplicates
  const pendingCommandRef = useRef<string | null>(null);

  /**
   * Fetch pending directions from target device via mesh command
   */
  const fetchDirections = useCallback(async () => {
    if (!targetDeviceId) {
      setDirectionsError('No target device selected');
      return;
    }

    setLoadingDirections(true);
    setDirectionsError(null);

    try {
      // Send fetch_directions command
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'fetch_directions',
          target_device_id: targetDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {},
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

      // Poll for result
      const directions = await pollForResult(commandId, 10000);

      if (pendingCommandRef.current === commandId) {
        setRemoteDirections(directions);
        updateTriageStats({ total: directions.length, reviewed: 0, accepted: 0, rejected: 0 });
      }
    } catch (error) {
      console.error('[useRemoteTriage] fetchDirections error:', error);
      setDirectionsError(error instanceof Error ? error.message : 'Failed to fetch directions');
    } finally {
      setLoadingDirections(false);
    }
  }, [targetDeviceId, localDeviceId, localDeviceName, setLoadingDirections, setDirectionsError, setRemoteDirections, updateTriageStats]);

  /**
   * Accept a direction (creates requirement on target device)
   */
  const acceptDirection = useCallback(async (directionId: string): Promise<boolean> => {
    if (!targetDeviceId) return false;

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'triage_direction',
          target_device_id: targetDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {
            direction_id: directionId,
            action: 'accept',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send triage command');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Command failed');
      }

      // Poll for result
      const result = await pollForResult(data.command_id, 10000);

      if (result.success) {
        removeDirection(directionId);
        updateTriageStats({
          reviewed: triageStats.reviewed + 1,
          accepted: triageStats.accepted + 1,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useRemoteTriage] acceptDirection error:', error);
      setDirectionsError(error instanceof Error ? error.message : 'Failed to accept direction');
      return false;
    }
  }, [targetDeviceId, localDeviceId, localDeviceName, removeDirection, updateTriageStats, triageStats, setDirectionsError]);

  /**
   * Reject a direction
   */
  const rejectDirection = useCallback(async (directionId: string): Promise<boolean> => {
    if (!targetDeviceId) return false;

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'triage_direction',
          target_device_id: targetDeviceId,
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
          payload: {
            direction_id: directionId,
            action: 'reject',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send triage command');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Command failed');
      }

      // Poll for result
      const result = await pollForResult(data.command_id, 10000);

      if (result.success) {
        removeDirection(directionId);
        updateTriageStats({
          reviewed: triageStats.reviewed + 1,
          rejected: triageStats.rejected + 1,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useRemoteTriage] rejectDirection error:', error);
      setDirectionsError(error instanceof Error ? error.message : 'Failed to reject direction');
      return false;
    }
  }, [targetDeviceId, localDeviceId, localDeviceName, removeDirection, updateTriageStats, triageStats, setDirectionsError]);

  /**
   * Skip a direction (local only, just remove from view)
   */
  const skipDirection = useCallback((directionId: string) => {
    removeDirection(directionId);
    updateTriageStats({ reviewed: triageStats.reviewed + 1 });
  }, [removeDirection, updateTriageStats, triageStats]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setDirectionsError(null);
  }, [setDirectionsError]);

  return {
    directions: remoteDirections,
    isLoading: isLoadingDirections,
    error: directionsError,
    triageStats,
    fetchDirections,
    acceptDirection,
    rejectDirection,
    skipDirection,
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

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('[pollForResult] Error:', error);
      throw error;
    }
  }

  throw new Error('Command timed out');
}
