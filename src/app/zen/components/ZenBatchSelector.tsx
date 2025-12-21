'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Play, Pause, Square } from 'lucide-react';
import { useZenStore } from '../lib/zenStore';
import { useTaskRunnerStore, BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';

const BATCH_LABELS: Record<BatchId, string> = {
  batch1: 'Batch A',
  batch2: 'Batch B',
  batch3: 'Batch C',
  batch4: 'Batch D',
};

export default function ZenBatchSelector() {
  const { selectedBatchId, selectBatch, updateStats } = useZenStore();
  const { batches, getBatchProgress } = useTaskRunnerStore();
  const [isOpen, setIsOpen] = React.useState(false);

  // Get available batches (non-null)
  const availableBatches = React.useMemo(() => {
    return (Object.keys(batches) as BatchId[])
      .filter((id) => batches[id] !== null)
      .map((id) => ({
        id,
        name: batches[id]?.name || BATCH_LABELS[id],
        status: batches[id]?.status,
        progress: getBatchProgress(id),
      }));
  }, [batches, getBatchProgress]);

  // Update stats when batch selection changes
  React.useEffect(() => {
    if (selectedBatchId) {
      const progress = getBatchProgress(selectedBatchId);
      updateStats({
        completed: progress.completed,
        failed: progress.failed,
        pending: progress.total - progress.completed - progress.failed,
      });
    }
  }, [selectedBatchId, getBatchProgress, updateStats]);

  const selectedBatch = selectedBatchId ? batches[selectedBatchId] : null;
  const selectedProgress = selectedBatchId ? getBatchProgress(selectedBatchId) : null;

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'running':
        return <Play className="w-3 h-3 text-green-400" />;
      case 'paused':
        return <Pause className="w-3 h-3 text-yellow-400" />;
      case 'completed':
        return <Square className="w-3 h-3 text-blue-400" />;
      default:
        return <Square className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-gray-800/60 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {selectedBatch ? (
          <>
            {getStatusIcon(selectedBatch.status?.type)}
            <span className="text-white font-medium">
              {selectedBatch.name || BATCH_LABELS[selectedBatchId!]}
            </span>
            {selectedProgress && (
              <span className="text-gray-400 text-sm">
                {selectedProgress.completed}/{selectedProgress.total}
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-400">Select Batch</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Dropdown */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50"
        >
          {availableBatches.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No active batches
            </div>
          ) : (
            availableBatches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => {
                  selectBatch(batch.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors ${
                  batch.id === selectedBatchId ? 'bg-gray-700/30' : ''
                }`}
              >
                {getStatusIcon(batch.status?.type)}
                <span className="flex-1 text-left text-white">{batch.name}</span>
                <span className="text-gray-400 text-sm">
                  {batch.progress.completed}/{batch.progress.total}
                </span>
              </button>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
