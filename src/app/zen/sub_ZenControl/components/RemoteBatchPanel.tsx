'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  RefreshCw,
  AlertCircle,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import RequirementSelector from './RequirementSelector';
import { useRemoteBatch } from '../hooks/useRemoteBatch';

interface RemoteBatchPanelProps {
  targetDeviceId: string | null;
  targetDeviceName?: string;
}

export default function RemoteBatchPanel({
  targetDeviceId,
  targetDeviceName,
}: RemoteBatchPanelProps) {
  const {
    requirements,
    selectedIds,
    isLoading,
    error,
    batches,
    isLoadingBatches,
    batchError,
    fetchRequirements,
    toggleSelection,
    selectAll,
    clearSelection,
    startBatch,
    clearError,
  } = useRemoteBatch(targetDeviceId);

  const [isStarting, setIsStarting] = useState(false);

  // Fetch requirements when target device changes
  useEffect(() => {
    if (targetDeviceId) {
      fetchRequirements();
    }
  }, [targetDeviceId, fetchRequirements]);

  // Handle start batch
  const handleStartBatch = async () => {
    setIsStarting(true);
    await startBatch();
    setIsStarting(false);
  };

  // No device selected
  if (!targetDeviceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-10 h-10 text-gray-600 mb-3" />
        <p className="text-sm text-gray-400">Select a target device to start batches</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-gray-400">
          Fetching requirements from <span className="text-cyan-300">{targetDeviceName}</span>...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-sm text-red-400 mb-3">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={clearError}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
          >
            Dismiss
          </button>
          <button
            onClick={fetchRequirements}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Active batch indicator
  const activeBatch = batches.find(b => b.status === 'running');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-300">Requirements</h3>
          <span className="text-xs text-gray-500">({requirements.length})</span>
        </div>
        <button
          onClick={fetchRequirements}
          disabled={isLoading}
          className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Active batch warning */}
      {activeBatch && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg"
        >
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-400">
              Batch running: {activeBatch.completed_tasks}/{activeBatch.total_tasks} tasks
            </p>
            {activeBatch.current_task && (
              <p className="text-[10px] text-amber-400/70 truncate">
                Current: {activeBatch.current_task}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Recent batch result */}
      {batches[0] && batches[0].status !== 'running' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            batches[0].status === 'completed'
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}
        >
          {batches[0].status === 'completed' ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
          <p className="text-xs text-gray-300">
            Last batch: {batches[0].completed_tasks}/{batches[0].total_tasks} completed
            {batches[0].failed_tasks > 0 && `, ${batches[0].failed_tasks} failed`}
          </p>
        </motion.div>
      )}

      {/* Batch error */}
      {batchError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-xs text-red-400">{batchError}</p>
          <button
            onClick={clearError}
            className="ml-auto text-[10px] text-red-400/60 hover:text-red-400"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Requirement selector */}
      <RequirementSelector
        requirements={requirements}
        selectedIds={selectedIds}
        onToggle={toggleSelection}
        onSelectAll={selectAll}
        onClearAll={clearSelection}
      />

      {/* Start batch button */}
      <button
        onClick={handleStartBatch}
        disabled={selectedIds.length === 0 || isStarting || !!activeBatch}
        className={`
          w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all
          ${selectedIds.length > 0 && !activeBatch
            ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {isStarting || isLoadingBatches ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Starting batch...</span>
          </>
        ) : activeBatch ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Batch in progress...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span>
              Start Batch {selectedIds.length > 0 && `(${selectedIds.length})`}
            </span>
          </>
        )}
      </button>

      {/* Target device info */}
      <div className="text-center text-[10px] text-gray-600">
        Tasks will execute on <span className="text-cyan-400">{targetDeviceName}</span>
      </div>
    </div>
  );
}
