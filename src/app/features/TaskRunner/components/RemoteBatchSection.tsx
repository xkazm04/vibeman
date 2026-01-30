'use client';

/**
 * Remote Batch Section
 * Container for remote batch management in TaskRunner CLI mode.
 * Shows requirements from remote device and batch status.
 */

import { Package, RefreshCw, Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRemoteTaskRunner } from '../hooks/useRemoteTaskRunner';
import RemoteRequirementCard from './RemoteRequirementCard';
import RemoteBatchMonitor from './RemoteBatchMonitor';

export default function RemoteBatchSection() {
  const {
    targetDeviceName,
    requirements,
    selectedRequirementIds,
    isLoadingRequirements,
    requirementsError,
    activeBatches,
    isLoadingBatches,
    batchError,
    fetchRequirements,
    toggleRequirementSelection,
    selectAllRequirements,
    clearRequirementSelection,
    startBatch,
  } = useRemoteTaskRunner();

  const hasSelection = selectedRequirementIds.length > 0;
  const hasRunningBatches = activeBatches.some(
    (b) => b.status === 'running' || b.status === 'pending'
  );

  const handleStartBatch = async () => {
    if (!hasSelection) return;
    await startBatch(selectedRequirementIds);
  };

  return (
    <div className="mt-4 pt-4 border-t border-emerald-500/20">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-300">
            Remote: {targetDeviceName || 'Unknown Device'}
          </span>
        </div>
        <button
          onClick={fetchRequirements}
          disabled={isLoadingRequirements}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3 h-3 ${isLoadingRequirements ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {(requirementsError || batchError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {requirementsError || batchError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Batch Monitor */}
      {activeBatches.length > 0 && (
        <div className="mb-4">
          <RemoteBatchMonitor batches={activeBatches} isLoading={isLoadingBatches} />
        </div>
      )}

      {/* Requirements List */}
      <div className="space-y-2">
        {/* Selection Controls */}
        {requirements.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllRequirements}
                className="hover:text-emerald-400 transition-colors"
              >
                Select All ({requirements.length})
              </button>
              {hasSelection && (
                <>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={clearRequirementSelection}
                    className="hover:text-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
            <span className="text-emerald-400">
              {selectedRequirementIds.length} selected
            </span>
          </div>
        )}

        {/* Loading State */}
        {isLoadingRequirements && requirements.length === 0 && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading requirements...
          </div>
        )}

        {/* Empty State */}
        {!isLoadingRequirements && requirements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500/50" />
            <p className="text-sm">No pending requirements</p>
            <p className="text-xs mt-1">
              Requirements from {targetDeviceName} will appear here
            </p>
          </div>
        )}

        {/* Requirements Cards */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {requirements.map((req) => (
              <RemoteRequirementCard
                key={req.id}
                requirement={req}
                isSelected={selectedRequirementIds.includes(req.id)}
                onToggle={() => toggleRequirementSelection(req.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Start Batch Button */}
      {requirements.length > 0 && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <span className="text-xs text-gray-500">
            {selectedRequirementIds.length} / {requirements.length} selected
          </span>
          <button
            onClick={handleStartBatch}
            disabled={!hasSelection || isLoadingBatches}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              hasSelection && !isLoadingBatches
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4" />
            Start Remote Batch
          </button>
        </div>
      )}
    </div>
  );
}
