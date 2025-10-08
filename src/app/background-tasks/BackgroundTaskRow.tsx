import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckSquare, Target, Search, Code2, Clock, CheckCircle, XCircle, RotateCcw, X } from 'lucide-react';
import { BackgroundTask } from '../../types/backgroundTasks';

interface BackgroundTaskRowProps {
  task: BackgroundTask;
  index: number;
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onContextMenu: (event: React.MouseEvent, task: BackgroundTask) => void;
}

export default function BackgroundTaskRow({ task, index, onCancel, onRetry, onDelete, onContextMenu }: BackgroundTaskRowProps) {
  const getTaskIcon = (taskType: BackgroundTask['task_type']) => {
    switch (taskType) {
      case 'docs': return FileText;
      case 'tasks': return CheckSquare;
      case 'goals': return Target;
      case 'context': return Search;
      case 'code': return Code2;
      default: return FileText;
    }
  };

  const getStatusIcon = (status: BackgroundTask['status']) => {
    switch (status) {
      case 'pending': return Clock;
      case 'processing': return RotateCcw;
      case 'completed': return CheckCircle;
      case 'error': return XCircle;
      case 'cancelled': return X;
      default: return Clock;
    }
  };

  const getStatusColor = (status: BackgroundTask['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'processing': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBgColor = (status: BackgroundTask['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10';
      case 'processing': return 'bg-blue-500/10';
      case 'completed': return 'bg-green-500/10';
      case 'error': return 'bg-red-500/10';
      case 'cancelled': return 'bg-gray-500/10';
      default: return 'bg-gray-500/10';
    }
  };

  const getTaskTypeLabel = (taskType: BackgroundTask['task_type']) => {
    switch (taskType) {
      case 'docs': return 'AI Docs';
      case 'tasks': return 'Tasks';
      case 'goals': return 'Goals';
      case 'context': return 'Context';
      case 'code': return 'Code Scan';
      default: return taskType;
    }
  };

  const TaskIcon = getTaskIcon(task.task_type);
  const StatusIcon = getStatusIcon(task.status);
  const statusColor = getStatusColor(task.status);
  const statusBgColor = getStatusBgColor(task.status);

  const handleContextMenu = (event: React.MouseEvent) => {
    console.log('Right-click detected on task row:', task.id); // Debug log
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, task);
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.02 }}
      className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors cursor-context-menu h-12 select-none"
      onContextMenu={handleContextMenu}
      onMouseDown={(e) => {
        if (e.button === 2) { // Right mouse button
          console.log('Right mouse button detected on mousedown');
        }
      }}
      style={{ height: '48px' }}
    >
      <td className="px-3 py-1 align-middle">
        <div className="flex items-center justify-center h-8" title={getTaskTypeLabel(task.task_type)}>
          <TaskIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
        </div>
      </td>
      <td className="px-3 py-1 align-middle">
        <div className="text-gray-300 text-sm min-h-[32px] flex flex-col justify-center">
          <div className="font-medium truncate leading-tight">{task.project_name}</div>
          <div className="text-xs text-gray-400 truncate leading-tight">{task.project_path}</div>
        </div>
      </td>
      <td className="px-3 py-1 align-middle">
        <div className="min-h-[32px] flex flex-col justify-center">
          <div className="flex items-center space-x-2">
            <StatusIcon className={`w-3.5 h-3.5 ${statusColor} flex-shrink-0 ${task.status === 'processing' ? 'animate-spin' : ''}`} />
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${statusBgColor} ${statusColor} capitalize`}>
              {task.status}
            </span>
            {task.status === 'error' && (
              <span className="text-xs text-gray-400">({task.retry_count}/{task.max_retries})</span>
            )}
          </div>
          {task.error_message && (
            <div className="text-xs text-red-400 truncate leading-tight" title={task.error_message}>
              {task.error_message}
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-1 align-middle">
        <div className="text-gray-400 text-xs font-mono min-h-[32px] flex flex-col justify-center">
          <div className="leading-tight">
            {new Date(task.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
          {task.priority > 0 && (
            <div className="text-yellow-400 text-xs leading-tight">
              Priority: {task.priority}
            </div>
          )}
        </div>
      </td>


    </motion.tr>
  );
};