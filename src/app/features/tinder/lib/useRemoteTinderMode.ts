/**
 * Hook for remote tinder mode
 * Checks device connection status from emulatorStore
 * Provides remote mode state and device info
 */

import { useCallback } from 'react';
import { useEmulatorStore, useSelectedDevice } from '@/stores/emulatorStore';

export interface RemoteTinderModeState {
  // Is a remote device available to triage?
  isRemoteAvailable: boolean;
  // Is remote mode currently active?
  isRemoteMode: boolean;
  // Connected device info
  remoteDevice: {
    id: string;
    name: string;
  } | null;
  // Local device info
  localDevice: {
    id: string;
    name: string;
  } | null;
  // Is local device registered to mesh?
  isConnected: boolean;
  // Actions
  enableRemoteMode: () => void;
  disableRemoteMode: () => void;
  toggleRemoteMode: () => void;
}

// Store for remote mode preference (separate from emulator store to avoid coupling)
let isRemoteModeEnabled = false;
const listeners = new Set<() => void>();

function setRemoteModeEnabled(enabled: boolean) {
  isRemoteModeEnabled = enabled;
  listeners.forEach(fn => fn());
}

export function useRemoteTinderMode(): RemoteTinderModeState {
  // Get emulator store state
  const isRegistered = useEmulatorStore(s => s.isRegistered);
  const localDeviceId = useEmulatorStore(s => s.localDeviceId);
  const localDeviceName = useEmulatorStore(s => s.localDeviceName);
  const selectedDeviceId = useEmulatorStore(s => s.selectedDeviceId);
  const selectedDevice = useSelectedDevice();

  // Check if remote triage is available
  const isRemoteAvailable = isRegistered && !!selectedDeviceId && !!selectedDevice;

  // Remote mode is active when enabled AND available
  const isRemoteMode = isRemoteModeEnabled && isRemoteAvailable;

  const enableRemoteMode = useCallback(() => {
    if (isRemoteAvailable) {
      setRemoteModeEnabled(true);
    }
  }, [isRemoteAvailable]);

  const disableRemoteMode = useCallback(() => {
    setRemoteModeEnabled(false);
  }, []);

  const toggleRemoteMode = useCallback(() => {
    if (isRemoteModeEnabled) {
      setRemoteModeEnabled(false);
    } else if (isRemoteAvailable) {
      setRemoteModeEnabled(true);
    }
  }, [isRemoteAvailable]);

  return {
    isRemoteAvailable,
    isRemoteMode,
    remoteDevice: selectedDevice ? {
      id: selectedDevice.device_id,
      name: selectedDevice.device_name,
    } : null,
    localDevice: localDeviceId ? {
      id: localDeviceId,
      name: localDeviceName,
    } : null,
    isConnected: isRegistered,
    enableRemoteMode,
    disableRemoteMode,
    toggleRemoteMode,
  };
}

/**
 * Selector hook: is remote triage available?
 */
export function useIsRemoteAvailable(): boolean {
  const isRegistered = useEmulatorStore(s => s.isRegistered);
  const selectedDeviceId = useEmulatorStore(s => s.selectedDeviceId);
  return isRegistered && !!selectedDeviceId;
}
