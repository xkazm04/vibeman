'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  FileText,
} from 'lucide-react';
import type { DbOffloadTask, OffloadTaskStatus } from '@/lib/supabase/realtimeTypes';

interface SupabaseIncomingTasksProps {
  tasks: DbOffloadTask[];
  onClaim: (taskId: string) => Promise<boolean>;
  onStart: (taskId: string) => Promise<boolean>;
  onComplete: (taskId: string, resultSummary?: string) => Promise<boolean>;
  onFail: (taskId: string, errorMessage: string) => Promise<boolean>;
}

const statusConfig: Record<OffloadTaskStatus, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-400', label: 'Pending' },
  claimed: { icon: Download, color: 'text-cyan-400', label: 'Claimed' },
  running: { icon: Loader2, color: 'text-blue-400', label: 'Running' },
  completed: { icon: CheckCircle, color: 'text-green-400', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-gray-400', label: 'Cancelled' },
};

export default function SupabaseIncomingTasks({
  tasks,
  onClaim,
  onStart,
  onComplete,
  onFail,
}: SupabaseIncomingTasksProps) {
  // Sort tasks: pending first, then claimed, then running, then completed/failed
  const sortedTasks = [...tasks].sort((a, b) => {
    const order: Record<OffloadTaskStatus, number> = {
      pending: 0,
      claimed: 1,
      running: 2,
      completed: 3,
      failed: 4,
      cancelled: 5,
    };
    return order[a.status] - order[b.status];
  });

  if (tasks.length === 0) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-400">Incoming Tasks</span>
        </div>
        <div className="text-center py-4">
          <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No incoming tasks</p>
          <p className="text-[10px] text-gray-600 mt-1">
            Tasks delegated to you will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-300">Incoming Tasks</span>
        </div>
        <span className="text-xs text-gray-500">
          {tasks.filter((t) => t.status === 'pending').length} pending
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {sortedTasks.map((task) => {
            const config = statusConfig[task.status];
            const Icon = config.icon;
            const isPending = task.status === 'pending';
            const isClaimed = task.status === 'claimed';
            const isRunning = task.status === 'running';

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`
                  p-3 rounded-lg border transition-all
                  ${isPending
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : isClaimed
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : isRunning
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-gray-900/50 border-gray-700/30'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded ${isPending ? 'bg-amber-500/20' : 'bg-gray-700/30'}`}>
                    <Icon
                      className={`w-4 h-4 ${config.color} ${isRunning ? 'animate-spin' : ''}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200 truncate">
                        {task.requirement_name}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-medium ${config.color} bg-gray-800`}>
                        {config.label}
                      </span>
                    </div>

                    {task.context_path && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {task.context_path}
                      </p>
                    )}

                    {task.result_summary && (
                      <p className="text-xs text-green-400 mt-1">{task.result_summary}</p>
                    )}

                    {task.error_message && (
                      <p className="text-xs text-red-400 mt-1">{task.error_message}</p>
                    )}
                  </div>
                </div>

                {/* Action buttons based on status */}
                <div className="mt-2 flex gap-2">
                  {isPending && (
                    <button
                      onClick={() => onClaim(task.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded text-xs font-medium text-cyan-400 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      Claim Task
                    </button>
                  )}

                  {isClaimed && (
                    <button
                      onClick={() => onStart(task.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-xs font-medium text-blue-400 transition-all"
                    >
                      <Play className="w-3 h-3" />
                      Start Task
                    </button>
                  )}

                  {isRunning && (
                    <>
                      <button
                        onClick={() => onComplete(task.id, 'Task completed successfully')}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded text-xs font-medium text-green-400 transition-all"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Complete
                      </button>
                      <button
                        onClick={() => onFail(task.id, 'Task failed')}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-xs font-medium text-red-400 transition-all"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
