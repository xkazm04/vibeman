import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckSquare, Target, Search, Code2, Clock, CheckCircle, XCircle, AlertTriangle, RotateCcw, X } from 'lucide-react';
import { BackgroundTask } from '../../types/backgroundTasks';

interface BackgroundTaskRowProps {
  task: BackgroundTask;
  index: number;
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
}

export default function BackgroundTaskRow({ task, index, onCancel, onRetry }: BackgroundTaskRowProps) {
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

  const canCancel = task.status === 'pending';
  const canRetry = task.status === 'error' && task.retry_count < task.max_retries;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.02 }}
      className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors"
    >
      <td className="px-3 py-2">
        <div className="flex items-center space-x-2">
          <TaskIcon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="text-white text-sm font-medium truncate">
            {getTaskTypeLabel(task.task_type)}
          </span>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="text-gray-300 text-sm">
          <div className="font-medium truncate">{task.project_name}</div>
          <div className="text-xs text-gray-400 truncate">{task.project_path}</div>
        </div>
      </td>
      <td className="px-3 py-2">
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
          <div className="text-xs text-red-400 mt-1 truncate" title={task.error_message}>
            {task.error_message}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="text-gray-400 text-xs font-mono">
          <div>
            {new Date(task.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
          {task.priority > 0 && (
            <div className="text-yellow-400 text-xs mt-1">
              Priority: {task.priority}
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center space-x-1">
          {canRetry && (
            <button
              onClick={() => onRetry(task.id)}
              className="p-1 hover:bg-blue-500/20 rounded text-blue-400 hover:text-blue-300 transition-colors"
              title="Retry task"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(task.id)}
              className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
              title="Cancel task"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );
};