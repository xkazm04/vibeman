'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Maximize2, Minimize2, ChevronUp, ChevronDown, RefreshCw, XCircle } from 'lucide-react';
import { GlowCard } from '@/components/GlowCard';
import { useEvents } from '@/hooks/useEvents';
import { useBackgroundTasks } from '../../../hooks/useBackgroundTasks';
import Events from './FooterEvents/Events';
import BackgroundTasks from './FooterBgTasks/BackgroundTasks';
import { ViewState, FilterState, QueueControls, RefreshControls } from './FooterBgTasks/bgTaskTypes';

export default function MonitorLayout() {
  const [currentViewState, setCurrentViewState] = useState<'normal' | 'maximized' | 'minimized'>('minimized');
  const [eventFilter, setEventFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');

  // Auto-refresh interval ref
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Events hook - no auto polling, manual refresh only
  const {
    events: eventLog,
    isLoading: eventsLoading,
    error: eventsError,
    refresh: refetchEvents
  } = useEvents({
    limit: 50,
    autoRefresh: false
  });

  // Background tasks hook - no auto refresh, we'll handle it manually
  const {
    tasks: allTasks,
    taskCounts,
    isLoading: tasksLoading,
    error: tasksError,
    isQueueActive,
    fetchTasks
  } = useBackgroundTasks({
    autoRefresh: false,
    refreshInterval: 5000
  });

  // Auto-refresh effect when queue is active
  useEffect(() => {
    if (isQueueActive) {
      // Start auto-refresh
      autoRefreshInterval.current = setInterval(() => {
        fetchTasks();
        refetchEvents();
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
  }, [isQueueActive, fetchTasks, refetchEvents]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchEvents(),
      fetchTasks()
    ]);
  }, [refetchEvents, fetchTasks]);

  // Queue management
  const startQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/kiro/background-tasks/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      const result = await response.json();
      if (result.success) {
        await fetchTasks();
      } else {
        throw new Error(result.error || 'Failed to start queue');
      }
    } catch (error) {
      console.error('Failed to start queue:', error);
    }
  }, [fetchTasks]);

  const stopQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/kiro/background-tasks/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      const result = await response.json();
      if (result.success) {
        await fetchTasks();
      } else {
        throw new Error(result.error || 'Failed to stop queue');
      }
    } catch (error) {
      console.error('Failed to stop queue:', error);
    }
  }, [fetchTasks]);

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

  // Prepare state objects
  const viewState: ViewState = {
    current: currentViewState,
    set: setCurrentViewState
  };

  const filterState: FilterState = {
    eventFilter,
    setEventFilter,
    taskFilter,
    setTaskFilter
  };

  const queueControls: QueueControls = {
    isQueueActive,
    startQueue,
    stopQueue,
    taskCounts
  };

  // Calculate derived values for UI logic
  const isLoading = eventsLoading || tasksLoading;
  const hasErrors = !!(eventsError || tasksError);

  const refreshControls: RefreshControls = {
    isLoading,
    hasErrors,
    handleRefresh,
    eventsError,
    tasksError
  };

  // Filter out cancelled tasks for count
  const tasks = allTasks.filter(task => task.status !== 'cancelled');
  const totalItems = eventLog.length + tasks.length;

  const getContainerHeight = () => {
    switch (currentViewState) {
      case 'maximized': return 'h-[80vh]';
      case 'minimized': return 'h-12';
      case 'normal':
      default: return 'h-[50vh]';
    }
  };

  const getAriaLabel = () => {
    const status = isQueueActive ? 'active' : 'inactive';
    const errors = hasErrors ? 'with errors' : '';
    return `Events and tasks monitor, ${totalItems} items, queue ${status} ${errors}`.trim();
  };

  return (
    <motion.div
      className={`fixed bottom-0 left-0 right-0 z-50 ${getContainerHeight()} transition-all duration-300 ease-in-out`}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      role="region"
      aria-label={getAriaLabel()}
      aria-live="polite"
      aria-atomic="false"
    >
      <GlowCard className={`p-4 h-full flex flex-col relative shadow-[0_-4px_20px_rgba(255,255,255,0.1)] border-t-white/20 ${currentViewState === 'minimized' ? 'items-center justify-center' : ''
        } ${isQueueActive ? 'shadow-lg shadow-blue-500/20' : ''}`}>

        {/* Control Buttons - Top Right */}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {currentViewState !== 'minimized' && (
            <>
              {/* Manual Refresh Button - only show when queue is not active */}
              {!isQueueActive && (
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md border transition-all min-h-[32px] ${isLoading
                    ? 'bg-gray-500/20 border-gray-500/50 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 focus:ring-2 focus:ring-blue-500/50 focus:outline-none'
                    }`}
                  title="Refresh events and tasks"
                  aria-label={`Refresh data${isLoading ? ' (loading)' : ''}`}
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="sr-only sm:not-sr-only">Refresh</span>
                </button>
              )}

              {/* Queue Control */}
              {isQueueActive ? (
                <button
                  onClick={stopQueue}
                  className="flex items-center gap-1 px-2 py-1 text-sm rounded-md bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 focus:ring-2 focus:ring-red-500/50 focus:outline-none transition-all min-h-[32px]"
                  title="Stop queue processing"
                  aria-label="Stop queue processing"
                >
                  <Pause className="w-3 h-3" />
                  <span className="sr-only sm:not-sr-only">Queue</span>
                </button>
              ) : (
                <button
                  onClick={startQueue}
                  disabled={taskCounts.pending === 0}
                  className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md border transition-all min-h-[32px] ${taskCounts.pending > 0
                    ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30 focus:ring-2 focus:ring-green-500/50 focus:outline-none'
                    : 'bg-gray-500/20 border-gray-500/50 text-gray-500 cursor-not-allowed'
                    }`}
                  title={taskCounts.pending > 0 ? "Start queue processing" : "No pending tasks"}
                  aria-label={taskCounts.pending > 0 ? "Start queue processing" : "No pending tasks to process"}
                >
                  <Play className="w-3 h-3" />
                  <span className="sr-only sm:not-sr-only">Queue</span>
                </button>
              )}

              <button
                onClick={() => setCurrentViewState(currentViewState === 'maximized' ? 'normal' : 'maximized')}
                className="p-1.5 cursor-pointer rounded-md bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 focus:ring-2 focus:ring-gray-500/50 focus:outline-none transition-all min-w-[32px] min-h-[32px]"
                title={currentViewState === 'maximized' ? 'Restore to normal size' : 'Maximize monitor'}
                aria-label={currentViewState === 'maximized' ? 'Restore to normal size' : 'Maximize monitor'}
              >
                {currentViewState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setCurrentViewState('minimized')}
                className="p-1.5 cursor-pointer rounded-md bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 focus:ring-2 focus:ring-gray-500/50 focus:outline-none transition-all min-w-[32px] min-h-[32px]"
                title="Minimize monitor"
                aria-label="Minimize monitor"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Minimized State */}
        {currentViewState === 'minimized' && (
          <button
            onClick={() => setCurrentViewState('normal')}
            className="flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 focus:ring-2 focus:ring-gray-500/50 focus:outline-none transition-all min-h-[44px]"
            title="Expand Events & Tasks monitor"
            aria-label={`Expand monitor showing ${totalItems} items${isQueueActive ? ', queue active' : ''}${hasErrors ? ', has errors' : ''}`}
          >
            <ChevronUp className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm font-medium">
              Events & Tasks ({totalItems})
              {isLoading && (
                <span className="ml-1 animate-pulse" aria-label="Loading">
                  ⟳
                </span>
              )}
              {isQueueActive && (
                <span className="ml-1 text-blue-400 animate-pulse" aria-label="Queue active">
                  🔄
                </span>
              )}
              {hasErrors && (
                <span className="ml-1 text-red-400" aria-label="Has errors">
                  ⚠
                </span>
              )}
            </span>
          </button>
        )}

        {/* Normal/Maximized State */}
        {currentViewState !== 'minimized' && (
          <>
            {/* Header with Master Controls */}
            <div className="flex-shrink-0 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">Events & Background Tasks</h3>
                  <div className="flex items-center gap-2">
                    {isQueueActive ? (
                      <div className="flex items-center gap-2 text-blue-400">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-sm">Auto Refresh (5s)</span>
                        {taskCounts.pending === 0 && taskCounts.processing === 0 && (
                          <span className="text-sm text-yellow-400 ml-2">Auto-stopping...</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm">Manual Refresh</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error States */}
              {hasErrors && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Error loading data</span>
                  </div>
                  {eventsError && <p className="text-sm text-red-300 mt-1">Events: {eventsError.message}</p>}
                  {tasksError && <p className="text-sm text-red-300 mt-1">Tasks: {tasksError.message}</p>}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden" role="main">
              <div className="grid grid-cols-2 gap-4">
                <Events
                  viewState={currentViewState}
                  filterState={filterState}
                  isLoading={eventsLoading}
                />
                <BackgroundTasks
                  viewState={currentViewState}
                  filterState={filterState}
                  isLoading={tasksLoading}
                />
              </div>
            </div>
          </>
        )}
      </GlowCard>
    </motion.div>
  );
}