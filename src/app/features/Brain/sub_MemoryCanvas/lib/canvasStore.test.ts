import { describe, it, expect, vi } from 'vitest';
import { CanvasStore } from './canvasStore';
import type { BrainEvent } from './types';

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
});
