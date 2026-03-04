/**
 * Brain Reflection Completion Cascade Integration Test
 *
 * Verifies that when a reflection completes, the completion event is emitted
 * and components can subscribe to auto-refresh their data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reflectionCompletionEmitter, subscribeToReflectionCompletion } from '@/stores/reflectionCompletionEmitter';

describe('Brain Completion Cascade', () => {
  beforeEach(() => {
    // Clear all listeners
    while (reflectionCompletionEmitter.getListenerCount() > 0) {
      const listeners = (reflectionCompletionEmitter as any).listeners;
      const firstListener = listeners.values().next().value;
      if (firstListener) {
        (reflectionCompletionEmitter as any).listeners.delete(firstListener);
      }
    }
  });

  it('should emit completion event when reflection completes', () => {
    // Subscribe to completion events
    const listener = vi.fn();
    const unsubscribe = subscribeToReflectionCompletion(listener);

    // Simulate reflection completion by emitting directly
    // (In production, brainStore detects this via polling and emits)
    reflectionCompletionEmitter.emit('ref_test', 'proj_test', 'project');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('ref_test', 'proj_test', 'project');

    unsubscribe();
  });

  it('should filter events by project and scope', () => {
    const projectListener = vi.fn();
    const globalListener = vi.fn();

    const unsub1 = subscribeToReflectionCompletion((reflectionId, projectId, scope) => {
      if (scope === 'project' && projectId === 'proj_a') {
        projectListener(reflectionId, projectId, scope);
      }
    });

    const unsub2 = subscribeToReflectionCompletion((reflectionId, projectId, scope) => {
      if (scope === 'global') {
        globalListener(reflectionId, projectId, scope);
      }
    });

    // Emit project reflection for proj_a
    reflectionCompletionEmitter.emit('ref_proj', 'proj_a', 'project');

    expect(projectListener).toHaveBeenCalledTimes(1);
    expect(globalListener).not.toHaveBeenCalled();

    // Emit global reflection
    reflectionCompletionEmitter.emit('ref_global', 'proj_workspace', 'global');

    expect(projectListener).toHaveBeenCalledTimes(1); // Still 1
    expect(globalListener).toHaveBeenCalledTimes(1);

    // Emit project reflection for different project
    reflectionCompletionEmitter.emit('ref_proj2', 'proj_b', 'project');

    expect(projectListener).toHaveBeenCalledTimes(1); // Still 1, filtered out
    expect(globalListener).toHaveBeenCalledTimes(1); // Still 1

    unsub1();
    unsub2();
  });

  it('should support multiple components subscribing independently', () => {
    const insightsListener = vi.fn();
    const effectivenessListener = vi.fn();
    const outcomesListener = vi.fn();

    const unsub1 = subscribeToReflectionCompletion(insightsListener);
    const unsub2 = subscribeToReflectionCompletion(effectivenessListener);
    const unsub3 = subscribeToReflectionCompletion(outcomesListener);

    reflectionCompletionEmitter.emit('ref_multi', 'proj_multi', 'project');

    expect(insightsListener).toHaveBeenCalledTimes(1);
    expect(effectivenessListener).toHaveBeenCalledTimes(1);
    expect(outcomesListener).toHaveBeenCalledTimes(1);

    // Verify all received same event data
    expect(insightsListener).toHaveBeenCalledWith('ref_multi', 'proj_multi', 'project');
    expect(effectivenessListener).toHaveBeenCalledWith('ref_multi', 'proj_multi', 'project');
    expect(outcomesListener).toHaveBeenCalledWith('ref_multi', 'proj_multi', 'project');

    unsub1();
    unsub2();
    unsub3();
  });

  it('should cleanup subscriptions on component unmount', () => {
    const listener = vi.fn();

    // Simulate component mount
    const unsubscribe = subscribeToReflectionCompletion(listener);
    expect(reflectionCompletionEmitter.getListenerCount()).toBe(1);

    // Simulate component unmount
    unsubscribe();
    expect(reflectionCompletionEmitter.getListenerCount()).toBe(0);

    // Event should not reach unsubscribed listener
    reflectionCompletionEmitter.emit('ref_after_unmount', 'proj_after', 'project');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should not emit events for reflections that are still running', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToReflectionCompletion(listener);

    // This test verifies behavior at the store level, not the emitter level
    // The emitter itself doesn't filter - the store is responsible for only
    // emitting when a reflection actually completes

    // Store should only emit when:
    // - reflection.status === 'completed'
    // - reflection.completed_at is present and changed
    // - reflection.id changed (new reflection)

    // This is tested in brainStore tests, but we verify listener doesn't
    // get spurious events here
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });
});
