/**
 * Zen Navigation Store
 *
 * Formalizes the scattered mode+tab routing into a single state machine.
 * Components subscribe to their path segment instead of reading from multiple stores.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EmulatorTab } from '../sub_ZenControl/components/EmulatorTabs';

// ============================================================================
// VIEW PATH — every possible view in the Zen module
// ============================================================================

export type ZenViewPath =
  | 'offline'
  | 'online'
  | `emulator/${EmulatorTab}`
  | 'mission-control';

/** Top-level mode derived from the view path */
export type ZenMode = 'offline' | 'online' | 'emulator' | 'mission-control';

// ============================================================================
// HELPERS
// ============================================================================

export function getModeFromPath(path: ZenViewPath): ZenMode {
  if (path.startsWith('emulator/')) return 'emulator';
  return path as ZenMode;
}

export function getEmulatorTab(path: ZenViewPath): EmulatorTab | null {
  if (!path.startsWith('emulator/')) return null;
  return path.slice('emulator/'.length) as EmulatorTab;
}

/**
 * Default emulator sub-tab when entering emulator mode
 */
const DEFAULT_EMULATOR_TAB: EmulatorTab = 'devices';

// ============================================================================
// TRANSITION GUARDS
// ============================================================================

export interface NavigationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check whether a navigation is allowed given current state.
 * Returns { allowed, reason } so UI can show feedback.
 */
export function canNavigate(
  target: ZenViewPath,
  context: { isConnected: boolean; hasSelectedDevice: boolean },
): NavigationResult {
  const mode = getModeFromPath(target);

  // Top-level modes are always reachable
  if (mode !== 'emulator') return { allowed: true };

  const tab = getEmulatorTab(target);
  if (!tab) return { allowed: true };

  // responsive & devices are always available
  if (tab === 'responsive' || tab === 'devices') return { allowed: true };

  // topology & fleet require connection
  if ((tab === 'topology' || tab === 'fleet') && !context.isConnected) {
    return { allowed: false, reason: 'Connect to mesh network first' };
  }

  // batch & monitor require connection + device selection
  if (!context.isConnected) {
    return { allowed: false, reason: 'Connect to mesh network first' };
  }
  if (!context.hasSelectedDevice) {
    return { allowed: false, reason: 'Select a target device first' };
  }

  return { allowed: true };
}

// ============================================================================
// STORE
// ============================================================================

interface ZenNavigationState {
  /** Current view path */
  viewPath: ZenViewPath;

  /**
   * Navigate to a new view path.
   * If target is a top-level mode, uses sensible defaults for sub-paths.
   */
  navigate: (target: ZenViewPath | ZenMode) => void;

  /**
   * Navigate to an emulator sub-tab specifically.
   */
  navigateEmulatorTab: (tab: EmulatorTab) => void;
}

/** Expand a bare mode into a full view path */
function expandPath(target: ZenViewPath | ZenMode): ZenViewPath {
  if (target === 'emulator') return `emulator/${DEFAULT_EMULATOR_TAB}`;
  return target as ZenViewPath;
}

export const useZenNavigation = create<ZenNavigationState>()(
  persist(
    (set) => ({
      viewPath: 'offline',

      navigate: (target) => {
        set({ viewPath: expandPath(target) });
      },

      navigateEmulatorTab: (tab) => {
        set({ viewPath: `emulator/${tab}` });
      },
    }),
    {
      name: 'zen-navigation',
      partialize: (state) => ({ viewPath: state.viewPath }),
    }
  )
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/** Current top-level mode */
export function useZenMode(): ZenMode {
  return useZenNavigation((s) => getModeFromPath(s.viewPath));
}

/** Current emulator tab (null when not in emulator mode) */
export function useEmulatorTabFromNav(): EmulatorTab | null {
  return useZenNavigation((s) => getEmulatorTab(s.viewPath));
}
