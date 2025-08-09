'use client';
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Maximize2, Minimize2, ChevronUp, ChevronDown, Info, AlertTriangle, XCircle, CheckCircle, Clock, RotateCcw, RefreshCw } from 'lucide-react';
import { GlowCard } from '@/components/GlowCard';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { useBackgroundTasks } from '../../hooks/useBackgroundTasks';
import EventTable from '../events/EventTable';
import BackgroundTaskTable from '../background-tasks/BackgroundTaskTable';

export default function CombinedBottomLayout() {
  const [viewState, setViewState] = useState<'normal' | 'maximized' | 'minimized'>('minimized');
  const [eventFilter, setEventFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');

  // Events hook - no auto polling, manual refresh only
  const {
    events: eventLog,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = useRealtimeEvents({
    limit: 50,
    autoRefresh: false,
    refreshInterval: 5000
  });

  // Background tasks hook - no auto polling, manual refresh only
  const {
    tasks: allTasks,
    taskCounts,
    isLoading: tasksLoading,
    error: tasksError,
    isQueueActive,
    cancelTask,
    retryTask,
    clearCompleted,
    fetchTasks
  } = useBackgroundTasks({
    autoRefresh: false,
    refreshInterval: 3000
  });

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

  // Event filtering
  const limitedEvents = eventLog.slice(0, 50);
  const filteredEvents = eventFilter === 'all' ? limitedEvents : limitedEvents.filter(event => event.type === eventFilter);

  const eventCounts = limitedEvents.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter out cancelled tasks and apply user filter
  const tasks = allTasks.filter(task => task.status !== 'cancelled');
  const filteredTasks = taskFilter === 'all' ? tasks : tasks.filter(task => task.status === taskFilter);

  // Filter options
  const eventFilterOptions = [
    { value: 'all', label: 'All', icon: null, count: limitedEvents.length },
    { value: 'info', label: 'Info', icon: Info, count: eventCounts.info || 0 },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, count: eventCounts.warning || 0 },
    { value: 'error', label: 'Error', icon: XCircle, count: eventCounts.error || 0 },
    { value: 'success', label: 'Success', icon: CheckCircle, count: eventCounts.success || 0 },
  ];

  const taskFilterOptions = [
    { value: 'all', label: 'All', icon: null, count: tasks.length },
    { value: 'pending', label: 'Pending', icon: Clock, count: taskCounts.pending || 0 },
    { value: 'processing', label: 'Processing', icon: RotateCcw, count: taskCounts.processing || 0 },
    { value: 'completed', label: 'Completed', icon: CheckCircle, count: taskCounts.completed || 0 },
    { value: 'error', label: 'Error', icon: XCircle, count: taskCounts.error || 0 },
  ];

  const getFilterColor = (type: string) => {
    switch (type) {
      case 'info': case 'pending': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      case 'warning': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
      case 'error': return 'border-red-500/50 bg-red-500/10 text-red-400';
      case 'success': case 'completed': return 'border-green-500/50 bg-green-500/10 text-green-400';
      case 'processing': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      case 'cancelled': return 'border-gray-500/50 bg-gray-500/10 text-gray-400';
      default: return 'border-gray-500/50 bg-gray-500/10 text-gray-400';
    }
  };

  const getContainerHeight = () => {
    switch (viewState) {
      case 'maximized': return 'h-[80vh]';
      case 'minimized': return 'h-12';
      case 'normal':
      default: return 'h-[50vh]';
    }
  };

  const totalItems = limitedEvents.length + tasks.length;
  const hasErrors = eventsError || tasksError;
  const isLoading = eventsLoading || tasksLoading;

  return (
    <motion.div
      className={`fixed bottom-0 left-0 right-0 z-50 ${getContainerHeight()} transition-all duration-300 ease-in-out`}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <GlowCard className={`p-4 h-full flex flex-col relative shadow-[0_-4px_20px_rgba(255,255,255,0.1)] border-t-white/20 ${viewState === 'minimized' ? 'items-center justify-center' : ''
        } ${isQueueActive ? 'shadow-lg shadow-blue-500/20' : ''}`}>

        {/* Control Buttons - Top Right */}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {viewState !== 'minimized' && (
            <>
              {/* Manual Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all ${
                  isLoading
                    ? 'bg-gray-500/20 border-gray-500/50 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30'
                }`}
                title="Refresh events and tasks"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Queue Control */}
              {isQueueActive ? (
                <button
                  onClick={stopQueue}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-all"
                  title="Stop queue processing"
                >
                  <Pause className="w-3 h-3" />
                  Queue
                </button>
              ) : (
                <button
                  onClick={startQueue}
                  disabled={taskCounts.pending === 0}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all ${taskCounts.pending > 0
                    ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                    : 'bg-gray-500/20 border-gray-500/50 text-gray-500 cursor-not-allowed'
                    }`}
                  title={taskCounts.pending > 0 ? "Start queue processing" : "No pending tasks"}
                >
                  <Play className="w-3 h-3" />
                  Queue
                </button>
              )}

              <button
                onClick={() => setViewState(viewState === 'maximized' ? 'normal' : 'maximized')}
                className="p-1.5 cursor-pointer rounded-md bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 transition-all"
                title={viewState === 'maximized' ? 'Restore' : 'Maximize'}
              >
                {viewState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setViewState('minimized')}
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
            onClick={() => setViewState('normal')}
            className="flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 transition-all"
            title="Expand Events & Tasks"
          >
            <ChevronUp className="w-4 h-4" />
            <span className="text-sm font-medium">
              Events & Tasks ({totalItems})
              {isLoading && <span className="ml-1 animate-pulse">⟳</span>}
              {isQueueActive && <span className="ml-1 text-blue-400 animate-pulse">🔄</span>}
              {hasErrors && <span className="ml-1 text-red-400">⚠</span>}
            </span>
          </button>
        )}

        {/* Normal/Maximized State */}
        {viewState !== 'minimized' && (
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
                        <span className="text-sm">Queue Active</span>
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
                  {eventsError && <p className="text-xs text-red-300 mt-1">Events: {eventsError.message}</p>}
                  {tasksError && <p className="text-xs text-red-300 mt-1">Tasks: {tasksError.message}</p>}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
              {/* Events Panel */}
              <div className="flex flex-col">
                <div className="flex-shrink-0 mb-3">
                  <h4 className="text-md font-medium text-white mb-2">Events ({limitedEvents.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {eventFilterOptions.map(({ value, label, icon: Icon, count }) => (
                      <button
                        key={value}
                        onClick={() => setEventFilter(value)}
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium transition-all ${eventFilter === value
                          ? getFilterColor(value)
                          : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600/50 hover:bg-gray-700/30'
                          }`}
                      >
                        {Icon && <Icon className="w-3 h-3" />}
                        <span>{label}</span>
                        <span className="bg-gray-900/50 px-1 py-0.5 rounded-full text-xs">
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <EventTable
                  viewState={viewState}
                  filter={eventFilter}
                  filteredEvents={filteredEvents}
                  isLoading={eventsLoading}
                />
              </div>

              {/* Background Tasks Panel */}
              <div className="flex flex-col">
                <div className="flex-shrink-0 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-md font-medium text-white">Background Tasks ({tasks.length})</h4>
                    {taskCounts.completed > 0 && (
                      <button
                        onClick={clearCompleted}
                        className="text-xs px-2 py-1 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 rounded text-gray-400 hover:text-gray-300 transition-all"
                        title="Clear completed tasks"
                      >
                        Clear ({taskCounts.completed})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {taskFilterOptions.map(({ value, label, icon: Icon, count }) => (
                      <button
                        key={value}
                        onClick={() => setTaskFilter(value)}
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium transition-all ${taskFilter === value
                          ? getFilterColor(value)
                          : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600/50 hover:bg-gray-700/30'
                          }`}
                      >
                        {Icon && <Icon className="w-3 h-3" />}
                        <span>{label}</span>
                        <span className="bg-gray-900/50 px-1 py-0.5 rounded-full text-xs">
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <BackgroundTaskTable
                  viewState={viewState}
                  filter={taskFilter}
                  filteredTasks={filteredTasks}
                  isLoading={tasksLoading}
                  onCancel={cancelTask}
                  onRetry={retryTask}
                />
              </div>
            </div>
          </>
        )}
      </GlowCard>
    </motion.div>
  );
}