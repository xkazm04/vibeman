'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, ExternalLink, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/stores/onboardingStore';
import type { TaskState } from '@/app/features/TaskRunner/store/taskRunnerStore';
import {
  isTaskRunning,
  isTaskQueued,
  isTaskCompleted,
  isTaskFailed,
} from '@/app/features/TaskRunner/lib/types';

interface TaskProgressItemProps {
  task: TaskState;
  requirementName: string;
  projectName?: string;
  onClick?: () => void;
}

export default function TaskProgressItem({
  task,
  requirementName,
  projectName,
  onClick,
}: TaskProgressItemProps) {
  const router = useRouter();
  const { setActiveModule } = useOnboardingStore();

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Navigate to TaskRunner module
    setActiveModule('tasker');
    router.push('/');
  };

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!isTaskRunning(task.status)) return null;
    const now = Date.now();
    const elapsed = Math.floor((now - task.status.startedAt) / 1000); // seconds
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    if (isTaskRunning(task.status)) {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/30',
      };
    }
    if (isTaskCompleted(task.status)) {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
      };
    }
    if (isTaskFailed(task.status)) {
      return {
        icon: <XCircle className="w-4 h-4" />,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
      };
    }
    if (isTaskQueued(task.status)) {
      return {
        icon: <Clock className="w-4 h-4" />,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
      };
    }
    return {
      icon: <Clock className="w-4 h-4" />,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/30',
    };
  };

  const statusDisplay = getStatusDisplay();
  const elapsedTime = getElapsedTime();

  // Simple progress estimation (can be enhanced with real progress from logs)
  const getProgress = () => {
    if (isTaskCompleted(task.status)) return 100;
    if (isTaskFailed(task.status)) return 100;
    if (isTaskQueued(task.status)) return 0;

    // For running tasks, estimate based on elapsed time (rough heuristic)
    if (isTaskRunning(task.status)) {
      const elapsed = (Date.now() - task.status.startedAt) / 1000; // seconds
      // Assume average task takes 3 minutes = 180 seconds
      const estimatedProgress = Math.min((elapsed / 180) * 100, 95);
      return Math.floor(estimatedProgress);
    }

    return 10;
  };

  const progress = getProgress();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        px-2 py-2 border-b border-gray-800/50
        hover:bg-slate-800/30 transition-colors cursor-pointer
        ${statusDisplay.bgColor}
      `}
      onClick={onClick}
      data-testid={`task-item-${task.id}`}
    >
      <div className="flex flex-col gap-2">
        {/* Task Name with Status Icon */}
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 flex-shrink-0 ${statusDisplay.color}`}>
            {statusDisplay.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-medium text-gray-200 truncate leading-tight">
              {requirementName}
            </h4>
          </div>
        </div>

        {/* Progress Bar (for running tasks) */}
        {isTaskRunning(task.status) && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>{progress}%</span>
              {elapsedTime && (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {elapsedTime}
                </span>
              )}
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Error Message (for failed tasks) */}
        {isTaskFailed(task.status) && task.status.error && (
          <p className="text-[10px] text-red-400 line-clamp-2">
            {task.status.error}
          </p>
        )}

        {/* Status Text and View Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className={statusDisplay.color}>
              {isTaskRunning(task.status) && 'Running'}
              {isTaskCompleted(task.status) && 'Done'}
              {isTaskFailed(task.status) && 'Failed'}
              {isTaskQueued(task.status) && 'Queued'}
            </span>
            {(isTaskCompleted(task.status) || isTaskFailed(task.status)) && (
              <span className="text-gray-500">
                {new Date(task.status.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <button
            onClick={handleViewDetails}
            className="
              px-1.5 py-0.5 text-[10px] text-cyan-400
              hover:text-cyan-300 hover:bg-cyan-500/10
              rounded border border-cyan-500/30
              transition-colors flex items-center gap-0.5
            "
            data-testid={`view-task-${task.id}`}
          >
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
