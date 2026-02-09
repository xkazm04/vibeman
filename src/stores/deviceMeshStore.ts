/**
 * Device Mesh Store
 * Manages device identity, registration, connection, and device list state.
 * Split from emulatorStore for reduced re-render blast radius.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';

type EmulatorTab = 'batch' | 'monitor' | 'devices' | 'responsive' | 'topology' | 'fleet';

interface DeviceMeshState {
  localDeviceId: string;
  localDeviceName: string;
  isRegistered: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  devices: RemoteDevice[];
  isLoadingDevices: boolean;
  lastRefreshed: Date | null;
  selectedDeviceId: string | null;
  activeTab: EmulatorTab;
}

interface DeviceMeshActions {
  setLocalDevice: (id: string, name: string) => void;
  setRegistered: (registered: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setDevices: (devices: RemoteDevice[]) => void;
  setLoadingDevices: (loading: boolean) => void;
  selectDevice: (deviceId: string | null) => void;
  updateDeviceName: (name: string) => void;
  setActiveTab: (tab: EmulatorTab) => void;
  reset: () => void;
}

export type DeviceMeshStore = DeviceMeshState & DeviceMeshActions;

const initialState: DeviceMeshState = {
  localDeviceId: '',
  localDeviceName: '',
  isRegistered: false,
  isConnecting: false,
  connectionError: null,
  devices: [],
  isLoadingDevices: false,
  lastRefreshed: null,
  selectedDeviceId: null,
  activeTab: 'devices',
};

export const useDeviceMeshStore = create<DeviceMeshStore>()(
  persist(
    (set) => ({
      ...initialState,

      setLocalDevice: (id, name) => set({ localDeviceId: id, localDeviceName: name }),
      setRegistered: (registered) => set({ isRegistered: registered }),
      setConnecting: (connecting) => set({ isConnecting: connecting }),
      setConnectionError: (error) => set({ connectionError: error }),
      setDevices: (devices) => set({ devices, lastRefreshed: new Date(), isLoadingDevices: false }),
      setLoadingDevices: (loading) => set({ isLoadingDevices: loading }),
      selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
      updateDeviceName: (name) => set({ localDeviceName: name }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      reset: () => set(initialState),
    }),
    {
      name: 'device-mesh-store',
      partialize: (state) => ({
        localDeviceId: state.localDeviceId,
        localDeviceName: state.localDeviceName,
        selectedDeviceId: state.selectedDeviceId,
        activeTab: state.activeTab,
      }),
    }
  )
);

/** Selector: Get other devices (excluding local) */
export function useOtherDevices(): RemoteDevice[] {
  return useDeviceMeshStore((state) => {
    return state.devices.filter((d) => d.device_id !== state.localDeviceId);
  });
}

/** Selector: Get selected target device */
export function useSelectedDevice(): RemoteDevice | null {
  return useDeviceMeshStore((state) => {
    return state.devices.find((d) => d.device_id === state.selectedDeviceId) || null;
  });
}

/** Selector: Check if any device is busy */
export function useHasBusyDevices(): boolean {
  return useDeviceMeshStore((state) => state.devices.some((d) => d.status === 'busy'));
}

/** Selector: Get device count by status */
export function useDeviceStats(): { online: number; busy: number; idle: number; total: number } {
  return useDeviceMeshStore((state) => {
    const otherDevices = state.devices.filter((d) => d.device_id !== state.localDeviceId);
    return {
      online: otherDevices.filter((d) => d.status === 'online').length,
      busy: otherDevices.filter((d) => d.status === 'busy').length,
      idle: otherDevices.filter((d) => d.status === 'idle').length,
      total: otherDevices.length,
    };
  });
}
