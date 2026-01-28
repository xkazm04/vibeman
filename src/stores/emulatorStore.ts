/**
 * Emulator Store
 * Client-side state management for multi-device mesh control
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';

export interface EmulatorState {
  // This device info
  localDeviceId: string;
  localDeviceName: string;
  isRegistered: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Online devices
  devices: RemoteDevice[];
  isLoadingDevices: boolean;
  lastRefreshed: Date | null;

  // Selected target device for sending commands
  selectedDeviceId: string | null;

  // Actions
  setLocalDevice: (id: string, name: string) => void;
  setRegistered: (registered: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setDevices: (devices: RemoteDevice[]) => void;
  setLoadingDevices: (loading: boolean) => void;
  selectDevice: (deviceId: string | null) => void;
  updateDeviceName: (name: string) => void;
  reset: () => void;
}

const initialState = {
  localDeviceId: '',
  localDeviceName: '',
  isRegistered: false,
  isConnecting: false,
  connectionError: null as string | null,
  devices: [] as RemoteDevice[],
  isLoadingDevices: false,
  lastRefreshed: null as Date | null,
  selectedDeviceId: null as string | null,
};

export const useEmulatorStore = create<EmulatorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setLocalDevice: (id, name) => set({ localDeviceId: id, localDeviceName: name }),

      setRegistered: (registered) => set({ isRegistered: registered }),

      setConnecting: (connecting) => set({ isConnecting: connecting }),

      setConnectionError: (error) => set({ connectionError: error }),

      setDevices: (devices) =>
        set({
          devices,
          lastRefreshed: new Date(),
          isLoadingDevices: false,
        }),

      setLoadingDevices: (loading) => set({ isLoadingDevices: loading }),

      selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

      updateDeviceName: (name) => set({ localDeviceName: name }),

      reset: () => set(initialState),
    }),
    {
      name: 'emulator-store',
      partialize: (state) => ({
        localDeviceId: state.localDeviceId,
        localDeviceName: state.localDeviceName,
        selectedDeviceId: state.selectedDeviceId,
      }),
    }
  )
);

/**
 * Selector: Get other devices (excluding local)
 */
export function useOtherDevices(): RemoteDevice[] {
  return useEmulatorStore((state) => {
    const { devices, localDeviceId } = state;
    return devices.filter((d) => d.device_id !== localDeviceId);
  });
}

/**
 * Selector: Get selected target device
 */
export function useSelectedDevice(): RemoteDevice | null {
  return useEmulatorStore((state) => {
    const { devices, selectedDeviceId } = state;
    return devices.find((d) => d.device_id === selectedDeviceId) || null;
  });
}

/**
 * Selector: Check if any device is busy
 */
export function useHasBusyDevices(): boolean {
  return useEmulatorStore((state) =>
    state.devices.some((d) => d.status === 'busy')
  );
}

/**
 * Selector: Get device count by status
 */
export function useDeviceStats(): { online: number; busy: number; idle: number; total: number } {
  return useEmulatorStore((state) => {
    const { devices, localDeviceId } = state;
    const otherDevices = devices.filter((d) => d.device_id !== localDeviceId);
    return {
      online: otherDevices.filter((d) => d.status === 'online').length,
      busy: otherDevices.filter((d) => d.status === 'busy').length,
      idle: otherDevices.filter((d) => d.status === 'idle').length,
      total: otherDevices.length,
    };
  });
}
