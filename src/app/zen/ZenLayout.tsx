'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Settings2 } from 'lucide-react';
import { useZenStore } from './lib/zenStore';
import ZenHeader from './components/ZenHeader';
import ZenBatchSelector from './components/ZenBatchSelector';
import ZenStats from './components/ZenStats';
import ZenTaskFeed from './components/ZenTaskFeed';
import { ZenControlPanel } from './sub_ZenControl';

type ZenTab = 'monitor' | 'control';

/**
 * Zen Mode Layout - Embedded version for main page
 * A minimal, calm batch monitoring interface with cross-device offload support
 */
export default function ZenLayout() {
  const [activeTab, setActiveTab] = useState<ZenTab>('monitor');
  const {
    mode,
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
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white rounded-xl overflow-hidden">
      {/* Header */}
      <ZenHeader embedded />

      {/* Tab Navigation */}
      <div className="flex justify-center py-4 border-b border-gray-800/50">
        <div className="flex bg-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === 'monitor'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            <Activity className="w-4 h-4" />
            Monitor
          </button>
          <button
            onClick={() => setActiveTab('control')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === 'control'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            <Settings2 className="w-4 h-4" />
            Control
            {mode === 'online' && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-8 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {activeTab === 'monitor' ? (
            <motion.div
              key="monitor"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Batch Selector */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center mb-10"
              >
                <ZenBatchSelector />
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex justify-center mb-10"
              >
                <ZenStats />
              </motion.div>

              {/* Task Feed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="min-h-[300px]"
              >
                <ZenTaskFeed />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="control"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ZenControlPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
