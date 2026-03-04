/**
 * Reflection Completion Emitter Tests
 *
 * Verifies the event subscription and emission system for reflection completion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reflectionCompletionEmitter, subscribeToReflectionCompletion } from '@/stores/reflectionCompletionEmitter';

describe('reflectionCompletionEmitter', () => {
  beforeEach(() => {
    // Clear all listeners before each test
    while (reflectionCompletionEmitter.getListenerCount() > 0) {
      const listeners = (reflectionCompletionEmitter as any).listeners;
      const firstListener = listeners.values().next().value;
      if (firstListener) {
        (reflectionCompletionEmitter as any).listeners.delete(firstListener);
      }
    }
  });

  it('should start with zero listeners', () => {
    expect(reflectionCompletionEmitter.getListenerCount()).toBe(0);
  });

  it('should add a listener via subscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToReflectionCompletion(listener);

    expect(reflectionCompletionEmitter.getListenerCount()).toBe(1);
    unsubscribe();
  });

  it('should remove a listener when unsubscribe is called', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToReflectionCompletion(listener);

    expect(reflectionCompletionEmitter.getListenerCount()).toBe(1);
    unsubscribe();
    expect(reflectionCompletionEmitter.getListenerCount()).toBe(0);
  });

  it('should emit events to all subscribers', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = subscribeToReflectionCompletion(listener1);
    const unsub2 = subscribeToReflectionCompletion(listener2);

    reflectionCompletionEmitter.emit('ref_123', 'proj_456', 'project');

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith('ref_123', 'proj_456', 'project');
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith('ref_123', 'proj_456', 'project');

    unsub1();
    unsub2();
  });

  it('should not call unsubscribed listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = subscribeToReflectionCompletion(listener1);
    const unsub2 = subscribeToReflectionCompletion(listener2);

    unsub1(); // Unsubscribe listener1

    reflectionCompletionEmitter.emit('ref_789', 'proj_abc', 'global');

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith('ref_789', 'proj_abc', 'global');

    unsub2();
  });

  it('should handle listener errors gracefully', () => {
    const errorListener = vi.fn(() => {
      throw new Error('Listener error');
    });
    const goodListener = vi.fn();

    const unsub1 = subscribeToReflectionCompletion(errorListener);
    const unsub2 = subscribeToReflectionCompletion(goodListener);

    // Should not throw even if a listener errors
    expect(() => {
      reflectionCompletionEmitter.emit('ref_err', 'proj_err', 'project');
    }).not.toThrow();

    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(goodListener).toHaveBeenCalledTimes(1);

    unsub1();
    unsub2();
  });

  it('should support multiple subscriptions and unsubscriptions', () => {
    const listeners = Array.from({ length: 5 }, () => vi.fn());
    const unsubscribes = listeners.map(listener => subscribeToReflectionCompletion(listener));

    expect(reflectionCompletionEmitter.getListenerCount()).toBe(5);

    // Unsubscribe first and last
    unsubscribes[0]();
    unsubscribes[4]();

    expect(reflectionCompletionEmitter.getListenerCount()).toBe(3);

    reflectionCompletionEmitter.emit('ref_multi', 'proj_multi', 'project');

    expect(listeners[0]).not.toHaveBeenCalled();
    expect(listeners[1]).toHaveBeenCalledTimes(1);
    expect(listeners[2]).toHaveBeenCalledTimes(1);
    expect(listeners[3]).toHaveBeenCalledTimes(1);
    expect(listeners[4]).not.toHaveBeenCalled();

    // Cleanup
    unsubscribes[1]();
    unsubscribes[2]();
    unsubscribes[3]();
  });
});
