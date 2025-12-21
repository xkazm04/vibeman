'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Check, X, Loader2, Clock, RefreshCw } from 'lucide-react';
import { useZenStore } from '../../lib/zenStore';
import { useOffloadStore, OffloadTask } from '../lib/offloadStore';
import { getTaskStatus } from '../lib/offloadApi';

/**
 * Remote Status Component
 * Shows status of tasks offloaded to passive device (Active device view)
 */
export default function RemoteStatus() {
  const { mode, pairing } = useZenStore();
  const { remoteStatus, setRemoteStatus } = useOffloadStore();
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    synced: 0,
    running: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });

  // Fetch remote status
  const fetchStatus = async () => {
    if (!pairing.partnerUrl || !pairing.devicePairId) return;

    setIsLoading(true);
    try {
      const result = await getTaskStatus(pairing.partnerUrl, pairing.devicePairId);

      setRemoteStatus(
        result.tasks.map((t) => ({
          id: t.id,
          requirementName: t.requirementName,
          requirementContent: '',
          priority: 5,
          status: t.status as OffloadTask['status'],
          startedAt: t.startedAt || undefined,
          completedAt: t.completedAt || undefined,
          resultSummary: t.resultSummary || undefined,
          errorMessage: t.errorMessage || undefined,
        }))
      );
      setStats(result.stats);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('[RemoteStatus] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for status updates when paired
  useEffect(() => {
    if (pairing.status !== 'paired' || !pairing.partnerUrl) {
      return;
    }

    // Initial fetch
    fetchStatus();

    // Poll every 10 seconds
    const intervalId = setInterval(fetchStatus, 10000);

    return () => clearInterval(intervalId);
  }, [pairing.status, pairing.partnerUrl, pairing.devicePairId]);

  // Only show for offline mode (active device) when paired
  if (mode !== 'offline' || pairing.status !== 'paired') {
    return null;
  }

  const getStatusIcon = (status: OffloadTask['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'synced':
        return <Activity className="w-4 h-4 text-blue-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-400" />;
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
          <Activity className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Remote Execution</h3>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchStatus}
            disabled={isLoading}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats.total > 0 && (
        <div className="mb-4 grid grid-cols-5 gap-2">
          <div className="text-center p-2 bg-gray-900/50 rounded">
            <div className="text-lg font-bold text-gray-400">{stats.pending}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="text-center p-2 bg-gray-900/50 rounded">
            <div className="text-lg font-bold text-blue-400">{stats.synced}</div>
            <div className="text-xs text-gray-500">Synced</div>
          </div>
          <div className="text-center p-2 bg-gray-900/50 rounded">
            <div className="text-lg font-bold text-yellow-400">{stats.running}</div>
            <div className="text-xs text-gray-500">Running</div>
          </div>
          <div className="text-center p-2 bg-gray-900/50 rounded">
            <div className="text-lg font-bold text-green-400">{stats.completed}</div>
            <div className="text-xs text-gray-500">Done</div>
          </div>
          <div className="text-center p-2 bg-gray-900/50 rounded">
            <div className="text-lg font-bold text-red-400">{stats.failed}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
        </div>
      )}

      {/* Task List */}
      {remoteStatus.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No tasks offloaded yet</p>
          <p className="text-xs">Use TaskRunner to offload tasks to "{pairing.partnerDeviceName}"</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <AnimatePresence>
            {remoteStatus.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-2 bg-gray-900/50 rounded"
              >
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {task.requirementName}
                  </div>
                </div>
                <span
                  className={`
                    text-xs px-2 py-0.5 rounded capitalize
                    ${
                      task.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : task.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : task.status === 'running'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-700 text-gray-400'
                    }
                  `}
                >
                  {task.status}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
