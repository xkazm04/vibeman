'use client';
import React, { useState } from 'react';
import { Clock, RotateCcw, CheckCircle, XCircle, X, Trash2 } from 'lucide-react';
import { useBackgroundTasks } from '../../../../hooks/useBackgroundTasks';
import ContextMenu from '@/components/ContextMenu';
import { BackgroundTask } from '../../../../types/backgroundTasks';
import { FilterState, ContextMenuState } from './bgTaskTypes';
import BackgroundTaskTable from './BackgroundTaskTable';

interface BackgroundTasksProps {
  viewState: 'normal' | 'maximized' | 'minimized';
  filterState: FilterState;
  isLoading: boolean;
}

export default function BackgroundTasks({ 
  viewState, 
  filterState,
  isLoading 
}: BackgroundTasksProps) {
  const { taskFilter, setTaskFilter } = filterState;
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    task: null
  });

  const {
    tasks: allTasks,
    taskCounts,
    cancelTask,
    retryTask,
    deleteTask,
    clearCompleted,
  } = useBackgroundTasks({
    autoRefresh: false,
    refreshInterval: 5000
  });

  // Context menu handlers
  const handleContextMenu = (event: React.MouseEvent, task: BackgroundTask) => {
    console.log('Context menu triggered for task:', task.id);
    console.log('Mouse position:', { x: event.clientX, y: event.clientY });
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      task
    });
    console.log('Context menu state updated');
  };

  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
      task: null
    });
  };

  const getContextMenuItems = (task: BackgroundTask) => {
    const canCancel = task.status === 'pending' || task.status === 'processing';
    const canRetry = task.status === 'error' || task.status === 'cancelled';

    return [
      {
        label: 'Retry Task',
        icon: RotateCcw,
        onClick: () => retryTask(task.id),
        disabled: !canRetry
      },
      {
        label: 'Cancel Task',
        icon: X,
        onClick: () => cancelTask(task.id),
        disabled: !canCancel,
        destructive: true
      },
      {
        label: 'Delete Task',
        icon: Trash2,
        onClick: () => deleteTask(task.id),
        destructive: true
      }
    ];
  };

  // Filter out cancelled tasks and apply user filter
  const tasks = allTasks.filter(task => task.status !== 'cancelled');
  const filteredTasks = taskFilter === 'all' ? tasks : tasks.filter(task => task.status === taskFilter);

  const taskFilterOptions = [
    { value: 'all', label: 'All', icon: null, count: tasks.length },
    { value: 'pending', label: 'Pending', icon: Clock, count: taskCounts.pending || 0 },
    { value: 'processing', label: 'Processing', icon: RotateCcw, count: taskCounts.processing || 0 },
    { value: 'completed', label: 'Completed', icon: CheckCircle, count: taskCounts.completed || 0 },
    { value: 'error', label: 'Error', icon: XCircle, count: taskCounts.error || 0 },
  ];

  const getFilterColor = (type: string) => {
    switch (type) {
      case 'pending': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      case 'processing': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      case 'completed': return 'border-green-500/50 bg-green-500/10 text-green-400';
      case 'error': return 'border-red-500/50 bg-red-500/10 text-red-400';
      case 'cancelled': return 'border-gray-500/50 bg-gray-500/10 text-gray-400';
      default: return 'border-gray-500/50 bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="flex-shrink-0 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-md font-medium text-white">Background Tasks ({tasks.length})</h4>
            {taskCounts.completed > 0 && (
              <button
                onClick={clearCompleted}
                className="text-sm px-2 py-1 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 rounded text-gray-400 hover:text-gray-300 transition-all"
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
                className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-sm font-medium transition-all ${
                  taskFilter === value
                    ? getFilterColor(value)
                    : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600/50 hover:bg-gray-700/30'
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span>{label}</span>
                <span className="bg-gray-900/50 px-1 py-0.5 rounded-full text-sm">
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
          isLoading={isLoading}
          onCancel={cancelTask}
          onRetry={retryTask}
          onDelete={deleteTask}
          onContextMenu={handleContextMenu}
        />
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.task && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          items={getContextMenuItems(contextMenu.task)}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
}