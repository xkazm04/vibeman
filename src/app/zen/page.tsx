'use client';

import React from 'react';
import { useZenStore } from './lib/zenStore';
import { ZenCommandCenter } from './components/ZenCommandCenter';

/**
 * Zen Page
 *
 * Command center for monitoring remote batch execution.
 * Features 2x2 CLI session grid, event sidebar, and status bar.
 *
 * SSE connection is established when zen mode is 'online'.
 */
export default function ZenPage() {
  const {
    mode,
    setConnected,
    setCurrentTask,
    addActivity,
    incrementCompleted,
    incrementFailed,
    decrementPending,
  } = useZenStore();

  // Connect to SSE stream when in online mode
  React.useEffect(() => {
    if (mode !== 'online') {
      setConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      // Connect to SSE stream with all projects
      eventSource = new EventSource('/api/bridge/stream?projectId=*');

      eventSource.onopen = () => {
        console.log('[Zen] SSE connected');
        setConnected(true);
      };

      eventSource.onerror = () => {
        console.log('[Zen] SSE connection error, reconnecting...');
        setConnected(false);
        // Close the errored connection
        eventSource?.close();
        eventSource = null;
        // Reconnect after 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      };

      // Listen for task events
      eventSource.addEventListener('task_started', (event) => {
        const data = JSON.parse(event.data);
        setCurrentTask({
          id: data.payload.taskId,
          title: data.payload.title,
          progress: 0,
        });
        addActivity({
          timestamp: new Date(data.timestamp),
          title: data.payload.title,
          status: 'running',
          batchId: data.payload.batchId || 'unknown',
        });
      });

      eventSource.addEventListener('task_completed', (event) => {
        const data = JSON.parse(event.data);
        setCurrentTask(null);
        incrementCompleted();
        decrementPending();
        addActivity({
          timestamp: new Date(data.timestamp),
          title: data.payload.title,
          status: 'completed',
          batchId: data.payload.batchId || 'unknown',
        });
      });

      eventSource.addEventListener('task_failed', (event) => {
        const data = JSON.parse(event.data);
        setCurrentTask(null);
        incrementFailed();
        decrementPending();
        addActivity({
          timestamp: new Date(data.timestamp),
          title: data.payload.title,
          status: 'failed',
          batchId: data.payload.batchId || 'unknown',
          error: data.payload.error,
        });
      });

      eventSource.addEventListener('batch_progress', (event) => {
        const data = JSON.parse(event.data);
        if (data.payload.currentTaskTitle) {
          setCurrentTask({
            id: data.payload.currentTaskId || 'unknown',
            title: data.payload.currentTaskTitle,
            progress: Math.round((data.payload.completed / data.payload.total) * 100),
          });
        }
      });
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
      setConnected(false);
    };
  }, [
    mode,
    setConnected,
    setCurrentTask,
    addActivity,
    incrementCompleted,
    incrementFailed,
    decrementPending,
  ]);

  return <ZenCommandCenter />;
}
