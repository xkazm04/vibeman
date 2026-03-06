import { describe, it, expect, vi, beforeAll } from 'vitest';
import { CanvasStore } from './canvasStore';
import type { BrainEvent } from './types';

// Mock Web Worker for Vitest (not available in Node)
beforeAll(() => {
  if (typeof Worker === 'undefined') {
    (globalThis as any).Worker = class MockWorker {
      onmessage: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      postMessage() {
        // Simulate async complete
        setTimeout(() => {
          this.onmessage?.({
            data: { type: 'complete', groups: [], tick: 120, totalTicks: 120 },
          });
        }, 0);
      }
      terminate() {}
    };
  }
});

describe('CanvasStore', () => {
  const createEvent = (id: string, weight: number): BrainEvent => ({
    id,
    type: 'git_activity',
    context_id: 'ctx1',
    context_name: 'Context 1',
    timestamp: Date.now(),
    weight,
    summary: 'test',
    x: 0,
    y: 0,
  });

  it('should return false when setting identical events', () => {
    const store = new CanvasStore();
    const events = [createEvent('1', 1.0), createEvent('2', 1.0)];

    store.setEvents(events, null);
    const changed = store.setEvents([...events], null);

    expect(changed).toBe(false);
  });

  it('should return true when event weight changes (decay)', () => {
    const store = new CanvasStore();
    const event1 = createEvent('1', 1.0);
    const events = [event1];

    store.setEvents(events, null);

    // Simulate decay
    const decayedEvents = [{ ...event1, weight: 0.9 }];
    const changed = store.setEvents(decayedEvents, null);

    expect(changed).toBe(true);
  });

  it('should return false when event order changes (order-independent)', () => {
    const store = new CanvasStore();
    const e1 = createEvent('1', 1.0);
    const e2 = createEvent('2', 1.0);

    store.setEvents([e1, e2], null);
    const changed = store.setEvents([e2, e1], null);

    // Since we use a sum of hashes, it should be order-independent
    expect(changed).toBe(false);
  });

  it('should return true when an event is added', () => {
    const store = new CanvasStore();
    const e1 = createEvent('1', 1.0);

    store.setEvents([e1], null);
    const changed = store.setEvents([e1, createEvent('2', 1.0)], null);

    expect(changed).toBe(true);
  });

  it('should return true when an event is removed', () => {
    const store = new CanvasStore();
    const e1 = createEvent('1', 1.0);
    const e2 = createEvent('2', 1.0);

    store.setEvents([e1, e2], null);
    const changed = store.setEvents([e1], null);

    expect(changed).toBe(true);
  });

  it('should detect small weight changes', () => {
    const store = new CanvasStore();
    const e1 = createEvent('1', 1.000);

    store.setEvents([e1], null);
    // Weight change of 0.001 should be detected because we multiply by 1000 and round
    const changed = store.setEvents([{ ...e1, weight: 1.001 }], null);

    expect(changed).toBe(true);
  });

  describe('useSyncExternalStore integration', () => {
    it('should notify subscribers when events change', () => {
      const store = new CanvasStore();
      const listener = vi.fn();

      store.subscribe(listener);
      store.setEvents([createEvent('1', 1.0)], null);

      expect(listener).toHaveBeenCalled();
    });

    it('should not notify subscribers when events are unchanged', () => {
      const store = new CanvasStore();
      const events = [createEvent('1', 1.0)];
      store.setEvents(events, null);

      const listener = vi.fn();
      store.subscribe(listener);
      store.setEvents([...events], null);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should return new snapshot identity on change', () => {
      const store = new CanvasStore();
      const snap1 = store.getSnapshot();

      store.setEvents([createEvent('1', 1.0)], null);
      const snap2 = store.getSnapshot();

      expect(snap1).not.toBe(snap2);
      expect(snap2.version).toBeGreaterThan(snap1.version);
    });

    it('should return same snapshot when no change', () => {
      const store = new CanvasStore();
      const events = [createEvent('1', 1.0)];
      store.setEvents(events, null);

      const snap1 = store.getSnapshot();
      store.setEvents([...events], null); // identical
      const snap2 = store.getSnapshot();

      expect(snap1).toBe(snap2);
    });

    it('should unsubscribe correctly', () => {
      const store = new CanvasStore();
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);
      unsubscribe();

      store.setEvents([createEvent('1', 1.0)], null);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should update snapshot on removeEvent', () => {
      const store = new CanvasStore();
      store.setEvents([createEvent('1', 1.0), createEvent('2', 1.0)], null);

      const snap1 = store.getSnapshot();
      store.removeEvent('1', null);
      const snap2 = store.getSnapshot();

      expect(snap2.events).toHaveLength(1);
      expect(snap2.version).toBeGreaterThan(snap1.version);
    });

    it('should update snapshot on restoreEvent', () => {
      const store = new CanvasStore();
      const evt = createEvent('1', 1.0);
      store.setEvents([evt], null);
      store.removeEvent('1', null);

      const snap1 = store.getSnapshot();
      store.restoreEvent(evt, null);
      const snap2 = store.getSnapshot();

      expect(snap2.events).toHaveLength(1);
      expect(snap2.version).toBeGreaterThan(snap1.version);
    });

    it('should clean up listeners on destroy', () => {
      const store = new CanvasStore();
      const listener = vi.fn();

      store.subscribe(listener);
      store.destroy();

      // After destroy, setEvents still works internally but no listeners fire
      store.setEvents([createEvent('1', 1.0)], null);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
