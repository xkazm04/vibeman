/**
 * Emulator Store
 * Client-side state management for multi-device mesh control
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';
import type { Breakpoint } from '@/lib/emulator/mediaQueryDetector';
import { DEFAULT_BREAKPOINTS } from '@/lib/emulator/mediaQueryDetector';

// Remote direction (fetched from target device)
export interface RemoteDirection {
  id: string;
  summary: string;
  direction: string;
  context_name?: string;
  context_map_title?: string;
  project_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

// Remote requirement (fetched from target device)
export interface RemoteRequirement {
  id: string;
  name: string;
  project_id: string;
  project_name?: string;
  created_at: string;
  source?: 'direction' | 'idea' | 'manual';
}

// Remote batch status info
export interface RemoteBatchInfo {
  batch_id: string;
  session_id?: string;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  current_task?: string;
  started_at?: string;
}

// Remote event from event feed
export interface RemoteEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

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

  // Active tab (note: 'triage' removed - triage done via Tinder module)
  activeTab: 'batch' | 'monitor' | 'devices' | 'responsive' | 'topology' | 'fleet';

  // Remote directions (from target device)
  remoteDirections: RemoteDirection[];
  isLoadingDirections: boolean;
  directionsError: string | null;
  triageStats: { reviewed: number; total: number; accepted: number; rejected: number };

  // Remote requirements (from target device)
  remoteRequirements: RemoteRequirement[];
  isLoadingRequirements: boolean;
  requirementsError: string | null;
  selectedRequirementIds: string[];

  // Remote batch status
  remoteBatches: RemoteBatchInfo[];
  isLoadingBatches: boolean;
  batchError: string | null;

  // Event feed
  eventFeed: RemoteEvent[];
  isLoadingEvents: boolean;

  // TaskRunner remote mode
  isRemoteTaskRunnerMode: boolean;

  // Breakpoint ruler state
  viewportWidth: number;
  breakpoints: Breakpoint[];
  customBreakpoints: Breakpoint[];
  isBreakpointRulerVisible: boolean;

  // Device Actions
  setLocalDevice: (id: string, name: string) => void;
  setRegistered: (registered: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setDevices: (devices: RemoteDevice[]) => void;
  setLoadingDevices: (loading: boolean) => void;
  selectDevice: (deviceId: string | null) => void;
  updateDeviceName: (name: string) => void;

  // Tab Actions
  setActiveTab: (tab: 'batch' | 'monitor' | 'devices' | 'responsive' | 'topology' | 'fleet') => void;

  // Direction Actions
  setRemoteDirections: (directions: RemoteDirection[]) => void;
  setLoadingDirections: (loading: boolean) => void;
  setDirectionsError: (error: string | null) => void;
  updateTriageStats: (stats: Partial<EmulatorState['triageStats']>) => void;
  removeDirection: (directionId: string) => void;

  // Requirement Actions
  setRemoteRequirements: (requirements: RemoteRequirement[]) => void;
  setLoadingRequirements: (loading: boolean) => void;
  setRequirementsError: (error: string | null) => void;
  toggleRequirementSelection: (requirementId: string) => void;
  selectAllRequirements: () => void;
  clearRequirementSelection: () => void;

  // Batch Actions
  setRemoteBatches: (batches: RemoteBatchInfo[]) => void;
  setLoadingBatches: (loading: boolean) => void;
  setBatchError: (error: string | null) => void;
  updateBatchStatus: (batchId: string, updates: Partial<RemoteBatchInfo>) => void;

  // Event Actions
  setEventFeed: (events: RemoteEvent[]) => void;
  addEvent: (event: RemoteEvent) => void;
  setLoadingEvents: (loading: boolean) => void;

  // TaskRunner remote mode actions
  setRemoteTaskRunnerMode: (mode: boolean) => void;

  // Breakpoint actions
  setViewportWidth: (width: number) => void;
  setBreakpoints: (breakpoints: Breakpoint[]) => void;
  addCustomBreakpoint: (breakpoint: Breakpoint) => void;
  removeCustomBreakpoint: (name: string) => void;
  toggleBreakpointRuler: () => void;
  setBreakpointRulerVisible: (visible: boolean) => void;
  jumpToBreakpoint: (breakpoint: Breakpoint) => void;

  // Reset
  reset: () => void;
  resetRemoteData: () => void;
}

const initialState = {
  // Device state
  localDeviceId: '',
  localDeviceName: '',
  isRegistered: false,
  isConnecting: false,
  connectionError: null as string | null,
  devices: [] as RemoteDevice[],
  isLoadingDevices: false,
  lastRefreshed: null as Date | null,
  selectedDeviceId: null as string | null,

  // Tab (note: 'triage' removed - triage done via Tinder module)
  activeTab: 'devices' as 'batch' | 'monitor' | 'devices' | 'responsive' | 'topology' | 'fleet',

  // Remote directions
  remoteDirections: [] as RemoteDirection[],
  isLoadingDirections: false,
  directionsError: null as string | null,
  triageStats: { reviewed: 0, total: 0, accepted: 0, rejected: 0 },

  // Remote requirements
  remoteRequirements: [] as RemoteRequirement[],
  isLoadingRequirements: false,
  requirementsError: null as string | null,
  selectedRequirementIds: [] as string[],

  // Remote batches
  remoteBatches: [] as RemoteBatchInfo[],
  isLoadingBatches: false,
  batchError: null as string | null,

  // Event feed
  eventFeed: [] as RemoteEvent[],
  isLoadingEvents: false,

  // TaskRunner remote mode
  isRemoteTaskRunnerMode: false,

  // Breakpoint ruler state
  viewportWidth: 1280,
  breakpoints: DEFAULT_BREAKPOINTS,
  customBreakpoints: [] as Breakpoint[],
  isBreakpointRulerVisible: false,
};

export const useEmulatorStore = create<EmulatorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Device Actions
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

      // Tab Actions
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Direction Actions
      setRemoteDirections: (directions) =>
        set({
          remoteDirections: directions,
          triageStats: {
            ...get().triageStats,
            total: directions.length,
          },
        }),
      setLoadingDirections: (loading) => set({ isLoadingDirections: loading }),
      setDirectionsError: (error) => set({ directionsError: error }),
      updateTriageStats: (stats) =>
        set({ triageStats: { ...get().triageStats, ...stats } }),
      removeDirection: (directionId) =>
        set({
          remoteDirections: get().remoteDirections.filter((d) => d.id !== directionId),
          triageStats: {
            ...get().triageStats,
            reviewed: get().triageStats.reviewed + 1,
          },
        }),

      // Requirement Actions
      setRemoteRequirements: (requirements) =>
        set({ remoteRequirements: requirements, isLoadingRequirements: false }),
      setLoadingRequirements: (loading) => set({ isLoadingRequirements: loading }),
      setRequirementsError: (error) => set({ requirementsError: error }),
      toggleRequirementSelection: (requirementId) => {
        const current = get().selectedRequirementIds;
        const isSelected = current.includes(requirementId);
        set({
          selectedRequirementIds: isSelected
            ? current.filter((id) => id !== requirementId)
            : [...current, requirementId],
        });
      },
      selectAllRequirements: () =>
        set({
          selectedRequirementIds: get().remoteRequirements.map((r) => r.id),
        }),
      clearRequirementSelection: () => set({ selectedRequirementIds: [] }),

      // Batch Actions
      setRemoteBatches: (batches) =>
        set({ remoteBatches: batches, isLoadingBatches: false }),
      setLoadingBatches: (loading) => set({ isLoadingBatches: loading }),
      setBatchError: (error) => set({ batchError: error }),
      updateBatchStatus: (batchId, updates) =>
        set({
          remoteBatches: get().remoteBatches.map((b) =>
            b.batch_id === batchId ? { ...b, ...updates } : b
          ),
        }),

      // Event Actions
      setEventFeed: (events) => set({ eventFeed: events, isLoadingEvents: false }),
      addEvent: (event) =>
        set({ eventFeed: [event, ...get().eventFeed].slice(0, 50) }), // Keep last 50
      setLoadingEvents: (loading) => set({ isLoadingEvents: loading }),

      // TaskRunner Remote Mode Actions
      setRemoteTaskRunnerMode: (mode) => set({ isRemoteTaskRunnerMode: mode }),

      // Breakpoint Actions
      setViewportWidth: (width) =>
        set({ viewportWidth: Math.max(320, Math.min(2560, width)) }),
      setBreakpoints: (breakpoints) => set({ breakpoints }),
      addCustomBreakpoint: (breakpoint) =>
        set({
          customBreakpoints: [
            ...get().customBreakpoints.filter((bp) => bp.name !== breakpoint.name),
            { ...breakpoint, isCustom: true },
          ],
        }),
      removeCustomBreakpoint: (name) =>
        set({
          customBreakpoints: get().customBreakpoints.filter((bp) => bp.name !== name),
        }),
      toggleBreakpointRuler: () =>
        set({ isBreakpointRulerVisible: !get().isBreakpointRulerVisible }),
      setBreakpointRulerVisible: (visible) => set({ isBreakpointRulerVisible: visible }),
      jumpToBreakpoint: (breakpoint) =>
        set({ viewportWidth: breakpoint.minWidth ?? 320 }),

      // Reset Actions
      reset: () => set(initialState),
      resetRemoteData: () =>
        set({
          remoteDirections: [],
          remoteRequirements: [],
          remoteBatches: [],
          eventFeed: [],
          selectedRequirementIds: [],
          triageStats: { reviewed: 0, total: 0, accepted: 0, rejected: 0 },
          directionsError: null,
          requirementsError: null,
          batchError: null,
          isRemoteTaskRunnerMode: false,
        }),
    }),
    {
      name: 'emulator-store',
      partialize: (state) => ({
        localDeviceId: state.localDeviceId,
        localDeviceName: state.localDeviceName,
        selectedDeviceId: state.selectedDeviceId,
        activeTab: state.activeTab,
        // Breakpoint preferences
        viewportWidth: state.viewportWidth,
        customBreakpoints: state.customBreakpoints,
        isBreakpointRulerVisible: state.isBreakpointRulerVisible,
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
