/**
 * Supabase Realtime Store
 * Manages cross-device state for Zen mode
 */

import { create } from 'zustand';
import type {
  DbDeviceSession,
  DbOffloadTask,
  PairingState,
  RealtimeConnectionState,
  DeviceRole,
} from '@/lib/supabase/realtimeTypes';

interface SupabaseRealtimeState {
  // Connection state
  connection: RealtimeConnectionState;

  // Device info
  deviceId: string | null;
  deviceName: string;
  projectId: string | null;
  role: DeviceRole;

  // Pairing state
  pairing: PairingState;

  // Online devices
  onlineDevices: DbDeviceSession[];

  // Tasks
  incomingTasks: DbOffloadTask[];
  outgoingTasks: DbOffloadTask[];

  // Actions
  setConnection: (state: Partial<RealtimeConnectionState>) => void;
  setDeviceInfo: (deviceId: string, deviceName: string, projectId: string) => void;
  setRole: (role: DeviceRole) => void;
  setPairingCode: (code: string | null) => void;
  setPaired: (partnerId: string, partnerName: string) => void;
  clearPairing: () => void;
  setOnlineDevices: (devices: DbDeviceSession[]) => void;
  addOnlineDevice: (device: DbDeviceSession) => void;
  removeOnlineDevice: (deviceId: string) => void;
  setIncomingTasks: (tasks: DbOffloadTask[]) => void;
  setOutgoingTasks: (tasks: DbOffloadTask[]) => void;
  addTask: (task: DbOffloadTask, direction: 'incoming' | 'outgoing') => void;
  updateTask: (taskId: string, updates: Partial<DbOffloadTask>) => void;
  removeTask: (taskId: string) => void;
  reset: () => void;
}

const initialState = {
  connection: {
    isConnected: false,
    isConnecting: false,
    error: null,
    lastConnectedAt: null,
  },
  deviceId: null,
  deviceName: 'This Device',
  projectId: null,
  role: 'active' as DeviceRole,
  pairing: {
    status: 'unpaired' as const,
    pairingCode: null,
    partnerId: null,
    partnerName: null,
  },
  onlineDevices: [],
  incomingTasks: [],
  outgoingTasks: [],
};

export const useSupabaseRealtimeStore = create<SupabaseRealtimeState>((set, get) => ({
  ...initialState,

  setConnection: (state) =>
    set((prev) => ({
      connection: { ...prev.connection, ...state },
    })),

  setDeviceInfo: (deviceId, deviceName, projectId) =>
    set({ deviceId, deviceName, projectId }),

  setRole: (role) => set({ role }),

  setPairingCode: (code) =>
    set({
      pairing: {
        status: code ? 'waiting' : 'unpaired',
        pairingCode: code,
        partnerId: null,
        partnerName: null,
      },
    }),

  setPaired: (partnerId, partnerName) =>
    set({
      pairing: {
        status: 'paired',
        pairingCode: null,
        partnerId,
        partnerName,
      },
    }),

  clearPairing: () =>
    set({
      pairing: {
        status: 'unpaired',
        pairingCode: null,
        partnerId: null,
        partnerName: null,
      },
    }),

  setOnlineDevices: (devices) => set({ onlineDevices: devices }),

  addOnlineDevice: (device) =>
    set((prev) => {
      // Don't add if already exists
      if (prev.onlineDevices.find((d) => d.device_id === device.device_id)) {
        return prev;
      }
      return { onlineDevices: [...prev.onlineDevices, device] };
    }),

  removeOnlineDevice: (deviceId) =>
    set((prev) => ({
      onlineDevices: prev.onlineDevices.filter((d) => d.device_id !== deviceId),
    })),

  setIncomingTasks: (tasks) => set({ incomingTasks: tasks }),

  setOutgoingTasks: (tasks) => set({ outgoingTasks: tasks }),

  addTask: (task, direction) =>
    set((prev) => {
      if (direction === 'incoming') {
        return { incomingTasks: [task, ...prev.incomingTasks] };
      }
      return { outgoingTasks: [task, ...prev.outgoingTasks] };
    }),

  updateTask: (taskId, updates) =>
    set((prev) => {
      const updateTasks = (tasks: DbOffloadTask[]) =>
        tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));

      return {
        incomingTasks: updateTasks(prev.incomingTasks),
        outgoingTasks: updateTasks(prev.outgoingTasks),
      };
    }),

  removeTask: (taskId) =>
    set((prev) => ({
      incomingTasks: prev.incomingTasks.filter((t) => t.id !== taskId),
      outgoingTasks: prev.outgoingTasks.filter((t) => t.id !== taskId),
    })),

  reset: () => set(initialState),
}));

// Selector hooks for optimized re-renders
export const useRealtimeConnection = () =>
  useSupabaseRealtimeStore((state) => state.connection);

export const useRealtimePairing = () =>
  useSupabaseRealtimeStore((state) => state.pairing);

export const useOnlineDevices = () =>
  useSupabaseRealtimeStore((state) => state.onlineDevices);

export const useIncomingTasks = () =>
  useSupabaseRealtimeStore((state) => state.incomingTasks);

export const useOutgoingTasks = () =>
  useSupabaseRealtimeStore((state) => state.outgoingTasks);

export const useIsPaired = () =>
  useSupabaseRealtimeStore((state) => state.pairing.status === 'paired');

export const usePartnerDevice = () =>
  useSupabaseRealtimeStore((state) => {
    const { partnerId } = state.pairing;
    if (!partnerId) return null;
    return state.onlineDevices.find((d) => d.device_id === partnerId) || null;
  });
