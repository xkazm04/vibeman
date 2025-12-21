'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  CheckCircle2,
  Loader2,
  Clock,
  XCircle,
  X,
  RefreshCw,
  Monitor
} from 'lucide-react';
import { useZenStore } from '@/app/zen/lib/zenStore';
import { getTaskStatus } from '@/app/zen/sub_ZenControl/lib/offloadApi';

export type RemoteBatchId = 'remoteBatch1' | 'remoteBatch2' | 'remoteBatch3' | 'remoteBatch4';

export interface RemoteTask {
  id: string;
  requirementName: string;
  status: 'pending' | 'synced' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  resultSummary?: string;
  errorMessage?: string;
}

export interface RemoteBatchState {
  id: string;
  name: string;
  tasks: RemoteTask[];
  deviceName: string;
  createdAt: number;
}

interface RemoteBatchDisplayProps {
  batch: RemoteBatchState;
  batchId: RemoteBatchId;
  onClear: (batchId: RemoteBatchId) => void;
}

const getStatusIcon = (status: RemoteTask['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-3 h-3 text-gray-400" />;
    case 'synced':
      return <Wifi className="w-3 h-3 text-blue-400" />;
    case 'running':
      return <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />;
    case 'completed':
      return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    case 'failed':
      return <XCircle className="w-3 h-3 text-red-400" />;
    default:
      return null;
  }
};

const getStatusColor = (status: RemoteTask['status']) => {
  switch (status) {
    case 'running':
      return 'border-purple-500/50 bg-purple-500/10';
    case 'completed':
      return 'border-emerald-500/50 bg-emerald-500/10';
    case 'failed':
      return 'border-red-500/50 bg-red-500/10';
    case 'synced':
      return 'border-blue-500/50 bg-blue-500/10';
    default:
      return 'border-gray-600/50 bg-gray-700/10';
  }
};

/**
 * Remote Batch Display Component
 * Shows status of batches delegated to remote device
 * Uses purple color scheme to differentiate from local batches
 */
export default function RemoteBatchDisplay({
  batch,
  batchId,
  onClear,
}: RemoteBatchDisplayProps) {
  const { pairing } = useZenStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tasks, setTasks] = useState<RemoteTask[]>(batch.tasks);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Calculate stats
  const stats = {
    pending: tasks.filter(t => t.status === 'pending' || t.status === 'synced').length,
    running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    total: tasks.length,
  };

  const progress = stats.total > 0
    ? ((stats.completed + stats.failed) / stats.total) * 100
    : 0;

  const isRunning = stats.running > 0 || stats.pending > 0;
  const isCompleted = stats.completed + stats.failed === stats.total && stats.total > 0;

  // Refresh status from remote
  const refreshStatus = async () => {
    if (!pairing.partnerUrl || !pairing.devicePairId) return;

    setIsRefreshing(true);
    try {
      const result = await getTaskStatus(pairing.partnerUrl, pairing.devicePairId);

      // Match tasks by requirementName
      const updatedTasks = tasks.map(task => {
        const remoteTask = result.tasks.find(rt => rt.requirementName === task.requirementName);
        if (remoteTask) {
          return {
            ...task,
            status: remoteTask.status as RemoteTask['status'],
            startedAt: remoteTask.startedAt || undefined,
            completedAt: remoteTask.completedAt || undefined,
            resultSummary: remoteTask.resultSummary || undefined,
            errorMessage: remoteTask.errorMessage || undefined,
          };
        }
        return task;
      });

      setTasks(updatedTasks);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to refresh remote status:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Poll for updates while batch is running
  useEffect(() => {
    if (!isRunning || !pairing.partnerUrl) return;

    // Initial fetch
    refreshStatus();

    // Poll every 10 seconds
    const intervalId = setInterval(refreshStatus, 10000);

    return () => clearInterval(intervalId);
  }, [isRunning, pairing.partnerUrl, pairing.devicePairId]);

  // Show running/pending items + last completed/failed
  const displayItems = [
    ...tasks.filter(t => t.status === 'running'),
    ...tasks.filter(t => t.status === 'synced' || t.status === 'pending'),
    ...tasks.filter(t => t.status === 'completed').slice(-2),
    ...tasks.filter(t => t.status === 'failed').slice(-2),
  ].slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className={`relative bg-purple-900/20 border rounded-lg overflow-hidden ${
        isRunning
          ? 'border-purple-500/50 shadow-sm shadow-purple-500/20'
          : isCompleted
          ? 'border-green-500/50 shadow-sm shadow-green-500/20'
          : 'border-purple-700/50'
      }`}>
        {/* Animated background for running state */}
        {isRunning && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 animate-pulse" />
        )}

        <div className="relative p-3 flex items-center gap-4">
          {/* Left Side: Batch Info */}
          <div className="w-64 flex-shrink-0 space-y-2">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-purple-400" />
                <h3 className="text-xs font-semibold text-purple-300">
                  Remote: {batch.deviceName}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={refreshStatus}
                  disabled={isRefreshing}
                  className="p-1 hover:bg-purple-500/20 rounded transition-colors text-gray-400 hover:text-purple-400"
                  title="Refresh status"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => onClear(batchId)}
                  className="p-1 hover:bg-red-500/10 rounded transition-colors text-gray-400 hover:text-red-400"
                  title="Clear remote batch"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {isRunning && (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-[10px] text-purple-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Processing on remote...</span>
                </div>
              )}
              {isCompleted && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-[10px] text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Completed</span>
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                {stats.pending}
              </span>
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 text-purple-400" />
                {stats.running}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {stats.completed}
              </span>
              {stats.failed > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-400" />
                  {stats.failed}
                </span>
              )}
            </div>

            {/* Last update */}
            {lastUpdate && (
              <div className="text-[9px] text-gray-600">
                Updated {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Right Side: Progress and Tasks */}
          <div className="flex-1 min-w-0 border-l border-purple-700/30 pl-4 space-y-2">
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className={`h-full ${
                    isCompleted
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className={isRunning ? 'text-purple-400 font-medium' : 'text-gray-500'}>
                  {stats.completed + stats.failed} / {stats.total}
                </span>
                <span className="text-gray-500">{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Task Items */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-purple-900">
              <AnimatePresence mode="popLayout">
                {displayItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className={`
                      relative flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded border
                      transition-all duration-200
                      ${getStatusColor(item.status)}
                      min-w-[120px] max-w-[160px]
                    `}
                    title={`${item.requirementName} - ${item.status}`}
                  >
                    <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-gray-300 truncate">
                        {item.requirementName}
                      </div>
                      <div className="text-[8px] text-gray-500 truncate capitalize">
                        {item.status}
                      </div>
                    </div>

                    {/* Running pulse effect */}
                    {item.status === 'running' && (
                      <motion.div
                        className="absolute inset-0 rounded border border-purple-500/30"
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                          scale: [1, 1.01, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Show indicator if there are more items */}
              {tasks.length > displayItems.length && (
                <div className="flex-shrink-0 text-[9px] text-purple-600 font-medium px-2">
                  +{tasks.length - displayItems.length} more
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
