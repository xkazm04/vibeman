/**
 * Emulator Store — Facade
 *
 * Re-exports all types, hooks, and selectors from the decomposed substores:
 * - deviceMeshStore: device identity, registration, connection, device list
 * - remoteWorkStore: directions, requirements, batches, events, TaskRunner mode
 * - breakpointStore: viewport, breakpoints, ruler
 *
 * Components should import directly from the substore they need for minimal
 * re-render scope. This facade exists for backward compatibility.
 */

// ── Types ──────────────────────────────────────────────────────────────
export type {
  RemoteDirection,
  RemoteRequirement,
  RemoteBatchInfo,
  RemoteEvent,
} from './remoteWorkStore';

// ── Store hooks ────────────────────────────────────────────────────────
export { useDeviceMeshStore } from './deviceMeshStore';
export { useRemoteWorkStore } from './remoteWorkStore';
export { useBreakpointStore } from './breakpointStore';

// ── Selectors ──────────────────────────────────────────────────────────
export {
  useOtherDevices,
  useSelectedDevice,
  useHasBusyDevices,
  useDeviceStats,
} from './deviceMeshStore';

// ── Backward-compatible combined hook ──────────────────────────────────
// For components that need cross-domain reads without individual imports.

import { useDeviceMeshStore } from './deviceMeshStore';
import { useRemoteWorkStore } from './remoteWorkStore';
import { useBreakpointStore } from './breakpointStore';
import type { DeviceMeshStore } from './deviceMeshStore';
import type { RemoteWorkStore } from './remoteWorkStore';
import type { BreakpointStore } from './breakpointStore';

/** Combined type for the facade hook */
export type EmulatorFacade =
  DeviceMeshStore &
  RemoteWorkStore &
  BreakpointStore & {
    resetRemoteData: () => void;
  };

/**
 * @deprecated Import from individual substores instead:
 *   useDeviceMeshStore, useRemoteWorkStore, useBreakpointStore
 *
 * Backward-compatible facade that merges all three substores.
 * Supports both `useEmulatorStore()` and `useEmulatorStore(selector)`.
 */
export function useEmulatorStore(): EmulatorFacade;
export function useEmulatorStore<T>(selector: (state: EmulatorFacade) => T): T;
export function useEmulatorStore<T>(selector?: (state: EmulatorFacade) => T): EmulatorFacade | T {
  const mesh = useDeviceMeshStore();
  const work = useRemoteWorkStore();
  const bp = useBreakpointStore();
  const combined: EmulatorFacade = { ...mesh, ...work, ...bp, resetRemoteData: work.reset };
  return selector ? selector(combined) : combined;
}
