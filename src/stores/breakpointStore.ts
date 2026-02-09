/**
 * Breakpoint Store
 * Manages responsive breakpoint testing state: viewport width, breakpoints, ruler.
 * Split from emulatorStore for reduced re-render blast radius.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Breakpoint } from '@/lib/emulator/mediaQueryDetector';
import { DEFAULT_BREAKPOINTS } from '@/lib/emulator/mediaQueryDetector';

interface BreakpointState {
  viewportWidth: number;
  breakpoints: Breakpoint[];
  customBreakpoints: Breakpoint[];
  isBreakpointRulerVisible: boolean;
}

interface BreakpointActions {
  setViewportWidth: (width: number) => void;
  setBreakpoints: (breakpoints: Breakpoint[]) => void;
  addCustomBreakpoint: (breakpoint: Breakpoint) => void;
  removeCustomBreakpoint: (name: string) => void;
  toggleBreakpointRuler: () => void;
  setBreakpointRulerVisible: (visible: boolean) => void;
  jumpToBreakpoint: (breakpoint: Breakpoint) => void;
  reset: () => void;
}

export type BreakpointStore = BreakpointState & BreakpointActions;

const initialState: BreakpointState = {
  viewportWidth: 1280,
  breakpoints: DEFAULT_BREAKPOINTS,
  customBreakpoints: [],
  isBreakpointRulerVisible: false,
};

export const useBreakpointStore = create<BreakpointStore>()(
  persist(
    (set, get) => ({
      ...initialState,

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
        set({ customBreakpoints: get().customBreakpoints.filter((bp) => bp.name !== name) }),
      toggleBreakpointRuler: () =>
        set({ isBreakpointRulerVisible: !get().isBreakpointRulerVisible }),
      setBreakpointRulerVisible: (visible) => set({ isBreakpointRulerVisible: visible }),
      jumpToBreakpoint: (breakpoint) =>
        set({ viewportWidth: breakpoint.minWidth ?? 320 }),
      reset: () => set(initialState),
    }),
    {
      name: 'breakpoint-store',
      partialize: (state) => ({
        viewportWidth: state.viewportWidth,
        customBreakpoints: state.customBreakpoints,
        isBreakpointRulerVisible: state.isBreakpointRulerVisible,
      }),
    }
  )
);
