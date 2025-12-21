'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Play, Check, X, Loader2, Clock } from 'lucide-react';
import { useZenStore } from '../../lib/zenStore';
import { useOffloadStore, OffloadTask } from '../lib/offloadStore';
import { pullTasks, updateTaskStatus } from '../lib/offloadApi';

/**
 * Incoming Tasks Component
 * Shows tasks received from active device (Passive device view)
 */
export default function IncomingTasks() {
  const { mode, pairing } = useZenStore();
  const {
    incomingTasks,
    setIncomingTasks,
    addIncomingTask,
    updateIncomingTaskStatus,
    isPulling,
    setIsPulling,
    isPolling,
    setIsPolling,
    pollingIntervalId,
    setPollingIntervalId,
  } = useOffloadStore();

  // Polling for new tasks when in online mode and paired
  useEffect(() => {
    if (mode !== 'online' || pairing.status !== 'paired' || !pairing.partnerUrl) {
      // Stop polling if conditions not met
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setIsPolling(false);
      }
      return;
    }

    // Start polling
    const poll = async () => {
      if (isPulling) return;

      setIsPulling(true);
      try {
        const result = await pullTasks(
          pairing.partnerUrl!,
          pairing.devicePairId!,
          5
        );

        if (result.tasks.length > 0) {
          // Add new tasks
          for (const task of result.tasks) {
            addIncomingTask({
              ...task,
              status: 'synced',
            });
          }
        }
      } catch (err) {
        console.error('[IncomingTasks] Pull error:', err);
      } finally {
        setIsPulling(false);
      }
    };

    // Initial poll
    poll();

    // Set up polling interval (every 5 seconds)
    const intervalId = setInterval(poll, 5000);
    setPollingIntervalId(intervalId);
    setIsPolling(true);

    return () => {
      clearInterval(intervalId);
      setPollingIntervalId(null);
      setIsPolling(false);
    };
  }, [mode, pairing.status, pairing.partnerUrl, pairing.devicePairId]);

  // Only show for online mode when paired
  if (mode !== 'online' || pairing.status !== 'paired') {
    return null;
  }

  const getStatusIcon = (status: OffloadTask['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'synced':
        return <Download className="w-4 h-4 text-blue-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: OffloadTask['status']) => {
    switch (status) {
      case 'pending':
        return 'border-gray-600';
      case 'synced':
        return 'border-blue-500/50';
      case 'running':
        return 'border-yellow-500/50';
      case 'completed':
        return 'border-green-500/50';
      case 'failed':
        return 'border-red-500/50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Incoming Tasks</h3>
        </div>
        {isPolling && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Polling...
          </div>
        )}
      </div>

      {/* Task List */}
      {incomingTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Download className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Waiting for tasks...</p>
          <p className="text-xs">Tasks from the active device will appear here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <AnimatePresence>
            {incomingTasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`
                  flex items-center gap-3 p-3 bg-gray-900/50 rounded border
                  ${getStatusColor(task.status)}
                `}
              >
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {task.requirementName}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {task.status}
                    {task.status === 'running' && ' - Executing...'}
                    {task.status === 'completed' && task.completedAt && (
                      <> - {new Date(task.completedAt).toLocaleTimeString()}</>
                    )}
                  </div>
                </div>
                {task.status === 'synced' && (
                  <button
                    className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded text-green-400 text-xs transition-colors"
                    onClick={() => {
                      // TODO: Trigger execution via TaskRunner
                      updateIncomingTaskStatus(task.id, 'running');
                    }}
                  >
                    <Play className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Stats */}
      {incomingTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700 flex gap-4 text-xs">
          <span className="text-gray-400">
            Pending: {incomingTasks.filter((t) => t.status === 'synced').length}
          </span>
          <span className="text-yellow-400">
            Running: {incomingTasks.filter((t) => t.status === 'running').length}
          </span>
          <span className="text-green-400">
            Done: {incomingTasks.filter((t) => t.status === 'completed').length}
          </span>
          <span className="text-red-400">
            Failed: {incomingTasks.filter((t) => t.status === 'failed').length}
          </span>
        </div>
      )}
    </motion.div>
  );
}
