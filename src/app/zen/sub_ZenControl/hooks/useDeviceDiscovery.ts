'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useEmulatorStore } from '@/stores/emulatorStore';
import {
  getOrCreateDeviceId,
  getDeviceName,
  setDeviceName as saveDeviceName,
} from '@/lib/remote/deviceTypes';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';

interface UseDeviceDiscoveryOptions {
  autoRegister?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

interface UseDeviceDiscoveryResult {
  // State
  localDeviceId: string;
  localDeviceName: string;
  isRegistered: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  devices: RemoteDevice[];
  isLoadingDevices: boolean;
  selectedDeviceId: string | null;

  // Actions
  registerDevice: () => Promise<boolean>;
  unregisterDevice: () => Promise<boolean>;
  refreshDevices: () => Promise<void>;
  selectDevice: (deviceId: string | null) => void;
  updateDeviceName: (name: string) => Promise<boolean>;
  sendHeartbeat: (status?: 'online' | 'busy' | 'idle', activeSessions?: number) => Promise<boolean>;
}

export function useDeviceDiscovery(options: UseDeviceDiscoveryOptions = {}): UseDeviceDiscoveryResult {
  const {
    autoRegister = false,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
  } = options;

  // Use individual selectors to avoid unnecessary re-renders
  const localDeviceId = useEmulatorStore((s) => s.localDeviceId);
  const localDeviceName = useEmulatorStore((s) => s.localDeviceName);
  const isRegistered = useEmulatorStore((s) => s.isRegistered);
  const isConnecting = useEmulatorStore((s) => s.isConnecting);
  const connectionError = useEmulatorStore((s) => s.connectionError);
  const devices = useEmulatorStore((s) => s.devices);
  const isLoadingDevices = useEmulatorStore((s) => s.isLoadingDevices);
  const selectedDeviceId = useEmulatorStore((s) => s.selectedDeviceId);

  // Get store actions (these are stable references)
  const setLocalDevice = useEmulatorStore((s) => s.setLocalDevice);
  const setRegistered = useEmulatorStore((s) => s.setRegistered);
  const setConnecting = useEmulatorStore((s) => s.setConnecting);
  const setConnectionError = useEmulatorStore((s) => s.setConnectionError);
  const setDevices = useEmulatorStore((s) => s.setDevices);
  const setLoadingDevices = useEmulatorStore((s) => s.setLoadingDevices);
  const selectDeviceAction = useEmulatorStore((s) => s.selectDevice);
  const updateDeviceNameAction = useEmulatorStore((s) => s.updateDeviceName);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize local device ID and name on mount
  useEffect(() => {
    const deviceId = getOrCreateDeviceId();
    const deviceName = getDeviceName();
    setLocalDevice(deviceId, deviceName);
  }, [setLocalDevice]);

  // Register this device with the server
  const registerDevice = useCallback(async (): Promise<boolean> => {
    const deviceId = getOrCreateDeviceId();
    const deviceName = getDeviceName();

    setConnecting(true);
    setConnectionError(null);

    try {
      const response = await fetch('/api/remote/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          device_name: deviceName,
          device_type: 'desktop',
          hostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRegistered(true);
        setConnectionError(null);
        setLocalDevice(deviceId, deviceName);
        return true;
      } else {
        const errorMsg = data.error || 'Registration failed';
        console.error('[useDeviceDiscovery] Registration failed:', errorMsg);
        setConnectionError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      console.error('[useDeviceDiscovery] Registration error:', err);
      setConnectionError(errorMsg);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [setConnecting, setConnectionError, setRegistered, setLocalDevice]);

  // Unregister this device
  const unregisterDevice = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/remote/devices', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setRegistered(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useDeviceDiscovery] Unregister error:', err);
      return false;
    }
  }, [setRegistered]);

  // Refresh the list of online devices
  const refreshDevices = useCallback(async (): Promise<void> => {
    setLoadingDevices(true);

    try {
      const response = await fetch('/api/remote/devices?online=true');
      const data = await response.json();

      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error('[useDeviceDiscovery] Refresh error:', err);
    } finally {
      setLoadingDevices(false);
    }
  }, [setLoadingDevices, setDevices]);

  // Select a target device
  const selectDevice = useCallback(
    (deviceId: string | null) => {
      selectDeviceAction(deviceId);
    },
    [selectDeviceAction]
  );

  // Update device name
  const updateDeviceName = useCallback(
    async (name: string): Promise<boolean> => {
      // Save locally
      saveDeviceName(name);
      updateDeviceNameAction(name);

      // Re-register to update server
      if (isRegistered) {
        return registerDevice();
      }
      return true;
    },
    [updateDeviceNameAction, isRegistered, registerDevice]
  );

  // Send heartbeat
  const sendHeartbeat = useCallback(
    async (status?: 'online' | 'busy' | 'idle', activeSessions?: number): Promise<boolean> => {
      try {
        const response = await fetch('/api/remote/devices/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, active_sessions: activeSessions }),
        });

        const data = await response.json();
        return data.success;
      } catch (err) {
        console.error('[useDeviceDiscovery] Heartbeat error:', err);
        return false;
      }
    },
    []
  );

  // Store refs for callbacks to use in intervals (avoids dependency issues)
  const refreshDevicesRef = useRef(refreshDevices);
  const sendHeartbeatRef = useRef(sendHeartbeat);

  // Keep refs up to date
  useEffect(() => {
    refreshDevicesRef.current = refreshDevices;
  }, [refreshDevices]);

  useEffect(() => {
    sendHeartbeatRef.current = sendHeartbeat;
  }, [sendHeartbeat]);

  // Auto-register on mount if requested
  useEffect(() => {
    if (autoRegister && !isRegistered && !isConnecting) {
      registerDevice();
    }
  }, [autoRegister, isRegistered, isConnecting, registerDevice]);

  // Auto-refresh devices at interval
  useEffect(() => {
    if (!autoRefresh || !isRegistered) {
      return;
    }

    // Initial refresh
    refreshDevicesRef.current();

    // Set up interval using ref to avoid dependency issues
    refreshTimerRef.current = setInterval(() => {
      refreshDevicesRef.current();
    }, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, isRegistered]);

  // Start heartbeat when registered
  useEffect(() => {
    if (!isRegistered) {
      return;
    }

    // Send heartbeat every 30 seconds using ref
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeatRef.current();
    }, 30000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [isRegistered]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't unregister on unmount - device should stay online
      // User can manually disconnect if needed
    };
  }, []);

  return {
    localDeviceId,
    localDeviceName,
    isRegistered,
    isConnecting,
    connectionError,
    devices,
    isLoadingDevices,
    selectedDeviceId,

    registerDevice,
    unregisterDevice,
    refreshDevices,
    selectDevice,
    updateDeviceName,
    sendHeartbeat,
  };
}
