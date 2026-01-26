/**
 * useContextFocusTracker
 * Tracks how long a user views a specific context and auto-records
 * a context_focus signal after a minimum duration threshold (5s).
 *
 * Usage:
 *   useContextFocusTracker({ contextId, contextName, projectId });
 *
 * The hook starts a timer when mounted and records a signal when:
 * - The component unmounts (view ends) AND the user spent >= 5s viewing
 * - Or when contextId changes (switches to different context)
 */

import { useEffect, useRef } from 'react';

const MIN_FOCUS_DURATION_MS = 5000; // 5 seconds minimum to count as a "focus"

interface ContextFocusTrackerProps {
  contextId: string | null | undefined;
  contextName: string | null | undefined;
  projectId: string | null | undefined;
  /** Additional actions to record (e.g., 'view_details', 'edit_files') */
  actions?: string[];
}

export function useContextFocusTracker({
  contextId,
  contextName,
  projectId,
  actions = ['view'],
}: ContextFocusTrackerProps): void {
  const startTimeRef = useRef<number | null>(null);
  const prevContextIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!contextId || !projectId) {
      startTimeRef.current = null;
      return;
    }

    // If context changed, record the previous one
    if (prevContextIdRef.current && prevContextIdRef.current !== contextId) {
      recordFocusSignal(
        prevContextIdRef.current,
        contextName || 'unknown',
        projectId,
        startTimeRef.current,
        actions
      );
    }

    // Start tracking new context
    startTimeRef.current = Date.now();
    prevContextIdRef.current = contextId;

    // Cleanup: record signal when unmounting or context changes
    return () => {
      if (startTimeRef.current && contextId && projectId) {
        recordFocusSignal(
          contextId,
          contextName || 'unknown',
          projectId,
          startTimeRef.current,
          actions
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextId, projectId]);
}

/**
 * Sends a context_focus signal to the API if duration exceeds threshold
 */
function recordFocusSignal(
  contextId: string,
  contextName: string,
  projectId: string,
  startTime: number | null,
  actions: string[]
): void {
  if (!startTime) return;

  const duration = Date.now() - startTime;

  // Only record if user spent enough time viewing
  if (duration < MIN_FOCUS_DURATION_MS) return;

  // Fire-and-forget: don't await, don't block
  fetch('/api/brain/signals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      signalType: 'context_focus',
      data: {
        contextId,
        contextName,
        duration,
        actions,
      },
    }),
  }).catch(() => {
    // Signal recording failures are silent
  });
}
