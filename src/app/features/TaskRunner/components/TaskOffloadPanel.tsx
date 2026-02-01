'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckSquare, Square, AlertCircle, ArrowRightLeft } from 'lucide-react';
import {
  type BatchId,
  useBatchTasks,
  useOffloadTasks,
  useAvailableBatchesForOffload,
  useBatch,
  isTaskQueued,
} from '../store';
import BatchSelectionModal from '@/app/features/Onboarding/sub_Blueprint/components/BatchSelectionModal';
import { useModal } from '@/contexts/ModalContext';

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
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Filter to only queued tasks (can't offload running/completed tasks)
  const queuedTasks = useMemo(
    () => tasks.filter(task => isTaskQueued(task.status)),
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
    setShowBatchModal(false);

    // Immediately offload to selected batch
    offloadTasks(sourceBatchId, batchId, Array.from(selectedTaskIds));

    // Reset selection
    setSelectedTaskIds(new Set());

    // Close panel if callback provided
    if (onClose) {
      setTimeout(onClose, 300);
    }
  };

  if (!sourceBatch || queuedTasks.length === 0) {
    return (
      <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/50 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <AlertCircle className="w-4 h-4 opacity-70" />
          <span className="text-sm">No queued tasks available to offload</span>
        </div>
      </div>
    );
  }

  const allSelected = selectedTaskIds.size === queuedTasks.length && queuedTasks.length > 0;
  const canOffload = selectedTaskIds.size > 0;

  return (
    <div className="space-y-4">
      {/* Task Selection */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            Select tasks to offload ({selectedTaskIds.size} selected)
          </span>
          <button
            onClick={handleSelectAll}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-all duration-200 flex items-center gap-1 hover:scale-105 active:scale-95"
            data-testid="select-all-tasks-btn"
          >
            {allSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto bg-gray-900/50 rounded-lg border border-gray-700/50 p-2 shadow-inner">
          {queuedTasks.map(task => (
            <label
              key={task.id}
              className={`
                flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200
                ${selectedTaskIds.has(task.id)
                  ? 'bg-cyan-500/20 border border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                  : 'hover:bg-gray-700/30 border border-transparent hover:border-gray-600/30'
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
                {task.status.type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Info Message */}
      {availableBatches.length === 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/30 rounded-lg text-xs text-yellow-300 flex items-start gap-2 backdrop-blur-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            No available batches. Create a new batch or wait for existing batches to have capacity.
          </p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleSelectBatch}
        disabled={!canOffload || availableBatches.length === 0}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
          transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
          ${canOffload && availableBatches.length > 0
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
          }
        `}
        data-testid="select-batch-btn"
      >
        <ArrowRight className="w-4 h-4" />
        Select Batch & Offload ({selectedTaskIds.size})
      </button>

      {/* Batch Selection Modal */}
      <BatchSelectionModal
        isOpen={showBatchModal}
        onSelect={handleBatchSelected}
        onCancel={() => setShowBatchModal(false)}
        title="Select Target Batch"
        description={`Choose which batch to move ${selectedTaskIds.size} task${selectedTaskIds.size !== 1 ? 's' : ''} from ${sourceBatchId}`}
      />
    </div>
  );
}

/**
 * Compact Task Offload Button
 * Shows a button that opens the offload panel in a global modal
 */
export function TaskOffloadButton({ sourceBatchId }: { sourceBatchId: BatchId }) {
  const { showModal, hideModal } = useModal();
  const tasks = useBatchTasks(sourceBatchId);
  const queuedTaskCount = tasks.filter(t => isTaskQueued(t.status)).length;

  const handleOpen = useCallback(() => {
    showModal(
      {
        title: `Offload Tasks from ${sourceBatchId}`,
        subtitle: `Move queued tasks to another batch for load balancing`,
        icon: ArrowRightLeft,
        iconBgColor: 'bg-cyan-500/20',
        iconColor: 'text-cyan-400',
        maxWidth: 'max-w-lg',
        showBackdrop: true,
        backdropBlur: true,
      },
      <TaskOffloadPanel sourceBatchId={sourceBatchId} onClose={hideModal} />
    );
  }, [sourceBatchId, showModal, hideModal]);

  if (queuedTaskCount === 0) return null;

  return (
    <button
      onClick={handleOpen}
      className="text-xs px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-md transition-all duration-200 flex items-center gap-1 hover:shadow-sm hover:shadow-cyan-500/20 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
      data-testid={`offload-button-${sourceBatchId}`}
    >
      <ArrowRight className="w-3 h-3" />
      Offload ({queuedTaskCount})
    </button>
  );
}
