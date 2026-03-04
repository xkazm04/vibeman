import { describe, it, expect } from 'vitest';
import { canvasReducer, createInitialCanvasState } from '@/app/features/Brain/sub_MemoryCanvas/lib/canvasStateReducer';
import * as d3 from 'd3';

describe('Canvas State Integration', () => {
  it('handles state transitions correctly', () => {
    let state = createInitialCanvasState();

    // Enter focus mode
    state = canvasReducer(state, { type: 'FocusEntered', groupId: 'group-1' });
    expect(state.focusedGroupId).toBe('group-1');

    // Exit focus mode
    state = canvasReducer(state, { type: 'FocusExited' });
    expect(state.focusedGroupId).toBeNull();
  });

  it('handles zoom state transitions', () => {
    let state = createInitialCanvasState();
    const newTransform = d3.zoomIdentity.translate(50, 100).scale(1.5);

    state = canvasReducer(state, {
      type: 'ZoomChanged',
      transform: newTransform,
      zoomLevel: 1.5,
    });

    expect(state.transform.k).toBe(1.5);
    expect(state.transform.x).toBe(50);
    expect(state.transform.y).toBe(100);
    expect(state.zoomLevel).toBe(1.5);
  });

  it('clears selection when entering focus mode', () => {
    let state = createInitialCanvasState();

    // Select a group
    state = canvasReducer(state, { type: 'GroupSelected', groupId: 'group-1' });
    expect(state.selectedGroupId).toBe('group-1');

    // Enter focus on different group
    state = canvasReducer(state, { type: 'FocusEntered', groupId: 'group-2' });
    expect(state.focusedGroupId).toBe('group-2');
    expect(state.selectedGroupId).toBeNull();
  });

  it('maintains cursor position through state changes', () => {
    let state = createInitialCanvasState();

    state = canvasReducer(state, { type: 'CursorMoved', x: 123, y: 456 });
    expect(state.cursor).toEqual({ x: 123, y: 456 });

    // Cursor position should persist through other state changes
    state = canvasReducer(state, { type: 'GroupSelected', groupId: 'group-1' });
    expect(state.cursor).toEqual({ x: 123, y: 456 });
  });

  it('handles complex interaction flows', () => {
    let state = createInitialCanvasState();

    // User moves cursor
    state = canvasReducer(state, { type: 'CursorMoved', x: 100, y: 200 });

    // User zooms in
    const transform = d3.zoomIdentity.scale(2);
    state = canvasReducer(state, { type: 'ZoomChanged', transform, zoomLevel: 2 });

    // User selects a group
    state = canvasReducer(state, { type: 'GroupSelected', groupId: 'group-1' });
    expect(state.selectedGroupId).toBe('group-1');

    // User enters focus mode (selection should clear)
    state = canvasReducer(state, { type: 'FocusEntered', groupId: 'group-1' });
    expect(state.focusedGroupId).toBe('group-1');
    expect(state.selectedGroupId).toBeNull();
    expect(state.momentum).toBe(0);

    // User clicks an event
    const event = { id: 'evt-1' } as any;
    state = canvasReducer(state, { type: 'EventSelected', event });
    expect(state.selectedEvent).toBe(event);

    // User exits focus mode (event selection should clear)
    state = canvasReducer(state, { type: 'FocusExited' });
    expect(state.focusedGroupId).toBeNull();
    expect(state.selectedEvent).toBeNull();
  });
});
