'use client';
import React, { useState, useMemo } from 'react';
import { Clock, CheckCircle, XCircle, X, Play, Pause, RotateCcw, Trash2 } from 'lucide-react';
import BackgroundTaskTable from './BackgroundTaskTable';
import { BackgroundTask } from '@/types/backgroundTasks';

interface BackgroundTaskManagerProps {
  viewState: 'normal' | 'maximized' | 'minimized';
  tasks: BackgroundTask[];
  isLoading: boolean;
  error: Error | null;
  isQueueActive: boolean;
  taskCounts: Record<string, number>;
  onStartQueue: () => void;
  onStopQueue: () => void;
  onCancelTask: (taskId: string) => void;
  onRetryTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onClearCompleted: () => void;
}

const MAX_TASKS = 100;

export default function BackgroundTaskManager({
  viewState,
  tasks,
  isLoading,
  error,
  isQueueActive,
  taskCounts,
  onStartQueue,
  onStopQueue,
  onCancelTask,
  onRetryTask,
  onDeleteTask,
  onClearCompleted
}: BackgroundTaskManagerProps) {
  const [filter, setFilter] = useState('all');

  const limitedTasks = useMemo(() => {
    return tasks.slice(0, MAX_TASKS);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return filter === 'all' ? limitedTasks : limitedTasks.filter(task => task.status === filter);
  }, [limitedTasks, filter]);

  const filterOptions = [
    { value: 'all', label: 'All', icon: null, count: limitedTasks.length },
    { value: 'pending', label: 'Pending', icon: Clock, count: taskCounts.pending || 0 },
    { value: 'processing', label: 'Processing', icon: RotateCcw, count: taskCounts.processing || 0 },
    { value: 'completed', label: 'Completed', icon: CheckCircle, count: taskCounts.completed || 0 },
    { value: 'error', label: 'Error', icon: XCircle, count: taskCounts.error || 0 },
    { value: 'cancelled', label: 'Cancelled', icon: X, count: taskCounts.cancelled || 0 },
  ];

  const getFilterColor = (type: string) => {
    switch (type) {
      case 'pending': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
      case 'processing': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      case 'completed': return 'border-green-500/50 bg-green-500/10 text-green-400';
      case 'error': return 'border-red-500/50 bg-red-500/10 text-red-400';
      case 'cancelled': return 'border-gray-500/50 bg-gray-500/10 text-gray-400';
      default: return 'border-gray-500/50 bg-gray-500/10 text-gray-400';
    }
  };

  const hasPendingTasks = taskCounts.pending > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header with Controls */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Background Tasks</h3>
            <div className="flex items-center gap-2">
              {isQueueActive ? (
                <div className="flex items-center gap-2 text-blue-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Queue Active</span>
                  {taskCounts.pending === 0 && taskCounts.processing === 0 && (
                    <span className="text-xs text-yellow-400 ml-2">Auto-stopping...</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">Queue Stopped</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Queue Control Button */}
            {isQueueActive ? (
              <button
                onClick={onStopQueue}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 hover:text-red-300 transition-all text-sm"
                title="Stop queue processing"
              >
                <Pause className="w-3.5 h-3.5" />
                Stop Queue
              </button>
            ) : (
              <button
                onClick={onStartQueue}
                disabled={!hasPendingTasks}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  hasPendingTasks
                    ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 hover:text-green-300'
                    : 'bg-gray-500/20 border border-gray-500/50 text-gray-500 cursor-not-allowed'
                }`}
                title={hasPendingTasks ? "Start queue processing" : "No pending tasks"}
              >
                <Play className="w-3.5 h-3.5" />
                Start Queue
              </button>
            )}

            {/* Clear Completed Button */}
            {taskCounts.completed > 0 && (
              <button
                onClick={onClearCompleted}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 rounded-lg text-gray-400 hover:text-gray-300 transition-all text-sm"
                title="Clear completed tasks"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear ({taskCounts.completed})
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(({ value, label, icon: Icon, count }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                filter === value
                  ? getFilterColor(value)
                  : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600/50 hover:bg-gray-700/30'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              <span>{label}</span>
              <span className="bg-gray-900/50 px-1.5 py-0.5 rounded-full text-xs">
                {count}
              </span>
            </button>
          ))}
          {isLoading && (
            <div className="flex items-center text-xs text-gray-400">
              <span className="animate-pulse">Loading tasks...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex-shrink-0 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Error loading background tasks</span>
          </div>
          <p className="text-xs text-red-300 mt-1">{error.message}</p>
        </div>
      )}

      {/* Task Table */}
      <BackgroundTaskTable
        viewState={viewState}
        filter={filter}
        filteredTasks={filteredTasks}
        isLoading={isLoading}
        onCancel={onCancelTask}
        onRetry={onRetryTask}
        onDelete={onDeleteTask}
      />
    </div>
  );
}