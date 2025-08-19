'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, ChevronUp, ChevronDown } from 'lucide-react';
import { GlowCard } from '@/components/GlowCard';
import BackgroundTaskManager from './BackgroundTaskManager';
import { useBackgroundTasks } from '../../hooks/useBackgroundTasks';

interface BackgroundTaskLayoutProps {
  viewState: 'normal' | 'maximized' | 'minimized';
  onViewStateChange: (state: 'normal' | 'maximized' | 'minimized') => void;
  onQueueStateChange: (isActive: boolean) => void;
}

export default function BackgroundTaskLayout({
  viewState,
  onViewStateChange,
  onQueueStateChange
}: BackgroundTaskLayoutProps) {
  const {
    tasks,
    taskCounts,
    isLoading,
    error,
    isQueueActive,
    cancelTask,
    retryTask,
    deleteTask,
    clearCompleted,
    fetchTasks
  } = useBackgroundTasks({ autoRefresh: false, refreshInterval: 5000 });

  // Auto-refresh interval ref
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh effect when queue is active
  useEffect(() => {
    if (isQueueActive) {
      // Start auto-refresh
      autoRefreshInterval.current = setInterval(() => {
        fetchTasks();
      }, 5000);
    } else {
      // Stop auto-refresh
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
    };
  }, [isQueueActive, fetchTasks]);

  // Start queue processing via API
  const startQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/kiro/background-tasks/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      const result = await response.json();
      if (result.success) {
        onQueueStateChange(true);
        // Refresh tasks to get updated queue status
        await fetchTasks();
      } else {
        throw new Error(result.error || 'Failed to start queue');
      }
    } catch (error) {
      console.error('Failed to start queue:', error);
    }
  }, [onQueueStateChange, fetchTasks]);

  // Stop queue processing via API
  const stopQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/kiro/background-tasks/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      const result = await response.json();
      if (result.success) {
        onQueueStateChange(false);
        // Refresh tasks to get updated queue status
        await fetchTasks();
      } else {
        throw new Error(result.error || 'Failed to stop queue');
      }
    } catch (error) {
      console.error('Failed to stop queue:', error);
    }
  }, [onQueueStateChange, fetchTasks]);

  // Auto-stop queue when no more tasks to process
  useEffect(() => {
    if (isQueueActive && taskCounts.pending === 0 && taskCounts.processing === 0) {
      const stopQueueAutomatically = async () => {
        try {
          await stopQueue();
        } catch (error) {
          console.error('Failed to auto-stop queue:', error);
        }
      };
      
      // Add a small delay to avoid immediate stopping
      const timeout = setTimeout(stopQueueAutomatically, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isQueueActive, taskCounts.pending, taskCounts.processing, stopQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup is handled by the taskQueue singleton
    };
  }, []);

  const getContainerHeight = () => {
    switch (viewState) {
      case 'maximized': return 'h-[80vh]';
      case 'minimized': return 'h-12';
      case 'normal':
      default: return 'h-[25vh]';
    }
  };

  return (
    <motion.div
      className={`${getContainerHeight()} transition-all duration-300 ease-in-out`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <GlowCard className={`p-4 h-full flex flex-col relative ${
        viewState === 'minimized' ? 'items-center justify-center' : ''
      } ${isQueueActive ? 'shadow-lg shadow-blue-500/20' : ''}`}>
        {/* Control Buttons - Top Right */}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {viewState !== 'minimized' && (
            <>
              <button
                onClick={() => onViewStateChange(viewState === 'maximized' ? 'normal' : 'maximized')}
                className="p-1.5 cursor-pointer rounded-md bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 transition-all"
                title={viewState === 'maximized' ? 'Restore' : 'Maximize'}
              >
                {viewState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onViewStateChange('minimized')}
                className="p-1.5 cursor-pointer rounded-md bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 transition-all"
                title="Minimize"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Minimized State */}
        {viewState === 'minimized' && (
          <button
            onClick={() => onViewStateChange('normal')}
            className="flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 transition-all"
            title="Expand Background Tasks"
          >
            <ChevronUp className="w-4 h-4" />
            <span className="text-sm font-medium">
              Background Tasks ({tasks.length})
              {isLoading && <span className="ml-1 animate-pulse">⟳</span>}
              {isQueueActive && <span className="ml-1 text-blue-400 animate-pulse">🔄</span>}
              {!isQueueActive && taskCounts.pending > 0 && <span className="ml-1 text-yellow-400">⏸</span>}
              {error && <span className="ml-1 text-red-400">⚠</span>}
            </span>
          </button>
        )}

        {/* Normal/Maximized State */}
        {viewState !== 'minimized' && (
          <BackgroundTaskManager
            viewState={viewState}
            tasks={tasks}
            isLoading={isLoading}
            error={error}
            isQueueActive={isQueueActive}
            taskCounts={taskCounts}
            onStartQueue={startQueue}
            onStopQueue={stopQueue}
            onCancelTask={cancelTask}
            onRetryTask={retryTask}
            onDeleteTask={deleteTask}
            onClearCompleted={clearCompleted}
          />
        )}
      </GlowCard>
    </motion.div>
  );
}