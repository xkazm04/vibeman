'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  AlertCircle,
  Pause,
  StopCircle,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Zap,
  FileText,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useRemoteMonitor } from '../hooks/useRemoteMonitor';
import type { RemoteBatchInfo, RemoteEvent } from '@/stores/remoteWorkStore';

interface RemoteMonitorPanelProps {
  targetDeviceId: string | null;
  targetDeviceName?: string;
}

export default function RemoteMonitorPanel({
  targetDeviceId,
  targetDeviceName,
}: RemoteMonitorPanelProps) {
  const {
    batches,
    events,
    isLoadingBatches,
    batchError,
    refreshBatchStatus,
    refreshEvents,
    pauseBatch,
    cancelBatch,
    clearError,
  } = useRemoteMonitor(targetDeviceId, {
    pollInterval: 5000,
    autoPoll: true,
  });

  const [isPausing, setIsPausing] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState<string | null>(null);

  // Handle pause
  const handlePause = async (batchId: string) => {
    setIsPausing(batchId);
    await pauseBatch(batchId);
    setIsPausing(null);
  };

  // Handle cancel
  const handleCancel = async (batchId: string) => {
    setIsCanceling(batchId);
    await cancelBatch(batchId);
    setIsCanceling(null);
  };

  // No device selected
  if (!targetDeviceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="w-10 h-10 text-gray-600 mb-3" />
        <p className="text-sm text-gray-400">Select a target device to monitor batches</p>
      </div>
    );
  }

  // Get active batch (if any)
  const activeBatch = batches.find(b => b.status === 'running' || b.status === 'paused');
  const recentBatches = batches.filter(b => b.status === 'completed' || b.status === 'failed').slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${activeBatch ? 'text-green-400 animate-pulse' : 'text-gray-500'}`} />
          <span className="text-sm font-medium text-gray-300">
            {activeBatch ? 'Active Batch' : 'Monitor'}
          </span>
        </div>
        <button
          onClick={() => {
            refreshBatchStatus();
            refreshEvents();
          }}
          disabled={isLoadingBatches}
          className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingBatches ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error display */}
      {batchError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-xs text-red-400 flex-1">{batchError}</p>
          <button
            onClick={clearError}
            className="text-[10px] text-red-400/60 hover:text-red-400"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Active Batch Card */}
      {activeBatch ? (
        <BatchCard
          batch={activeBatch}
          isPausing={isPausing === activeBatch.batch_id}
          isCanceling={isCanceling === activeBatch.batch_id}
          onPause={() => handlePause(activeBatch.batch_id)}
          onCancel={() => handleCancel(activeBatch.batch_id)}
        />
      ) : (
        <div className="p-6 bg-gray-800/30 border border-gray-700/50 rounded-lg text-center">
          <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No active batches</p>
          <p className="text-xs text-gray-500 mt-1">
            Start a batch from the Batch tab
          </p>
        </div>
      )}

      {/* Recent batches */}
      {recentBatches.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent</h4>
          {recentBatches.map(batch => (
            <CompactBatchCard key={batch.batch_id} batch={batch} />
          ))}
        </div>
      )}

      {/* Event Feed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event Feed</h4>
          <button
            onClick={refreshEvents}
            className="text-[10px] text-gray-500 hover:text-gray-400"
          >
            Refresh
          </button>
        </div>
        <EventFeed events={events} />
      </div>

      {/* Target info */}
      <div className="text-center text-[10px] text-gray-600">
        Monitoring <span className="text-green-400">{targetDeviceName}</span>
      </div>
    </div>
  );
}

/**
 * Active batch card with progress and controls
 */
function BatchCard({
  batch,
  isPausing,
  isCanceling,
  onPause,
  onCancel,
}: {
  batch: RemoteBatchInfo;
  isPausing: boolean;
  isCanceling: boolean;
  onPause: () => void;
  onCancel: () => void;
}) {
  const progress = batch.total_tasks > 0
    ? Math.round((batch.completed_tasks / batch.total_tasks) * 100)
    : 0;

  const isRunning = batch.status === 'running';
  const isPaused = batch.status === 'paused';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        p-4 rounded-lg border
        ${isRunning
          ? 'bg-green-500/5 border-green-500/30'
          : 'bg-amber-500/5 border-amber-500/30'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
          ) : (
            <Pause className="w-4 h-4 text-amber-400" />
          )}
          <span className="text-sm font-medium text-gray-200">
            Session {batch.session_id || batch.batch_id.slice(-4)}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isRunning
              ? 'bg-green-500/20 text-green-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}>
            {batch.status}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {isRunning && (
            <button
              onClick={onPause}
              disabled={isPausing}
              className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded transition-colors disabled:opacity-50"
              title="Pause batch"
            >
              {isPausing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>
          )}
          {isPaused && (
            <button
              onClick={onPause}
              disabled={isPausing}
              className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition-colors disabled:opacity-50"
              title="Resume batch"
            >
              {isPausing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={isCanceling}
            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
            title="Cancel batch"
          >
            {isCanceling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <StopCircle className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${isRunning ? 'bg-green-500' : 'bg-amber-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          {batch.completed_tasks} / {batch.total_tasks} tasks
        </span>
        {batch.failed_tasks > 0 && (
          <span className="text-red-400">{batch.failed_tasks} failed</span>
        )}
        <span className="text-gray-500">{progress}%</span>
      </div>

      {/* Current task */}
      {batch.current_task && (
        <div className="mt-2 pt-2 border-t border-gray-700/50">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ChevronRight className="w-3 h-3 text-green-400" />
            <span className="truncate">{batch.current_task}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Compact batch card for recent batches
 */
function CompactBatchCard({ batch }: { batch: RemoteBatchInfo }) {
  const isCompleted = batch.status === 'completed';

  return (
    <div className={`
      flex items-center gap-2 px-3 py-2 rounded-lg
      ${isCompleted
        ? 'bg-gray-800/30 border border-gray-700/30'
        : 'bg-red-500/5 border border-red-500/20'
      }
    `}>
      {isCompleted ? (
        <CheckCircle className="w-4 h-4 text-green-400" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}
      <span className="text-xs text-gray-400 flex-1">
        Session {batch.session_id || batch.batch_id.slice(-4)}
      </span>
      <span className="text-xs text-gray-500">
        {batch.completed_tasks}/{batch.total_tasks}
      </span>
      {batch.failed_tasks > 0 && (
        <span className="text-[10px] text-red-400">
          {batch.failed_tasks} failed
        </span>
      )}
    </div>
  );
}

/**
 * Event feed component
 */
function EventFeed({ events }: { events: RemoteEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="p-4 bg-gray-800/20 border border-gray-700/30 rounded-lg text-center">
        <Zap className="w-6 h-6 text-gray-600 mx-auto mb-1" />
        <p className="text-xs text-gray-500">No recent events</p>
      </div>
    );
  }

  return (
    <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
      <AnimatePresence mode="popLayout">
        {events.slice(0, 15).map(event => (
          <EventItem key={event.id} event={event} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Single event item
 */
function EventItem({ event }: { event: RemoteEvent }) {
  const eventConfig = getEventConfig(event.event_type);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-2 px-2 py-1.5 bg-gray-800/20 rounded text-xs"
    >
      <span className="text-gray-600 font-mono">{formatTime(event.created_at)}</span>
      <span className={eventConfig.color}>{eventConfig.icon}</span>
      <span className="text-gray-400 truncate flex-1">
        {eventConfig.label}
        {event.payload?.name != null && (
          <span className="text-gray-500">: {String(event.payload.name)}</span>
        )}
      </span>
    </motion.div>
  );
}

/**
 * Get event display configuration
 */
function getEventConfig(eventType: string): { icon: string; label: string; color: string } {
  const configs: Record<string, { icon: string; label: string; color: string }> = {
    batch_started: { icon: '▶', label: 'Batch started', color: 'text-green-400' },
    batch_completed: { icon: '✓', label: 'Batch completed', color: 'text-green-400' },
    batch_failed: { icon: '✗', label: 'Batch failed', color: 'text-red-400' },
    batch_paused: { icon: '⏸', label: 'Batch paused', color: 'text-amber-400' },
    task_started: { icon: '→', label: 'Task started', color: 'text-cyan-400' },
    task_completed: { icon: '✓', label: 'Task completed', color: 'text-green-400' },
    task_failed: { icon: '✗', label: 'Task failed', color: 'text-red-400' },
    direction_accepted: { icon: '✓', label: 'Direction accepted', color: 'text-purple-400' },
    direction_rejected: { icon: '✗', label: 'Direction rejected', color: 'text-orange-400' },
    requirement_created: { icon: '+', label: 'Requirement created', color: 'text-cyan-400' },
  };

  return configs[eventType] || { icon: '•', label: eventType, color: 'text-gray-400' };
}
