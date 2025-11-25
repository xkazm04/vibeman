'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckSquare, Square, AlertCircle } from 'lucide-react';
import {
  type BatchId,
  useBatchTasks,
  useOffloadTasks,
  useAvailableBatchesForOffload,
  useBatch,
} from '../store';
import BatchSelectionModal from '@/app/features/Onboarding/sub_Blueprint/components/BatchSelectionModal';

interface TaskOffloadPanelProps {
  sourceBatchId: BatchId;
  onClose?: () => void;
}

/**
 * Task Offload Panel
 *
 * Allows users to move queued tasks from one batch to another
 * Useful for load balancing when one batch has too many tasks
 */
export default function TaskOffloadPanel({ sourceBatchId, onClose }: TaskOffloadPanelProps) {
  const sourceBatch = useBatch(sourceBatchId);
  const tasks = useBatchTasks(sourceBatchId);
  const offloadTasks = useOffloadTasks();
  const availableBatches = useAvailableBatchesForOffload(sourceBatchId);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [targetBatchId, setTargetBatchId] = useState<BatchId | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Filter to only queued tasks (can't offload running/completed tasks)
  const queuedTasks = useMemo(
    () => tasks.filter(task => task.status === 'queued'),
    [tasks]
  );

  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.size === queuedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(queuedTasks.map(t => t.id)));
    }
  };

  const handleSelectBatch = () => {
    if (selectedTaskIds.size === 0) return;
    setShowBatchModal(true);
  };

  const handleBatchSelected = (batchId: BatchId) => {
    setTargetBatchId(batchId);
    setShowBatchModal(false);

    // Immediately offload to selected batch
    offloadTasks(sourceBatchId, batchId, Array.from(selectedTaskIds));

    // Reset selection
    setSelectedTaskIds(new Set());
    setTargetBatchId(null);

    // Close panel if callback provided
    if (onClose) {
      setTimeout(onClose, 300);
    }
  };

  if (!sourceBatch || queuedTasks.length === 0) {
    return (
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="flex items-center gap-2 text-gray-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">No queued tasks available to offload</span>
        </div>
      </div>
    );
  }

  const allSelected = selectedTaskIds.size === queuedTasks.length && queuedTasks.length > 0;
  const canOffload = selectedTaskIds.size > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-500/30 rounded-lg p-4 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-cyan-400">
          Offload Tasks from {sourceBatchId}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            data-testid="close-offload-panel"
          >
            ×
          </button>
        )}
      </div>

      {/* Task Selection */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            Select tasks to offload ({selectedTaskIds.size} selected)
          </span>
          <button
            onClick={handleSelectAll}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            data-testid="select-all-tasks-btn"
          >
            {allSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto bg-gray-900/50 rounded border border-gray-700 p-2">
          {queuedTasks.map(task => (
            <label
              key={task.id}
              className={`
                flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                ${selectedTaskIds.has(task.id)
                  ? 'bg-cyan-500/20 border border-cyan-500/50'
                  : 'hover:bg-gray-700/30 border border-transparent'
                }
              `}
              data-testid={`task-checkbox-${task.id}`}
            >
              <input
                type="checkbox"
                checked={selectedTaskIds.has(task.id)}
                onChange={() => handleToggleTask(task.id)}
                className="w-4 h-4 accent-cyan-500"
              />
              <span className="text-sm text-gray-300 truncate flex-1">{task.id}</span>
              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded">
                {task.status}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Info Message */}
      {availableBatches.length === 0 && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            No available batches. Create a new batch or wait for existing batches to have capacity.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSelectBatch}
          disabled={!canOffload || availableBatches.length === 0}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded font-medium text-sm
            transition-all duration-200
            ${canOffload && availableBatches.length > 0
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/50'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
          data-testid="select-batch-btn"
        >
          <ArrowRight className="w-4 h-4" />
          Select Batch & Offload ({selectedTaskIds.size})
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm"
            data-testid="cancel-offload-btn"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Batch Selection Modal */}
      <BatchSelectionModal
        isOpen={showBatchModal}
        onSelect={handleBatchSelected}
        onCancel={() => setShowBatchModal(false)}
        title="Select Target Batch"
        description={`Choose which batch to move ${selectedTaskIds.size} task${selectedTaskIds.size !== 1 ? 's' : ''} from ${sourceBatchId}`}
      />
    </motion.div>
  );
}

/**
 * Compact Task Offload Button
 * Shows a button that opens the offload panel when clicked
 */
export function TaskOffloadButton({ sourceBatchId }: { sourceBatchId: BatchId }) {
  const [isOpen, setIsOpen] = useState(false);
  const tasks = useBatchTasks(sourceBatchId);
  const queuedTaskCount = tasks.filter(t => t.status === 'queued').length;

  if (queuedTaskCount === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-colors flex items-center gap-1"
        data-testid={`offload-button-${sourceBatchId}`}
      >
        <ArrowRight className="w-3 h-3" />
        Offload ({queuedTaskCount})
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 z-50 w-96"
          >
            <TaskOffloadPanel sourceBatchId={sourceBatchId} onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
