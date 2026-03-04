import * as d3 from 'd3';
import type { BrainEvent, Group } from './types';

/**
 * Canvas interaction state machine.
 * Replaces scattered ref mutations with a single, logged, testable reducer.
 */

// ── State ──

export interface CanvasState {
  transform: d3.ZoomTransform;
  cursor: { x: number; y: number };
  focusedGroupId: string | null;
  selectedGroupId: string | null;
  selectedEvent: BrainEvent | null;
  zoomLevel: number;
  zoomCenter: { x: number; y: number };
  momentum: number;
}

export function createInitialCanvasState(): CanvasState {
  return {
    transform: d3.zoomIdentity,
    cursor: { x: 0, y: 0 },
    focusedGroupId: null,
    selectedGroupId: null,
    selectedEvent: null,
    zoomLevel: 1,
    zoomCenter: { x: 0, y: 0 },
    momentum: 0,
  };
}

// ── Actions ──

export type CanvasAction =
  | { type: 'ZoomChanged'; transform: d3.ZoomTransform; zoomLevel: number }
  | { type: 'CursorMoved'; x: number; y: number }
  | { type: 'GroupSelected'; groupId: string | null }
  | { type: 'FocusEntered'; groupId: string }
  | { type: 'FocusExited' }
  | { type: 'EventSelected'; event: BrainEvent | null }
  | { type: 'ZoomCenterSet'; x: number; y: number }
  | { type: 'MomentumUpdated'; momentum: number }
  | { type: 'MomentumReset' }
  | { type: 'StateReset' };

// ── Reducer ──

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  if (process.env.NODE_ENV === 'development') {
    console.log('[CanvasState]', action.type, action);
  }

  switch (action.type) {
    case 'ZoomChanged':
      return {
        ...state,
        transform: action.transform,
        zoomLevel: action.zoomLevel,
      };

    case 'CursorMoved':
      return {
        ...state,
        cursor: { x: action.x, y: action.y },
      };

    case 'GroupSelected':
      return {
        ...state,
        selectedGroupId: action.groupId,
      };

    case 'FocusEntered':
      return {
        ...state,
        focusedGroupId: action.groupId,
        selectedGroupId: null, // Clear selection when entering focus
        momentum: 0, // Stop momentum when entering focus
      };

    case 'FocusExited':
      return {
        ...state,
        focusedGroupId: null,
        selectedEvent: null,
        momentum: 0, // Stop momentum when exiting focus
      };

    case 'EventSelected':
      return {
        ...state,
        selectedEvent: action.event,
      };

    case 'ZoomCenterSet':
      return {
        ...state,
        zoomCenter: { x: action.x, y: action.y },
      };

    case 'MomentumUpdated':
      return {
        ...state,
        momentum: action.momentum,
      };

    case 'MomentumReset':
      return {
        ...state,
        momentum: 0,
      };

    case 'StateReset':
      return createInitialCanvasState();

    default:
      return state;
  }
}

// ── Selectors ──

export function isInFocusMode(state: CanvasState): boolean {
  return state.focusedGroupId !== null;
}

export function hasSelection(state: CanvasState): boolean {
  return state.selectedGroupId !== null || state.selectedEvent !== null;
}

export function getFocusedGroup(state: CanvasState, groups: Group[]): Group | undefined {
  if (!state.focusedGroupId) return undefined;
  return groups.find(g => g.id === state.focusedGroupId);
}

export function getSelectedGroup(state: CanvasState, groups: Group[]): Group | undefined {
  if (!state.selectedGroupId) return undefined;
  return groups.find(g => g.id === state.selectedGroupId);
}
