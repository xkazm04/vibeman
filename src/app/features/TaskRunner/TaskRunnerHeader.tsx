'use client';
import { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ProjectRequirement, TaskRunnerActions } from './lib/types';
import DualBatchPanel from './components/DualBatchPanel';
import ConfigurationToolbar from './lib/ConfigurationToolbar';
import { useBlueprintStore } from '@/app/features/Onboarding/sub_Blueprint/store/blueprintStore';
import {
  type BatchId,
  useAllBatches,
  useCreateBatch,
  useStartBatchExecution,
  useBatch,
  useStoreRecovery,
  useOverallProgress,
  useTaskRunnerStore,
} from './store';

interface TaskRunnerHeaderProps {
  selectedCount: number;
  totalCount: number;
  processedCount: number;
  isRunning: boolean;
  error?: string;
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  actions: TaskRunnerActions;
  getRequirementId: (req: ProjectRequirement) => string;
}

export default function TaskRunnerHeader({
  selectedCount,
  totalCount,
  processedCount,
  isRunning,
  error,
  requirements,
  selectedRequirements,
  actions,
  getRequirementId,
}: TaskRunnerHeaderProps) {
  const { setRequirements, setIsRunning, setProcessedCount, setError } = actions;

  // Blueprint store for syncing tasker progress
  const { updateTaskerProgress, resetTaskerProgress } = useBlueprintStore();

  // Store hooks
  const batches = useAllBatches();
  const createBatch = useCreateBatch();
  const startBatchExecution = useStartBatchExecution();

  // Recovery - automatically recover interrupted batches on mount
  useStoreRecovery(requirements);

  // Overall progress tracking
  const overallProgress = useOverallProgress();

  // Sync tasker progress to blueprint store
  useEffect(() => {
    if (overallProgress.total === 0) {
      resetTaskerProgress();
    } else {
      updateTaskerProgress(overallProgress.completed, overallProgress.total);
    }
  }, [overallProgress, updateTaskerProgress, resetTaskerProgress]);

  // ========================================================================
  // Batch Handlers - Now using store actions
  // ========================================================================

  const handleCreateBatch = useCallback((batchId: BatchId) => {
    const selectedReqIds = Array.from(selectedRequirements);
    const batchNumber = batchId.replace('batch', '');

    createBatch(batchId, `Batch ${batchNumber} - ${selectedReqIds.length} tasks`, selectedReqIds);

    // Update requirements to reflect they're in a batch
    setRequirements(prev =>
      prev.map(req => {
        const reqId = getRequirementId(req);
        if (selectedReqIds.includes(reqId)) {
          return { ...req, status: 'queued' as const, batchId };
        }
        return req;
      })
    );

    // Clear selection
    actions.setSelectedRequirements(new Set());
  }, [selectedRequirements, createBatch, setRequirements, getRequirementId, actions]);

  const handleStartBatch = useCallback((batchId: BatchId) => {
    // Start batch and trigger execution
    startBatchExecution(batchId, requirements);

    // Update global running state
    setIsRunning(true);
  }, [startBatchExecution, requirements, setIsRunning]);

  const handlePauseBatch = useCallback((batchId: BatchId) => {
    const store = useTaskRunnerStore.getState();
    store.pauseBatch(batchId);
  }, []);

  const handleResumeBatch = useCallback((batchId: BatchId) => {
    const store = useTaskRunnerStore.getState();
    store.resumeBatch(batchId);

    // Trigger execution after resume
    setTimeout(() => {
      store.executeNextTask(batchId, requirements);
    }, 100);
  }, [requirements]);

  const handleClearBatch = useCallback((batchId: BatchId) => {
    const store = useTaskRunnerStore.getState();
    const batch = store.batches[batchId];

    if (batch) {
      // Reset requirements status to idle and clear batchId
      setRequirements(prev =>
        prev.map(req => {
          const reqId = getRequirementId(req);
          if (batch.taskIds.includes(reqId)) {
            return { ...req, status: 'idle' as const, batchId: undefined };
          }
          return req;
        })
      );

      // Delete batch from store
      store.deleteBatch(batchId);
    }
  }, [setRequirements, getRequirementId]);

  const clearError = () => {
    setError(undefined);
  };

  return (
    <div className="relative space-y-3">
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <X className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 transition-colors"
            data-testid="clear-error-btn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* Configuration Toolbar - Centered */}
      <div className="flex items-center justify-center">
        <ConfigurationToolbar />
      </div>

      {/* Multi-Batch Panel with integrated queues (up to 4 batches) */}
      <div className="relative bg-gray-900/40 backdrop-blur-sm border border-gray-800/30 rounded-lg p-4">
        <DualBatchPanel
          batch1={batches.batch1}
          batch2={batches.batch2}
          batch3={batches.batch3}
          batch4={batches.batch4}
          onStartBatch={handleStartBatch}
          onPauseBatch={handlePauseBatch}
          onResumeBatch={handleResumeBatch}
          onClearBatch={handleClearBatch}
          onCreateBatch={handleCreateBatch}
          selectedCount={selectedCount}
          requirements={requirements}
          getRequirementId={getRequirementId}
        />
      </div>
    </div>
  );
}
