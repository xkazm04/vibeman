/**
 * useReflectionEvents – Bridge SSE reflection lifecycle events to brainStore
 *
 * Subscribes to reflection:started, reflection:completed, reflection:failed
 * events via EventBus SSE stream and instantly updates the brainStore.
 * This replaces the polling-based completion detection with near-instant
 * push notification from the server.
 *
 * Polling still runs as a fallback but with a longer interval since
 * events handle the fast path.
 */

'use client';

import { useCallback } from 'react';
import { useBrainStore } from '@/stores/brainStore';
import { useEventBus } from '@/hooks/useEventBus';
import { reflectionCompletionEmitter } from '@/stores/reflectionCompletionEmitter';
import type {
  ReflectionStartedEvent,
  ReflectionCompletedEvent,
  ReflectionFailedEvent,
} from '@/lib/events/types';

interface UseReflectionEventsOptions {
  projectId?: string | null;
  enabled?: boolean;
}

/**
 * Subscribe to reflection lifecycle events via SSE and update brainStore.
 * Call this from BrainLayout or ReflectionStatus to get instant updates.
 */
export function useReflectionEvents({ projectId, enabled = true }: UseReflectionEventsOptions) {
  const fetchReflectionStatus = useBrainStore((s) => s.fetchReflectionStatus);
  const fetchGlobalReflectionStatus = useBrainStore((s) => s.fetchGlobalReflectionStatus);

  const handleStarted = useCallback((event: ReflectionStartedEvent) => {
    // Refetch full status to get the running reflection details
    if (event.scope === 'global') {
      fetchGlobalReflectionStatus();
    } else if (event.projectId && event.projectId !== '__global__') {
      fetchReflectionStatus(event.projectId);
    }
  }, [fetchReflectionStatus, fetchGlobalReflectionStatus]);

  const handleCompleted = useCallback((event: ReflectionCompletedEvent) => {
    // Emit to the legacy reflectionCompletionEmitter for backward compatibility
    // (components subscribing directly to it will still get notified)
    reflectionCompletionEmitter.emit(
      event.reflectionId,
      event.projectId || '',
      event.scope,
    );

    // Refetch full status to update store with the completed reflection data
    if (event.scope === 'global') {
      fetchGlobalReflectionStatus();
    } else if (event.projectId) {
      fetchReflectionStatus(event.projectId);
    }
  }, [fetchReflectionStatus, fetchGlobalReflectionStatus]);

  const handleFailed = useCallback((event: ReflectionFailedEvent) => {
    // Refetch full status to update store with the failed reflection data
    if (event.scope === 'global') {
      fetchGlobalReflectionStatus();
    } else if (event.projectId) {
      fetchReflectionStatus(event.projectId);
    }
  }, [fetchReflectionStatus, fetchGlobalReflectionStatus]);

  useEventBus({
    projectId,
    enabled,
    handlers: {
      'reflection:started': handleStarted,
      'reflection:completed': handleCompleted,
      'reflection:failed': handleFailed,
    },
  });
}
