'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePersonaStore } from '@/stores/personaStore';

/**
 * Hook to connect to an execution's SSE stream and pump output into the store.
 * Automatically connects when activeExecutionId changes.
 */
export function usePersonaExecution() {
  const activeExecutionId = usePersonaStore(s => s.activeExecutionId);
  const appendOutput = usePersonaStore(s => s.appendExecutionOutput);
  const clearOutput = usePersonaStore(s => s.clearExecutionOutput);
  const setExecuting = usePersonaStore(s => s.isExecuting);
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!activeExecutionId) {
      disconnect();
      return;
    }

    // Connect to SSE stream
    const url = `/api/personas/executions/${activeExecutionId}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.line) {
          appendOutput(data.line);
        }
        if (data.done) {
          disconnect();
          // Keep output visible but mark execution as done
          usePersonaStore.setState({ isExecuting: false });
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      disconnect();
      usePersonaStore.setState({ isExecuting: false });
    };

    return () => disconnect();
  }, [activeExecutionId, appendOutput, disconnect]);

  return { disconnect, clearOutput };
}
