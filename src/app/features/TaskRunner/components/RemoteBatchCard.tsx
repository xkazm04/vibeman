'use client';

/**
 * Remote Batch Card
 * Shows progress and status of a single remote batch.
 */

import { motion } from 'framer-motion';
import { Play, Pause, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import type { RemoteBatchInfo } from '@/stores/emulatorStore';

interface RemoteBatchCardProps {
  batch: RemoteBatchInfo;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
  },
  running: {
    icon: Loader2,
    label: 'Running',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    iconClass: 'animate-spin',
  },
  paused: {
    icon: Pause,
    label: 'Paused',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
};

export default function RemoteBatchCard({ batch }: RemoteBatchCardProps) {
  const config = statusConfig[batch.status];
  const StatusIcon = config.icon;
  const progress =
    batch.total_tasks > 0
      ? ((batch.completed_tasks + batch.failed_tasks) / batch.total_tasks) * 100
      : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={`w-4 h-4 ${config.color} ${
              config.iconClass || ''
            }`}
          />
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {batch.completed_tasks + batch.failed_tasks}/{batch.total_tasks} tasks
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-800/50 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            batch.status === 'running'
              ? 'bg-emerald-500'
              : batch.status === 'completed'
                ? 'bg-green-500'
                : batch.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-gray-500'
          }`}
        />
      </div>

      {/* Current Task */}
      {batch.current_task && batch.status === 'running' && (
        <div className="text-xs text-gray-400 truncate">
          <span className="text-gray-500">Current: </span>
          {batch.current_task}
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
        {batch.completed_tasks > 0 && (
          <span className="text-green-400">
            {batch.completed_tasks} completed
          </span>
        )}
        {batch.failed_tasks > 0 && (
          <span className="text-red-400">{batch.failed_tasks} failed</span>
        )}
        {batch.started_at && (
          <span>
            Started:{' '}
            {new Date(batch.started_at).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </motion.div>
  );
}
