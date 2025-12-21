'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useZenStore } from './lib/zenStore';
import ZenHeader from './components/ZenHeader';
import ZenBatchSelector from './components/ZenBatchSelector';
import ZenStats from './components/ZenStats';
import ZenTaskFeed from './components/ZenTaskFeed';

export default function ZenPage() {
  const {
    selectedBatchId,
    setConnected,
    setCurrentTask,
    addActivity,
    incrementCompleted,
    incrementFailed,
    decrementPending,
  } = useZenStore();

  // Connect to SSE stream when batch is selected
  React.useEffect(() => {
    if (!selectedBatchId) {
      setConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;

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
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      // Listen for task events
      eventSource.addEventListener('task_started', (event) => {
        const data = JSON.parse(event.data);
        if (data.payload.batchId === selectedBatchId) {
          setCurrentTask({
            id: data.payload.taskId,
            title: data.payload.title,
            progress: 0,
          });
          addActivity({
            timestamp: new Date(data.timestamp),
            title: data.payload.title,
            status: 'running',
            batchId: data.payload.batchId,
          });
        }
      });

      eventSource.addEventListener('task_completed', (event) => {
        const data = JSON.parse(event.data);
        if (data.payload.batchId === selectedBatchId) {
          setCurrentTask(null);
          incrementCompleted();
          decrementPending();
          addActivity({
            timestamp: new Date(data.timestamp),
            title: data.payload.title,
            status: 'completed',
            batchId: data.payload.batchId,
          });
        }
      });

      eventSource.addEventListener('task_failed', (event) => {
        const data = JSON.parse(event.data);
        if (data.payload.batchId === selectedBatchId) {
          setCurrentTask(null);
          incrementFailed();
          decrementPending();
          addActivity({
            timestamp: new Date(data.timestamp),
            title: data.payload.title,
            status: 'failed',
            batchId: data.payload.batchId,
            error: data.payload.error,
          });
        }
      });

      eventSource.addEventListener('batch_progress', (event) => {
        const data = JSON.parse(event.data);
        if (data.payload.batchId === selectedBatchId && data.payload.currentTaskTitle) {
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
      if (eventSource) {
        eventSource.close();
      }
      setConnected(false);
    };
  }, [
    selectedBatchId,
    setConnected,
    setCurrentTask,
    addActivity,
    incrementCompleted,
    incrementFailed,
    decrementPending,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <ZenHeader />

      {/* Main Content */}
      <main className="container mx-auto px-8 py-12 max-w-4xl">
        {/* Batch Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center mb-12"
        >
          <ZenBatchSelector />
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-12"
        >
          <ZenStats />
        </motion.div>

        {/* Task Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="min-h-[400px]"
        >
          <ZenTaskFeed />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-xs text-gray-600">
        Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Esc</kbd> to exit Zen Mode
      </footer>
    </div>
  );
}
