/**
 * Supabase Realtime Hook
 * Manages Supabase channel subscriptions for cross-device communication
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSupabaseRealtimeStore } from '../lib/supabaseRealtimeStore';
import {
  vibemanRealtime,
  getOrCreateDeviceId,
  getDeviceName,
  isSupabaseRealtimeConfigured,
} from '@/lib/supabase/realtime';
import type { DbDeviceSession, PresenceState } from '@/lib/supabase/realtimeTypes';

interface UseSupabaseRealtimeOptions {
  projectId: string;
  autoConnect?: boolean;
}

/**
 * Convert presence map to device session array for the store
 */
function presenceMapToDeviceSessions(presenceMap: Map<string, PresenceState>): DbDeviceSession[] {
  const sessions: DbDeviceSession[] = [];
  presenceMap.forEach((state, deviceId) => {
    sessions.push({
      id: deviceId,
      device_id: state.deviceId,
      device_name: state.deviceName,
      project_id: state.projectId,
      role: state.role,
      pairing_code: null,
      partner_device_id: null,
      is_online: true,
      last_seen_at: state.onlineAt,
      capabilities: state.capabilities,
      created_at: state.onlineAt,
      updated_at: state.onlineAt,
    });
  });
  return sessions;
}

export function useSupabaseRealtime({ projectId, autoConnect = true }: UseSupabaseRealtimeOptions) {
  const store = useSupabaseRealtimeStore();
  const isInitialized = useRef(false);
  const deviceIdRef = useRef<string | null>(null);
  const hasFetchedTasks = useRef(false);
  const lastConnectionState = useRef(false);

  // Connect to Supabase Realtime
  const connect = useCallback(async () => {
    if (!isSupabaseRealtimeConfigured()) {
      store.setConnection({ error: 'Supabase not configured' });
      return false;
    }

    store.setConnection({ isConnecting: true, error: null });

    try {
      const deviceId = getOrCreateDeviceId();
      const deviceName = getDeviceName();
      deviceIdRef.current = deviceId;

      const success = await vibemanRealtime.connect({
        projectId,
        deviceName,
        role: store.role,
      });

      if (success) {
        store.setDeviceInfo(deviceId, deviceName, projectId);
        store.setConnection({
          isConnected: true,
          isConnecting: false,
          lastConnectedAt: new Date(),
        });

        // Set up callbacks for real-time updates
        vibemanRealtime.onPresenceChange((presenceMap) => {
          const sessions = presenceMapToDeviceSessions(presenceMap);
          store.setOnlineDevices(sessions);
        });

        vibemanRealtime.onTaskUpdate((taskBroadcast) => {
          // Task broadcasts have different shape than DbOffloadTask
          // The taskId is in the broadcast, fetch full task if needed
          console.log('[Realtime] Task update:', taskBroadcast);
        });

        vibemanRealtime.onEvent((event) => {
          // Handle pairing events
          if (event.type === 'device:paired' && event.payload.targetDeviceId === deviceId) {
            store.setPaired(
              event.payload.initiatorDeviceId as string,
              'Partner Device'
            );
          } else if (event.type === 'device:unpaired') {
            if (
              event.payload.deviceId === store.pairing.partnerId ||
              event.payload.formerPartnerId === deviceId
            ) {
              store.clearPairing();
            }
          }
        });

        return true;
      }

      store.setConnection({
        isConnected: false,
        isConnecting: false,
        error: 'Failed to connect',
      });
      return false;
    } catch (error) {
      store.setConnection({
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }, [projectId, store]);

  // Disconnect from Supabase Realtime
  const disconnect = useCallback(async () => {
    await vibemanRealtime.disconnect();
    store.setConnection({ isConnected: false });
    store.reset();
  }, [store]);

  // Generate a new pairing code
  const generatePairingCode = useCallback(async () => {
    const code = await vibemanRealtime.generatePairingCode();
    if (code) {
      store.setPairingCode(code);
    }
    return code;
  }, [store]);

  // Pair with another device using their code
  const pairWithCode = useCallback(
    async (code: string) => {
      const success = await vibemanRealtime.pairWithCode(code);
      if (success) {
        // Pairing state will be updated via the event callback
        return true;
      }
      return false;
    },
    []
  );

  // Clear pairing
  const unpair = useCallback(async () => {
    // Call API to unpair
    const deviceId = deviceIdRef.current || store.deviceId;
    if (deviceId) {
      await fetch(`/api/bridge/realtime/pair?deviceId=${deviceId}`, {
        method: 'DELETE',
      });
    }
    store.clearPairing();
  }, [store]);

  // Create an offload task
  const createTask = useCallback(
    async (requirementName: string, requirementContent: string, contextPath?: string) => {
      const taskId = await vibemanRealtime.createTask(requirementName, requirementContent, {
        contextPath,
        targetDeviceId: store.pairing.partnerId || undefined,
      });

      if (taskId) {
        // Fetch the created task and add to outgoing
        const deviceId = deviceIdRef.current || store.deviceId;
        const response = await fetch(
          `/api/bridge/realtime/tasks?projectId=${projectId}&deviceId=${deviceId}&direction=outgoing`
        );
        const { tasks } = await response.json();
        store.setOutgoingTasks(tasks || []);
      }

      return taskId;
    },
    [projectId, store]
  );

  // Claim an incoming task
  const claimTask = useCallback(
    async (taskId: string) => {
      return vibemanRealtime.claimTask(taskId);
    },
    []
  );

  // Update task status
  const updateTaskStatus = useCallback(
    async (
      taskId: string,
      status: 'running' | 'completed' | 'failed',
      options?: { resultSummary?: string; errorMessage?: string }
    ) => {
      return vibemanRealtime.updateTaskStatus(taskId, status, options);
    },
    []
  );

  // Get stable store methods
  const setIncomingTasks = store.setIncomingTasks;
  const setOutgoingTasks = store.setOutgoingTasks;
  const storeDeviceId = store.deviceId;
  const isConnected = store.connection.isConnected;

  // Fetch tasks - uses refs and stable methods to avoid dependency issues
  const fetchTasks = useCallback(async () => {
    const deviceId = deviceIdRef.current || storeDeviceId;
    if (!deviceId || !projectId) return;

    try {
      // Fetch incoming tasks (pending or assigned to this device)
      const incomingResponse = await fetch(
        `/api/bridge/realtime/tasks?projectId=${projectId}&deviceId=${deviceId}&direction=incoming`
      );
      const { tasks: incoming } = await incomingResponse.json();
      setIncomingTasks(incoming || []);

      // Fetch outgoing tasks (created by this device)
      const outgoingResponse = await fetch(
        `/api/bridge/realtime/tasks?projectId=${projectId}&deviceId=${deviceId}&direction=outgoing`
      );
      const { tasks: outgoing } = await outgoingResponse.json();
      setOutgoingTasks(outgoing || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, [projectId, storeDeviceId, setIncomingTasks, setOutgoingTasks]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && projectId && !isInitialized.current) {
      isInitialized.current = true;
      hasFetchedTasks.current = false;
      connect().then((success) => {
        if (success && !hasFetchedTasks.current) {
          hasFetchedTasks.current = true;
          fetchTasks();
        }
      });
    }

    return () => {
      // Don't disconnect on unmount - let the app manage connection lifecycle
    };
  }, [autoConnect, projectId, connect, fetchTasks]);

  // Fetch tasks when connection state changes from disconnected to connected
  useEffect(() => {
    // Only fetch when transitioning from disconnected to connected
    if (isConnected && !lastConnectionState.current && !hasFetchedTasks.current) {
      hasFetchedTasks.current = true;
      fetchTasks();
    }
    // Reset the flag when disconnected
    if (!isConnected) {
      hasFetchedTasks.current = false;
    }
    lastConnectionState.current = isConnected;
  }, [isConnected, fetchTasks]);

  return {
    // Connection
    isConnected: store.connection.isConnected,
    isConnecting: store.connection.isConnecting,
    connectionError: store.connection.error,
    connect,
    disconnect,

    // Device info
    deviceId: store.deviceId,
    deviceName: store.deviceName,

    // Pairing
    pairingStatus: store.pairing.status,
    pairingCode: store.pairing.pairingCode,
    partnerId: store.pairing.partnerId,
    partnerName: store.pairing.partnerName,
    generatePairingCode,
    pairWithCode,
    unpair,

    // Devices
    onlineDevices: store.onlineDevices,

    // Tasks
    incomingTasks: store.incomingTasks,
    outgoingTasks: store.outgoingTasks,
    createTask,
    claimTask,
    updateTaskStatus,
    fetchTasks,
  };
}
