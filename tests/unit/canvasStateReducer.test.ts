import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import {
  canvasReducer,
  createInitialCanvasState,
  isInFocusMode,
  hasSelection,
  type CanvasAction,
} from '@/app/features/Brain/sub_MemoryCanvas/lib/canvasStateReducer';

describe('canvasStateReducer', () => {
  it('creates initial state correctly', () => {
    const state = createInitialCanvasState();
    expect(state.transform).toEqual(d3.zoomIdentity);
    expect(state.cursor).toEqual({ x: 0, y: 0 });
    expect(state.focusedGroupId).toBeNull();
    expect(state.selectedGroupId).toBeNull();
    expect(state.selectedEvent).toBeNull();
    expect(state.zoomLevel).toBe(1);
    expect(state.momentum).toBe(0);
  });

  it('handles ZoomChanged action', () => {
    const state = createInitialCanvasState();
    const newTransform = d3.zoomIdentity.translate(10, 20).scale(2);
    const action: CanvasAction = {
      type: 'ZoomChanged',
      transform: newTransform,
      zoomLevel: 2,
    };
    const newState = canvasReducer(state, action);
    expect(newState.transform).toEqual(newTransform);
    expect(newState.zoomLevel).toBe(2);
  });

  it('handles CursorMoved action', () => {
    const state = createInitialCanvasState();
    const action: CanvasAction = { type: 'CursorMoved', x: 100, y: 200 };
    const newState = canvasReducer(state, action);
    expect(newState.cursor).toEqual({ x: 100, y: 200 });
  });

  it('handles GroupSelected action', () => {
    const state = createInitialCanvasState();
    const action: CanvasAction = { type: 'GroupSelected', groupId: 'group-123' };
    const newState = canvasReducer(state, action);
    expect(newState.selectedGroupId).toBe('group-123');
  });

  it('handles FocusEntered action and clears selection', () => {
    const state = {
      ...createInitialCanvasState(),
      selectedGroupId: 'group-1',
      momentum: 5,
    };
    const action: CanvasAction = { type: 'FocusEntered', groupId: 'group-2' };
    const newState = canvasReducer(state, action);
    expect(newState.focusedGroupId).toBe('group-2');
    expect(newState.selectedGroupId).toBeNull(); // Selection cleared
    expect(newState.momentum).toBe(0); // Momentum stopped
  });

  it('handles FocusExited action', () => {
    const state = {
      ...createInitialCanvasState(),
      focusedGroupId: 'group-1',
      selectedEvent: { id: 'evt-1' } as any,
      momentum: 5,
    };
    const action: CanvasAction = { type: 'FocusExited' };
    const newState = canvasReducer(state, action);
    expect(newState.focusedGroupId).toBeNull();
    expect(newState.selectedEvent).toBeNull();
    expect(newState.momentum).toBe(0);
  });

  it('handles EventSelected action', () => {
    const state = createInitialCanvasState();
    const event = { id: 'evt-1', type: 'git_activity' } as any;
    const action: CanvasAction = { type: 'EventSelected', event };
    const newState = canvasReducer(state, action);
    expect(newState.selectedEvent).toBe(event);
  });

  it('handles ZoomCenterSet action', () => {
    const state = createInitialCanvasState();
    const action: CanvasAction = { type: 'ZoomCenterSet', x: 50, y: 75 };
    const newState = canvasReducer(state, action);
    expect(newState.zoomCenter).toEqual({ x: 50, y: 75 });
  });

  it('handles MomentumUpdated action', () => {
    const state = createInitialCanvasState();
    const action: CanvasAction = { type: 'MomentumUpdated', momentum: 3.5 };
    const newState = canvasReducer(state, action);
    expect(newState.momentum).toBe(3.5);
  });

  it('handles MomentumReset action', () => {
    const state = { ...createInitialCanvasState(), momentum: 5 };
    const action: CanvasAction = { type: 'MomentumReset' };
    const newState = canvasReducer(state, action);
    expect(newState.momentum).toBe(0);
  });

  it('handles StateReset action', () => {
    const state = {
      ...createInitialCanvasState(),
      focusedGroupId: 'group-1',
      selectedGroupId: 'group-2',
      zoomLevel: 3,
    };
    const action: CanvasAction = { type: 'StateReset' };
    const newState = canvasReducer(state, action);
    expect(newState).toEqual(createInitialCanvasState());
  });

  describe('selectors', () => {
    it('isInFocusMode returns true when focused', () => {
      const state = { ...createInitialCanvasState(), focusedGroupId: 'group-1' };
      expect(isInFocusMode(state)).toBe(true);
    });

    it('isInFocusMode returns false when not focused', () => {
      const state = createInitialCanvasState();
      expect(isInFocusMode(state)).toBe(false);
    });

    it('hasSelection returns true for group selection', () => {
      const state = { ...createInitialCanvasState(), selectedGroupId: 'group-1' };
      expect(hasSelection(state)).toBe(true);
    });

    it('hasSelection returns true for event selection', () => {
      const state = { ...createInitialCanvasState(), selectedEvent: { id: 'evt-1' } as any };
      expect(hasSelection(state)).toBe(true);
    });

    it('hasSelection returns false when no selection', () => {
      const state = createInitialCanvasState();
      expect(hasSelection(state)).toBe(false);
    });
  });

  it('maintains immutability', () => {
    const state = createInitialCanvasState();
    const action: CanvasAction = { type: 'CursorMoved', x: 100, y: 200 };
    const newState = canvasReducer(state, action);
    expect(newState).not.toBe(state);
    expect(state.cursor).toEqual({ x: 0, y: 0 }); // Original unchanged
  });
});
