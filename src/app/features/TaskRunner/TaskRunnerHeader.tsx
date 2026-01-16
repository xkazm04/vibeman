'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Terminal } from 'lucide-react';
import type { ProjectRequirement, TaskRunnerActions } from './lib/types';
import DualBatchPanel from './components/DualBatchPanel';
import { CLIBatchPanel } from '@/components/cli';
import ConfigurationToolbar from './lib/ConfigurationToolbar';
import SessionCleanupPanel from './components/SessionCleanupPanel';
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

type ExecutionMode = 'batch' | 'cli';

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

  // Execution mode toggle (batch vs CLI)
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('taskrunner-mode') as ExecutionMode) || 'batch';
    }
    return 'batch';
  });

  // Persist mode to localStorage
  useEffect(() => {
    localStorage.setItem('taskrunner-mode', executionMode);
  }, [executionMode]);

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
      {/* Session Cleanup Panel - Shows warning for orphaned sessions */}
      <SessionCleanupPanel />

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

      {/* Configuration Toolbar and Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        {/* Configuration Toolbar - only visible in Batch mode */}
        <AnimatePresence mode="wait">
          {executionMode === 'batch' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <ConfigurationToolbar />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 flex justify-end">
          {/* Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <button
              onClick={() => setExecutionMode('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                executionMode === 'batch'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
              title="Batch execution mode"
            >
              <Layers className="w-3.5 h-3.5" />
              Batch
            </button>
            <button
              onClick={() => setExecutionMode('cli')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                executionMode === 'cli'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
              title="CLI session mode"
            >
              <Terminal className="w-3.5 h-3.5" />
              CLI
            </button>
          </div>
        </div>
      </div>

      {/* Execution Panel - Batch or CLI mode */}
      <div className="relative bg-gray-900/40 backdrop-blur-sm border border-gray-800/30 rounded-lg p-4">
        {executionMode === 'batch' ? (
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
            selectedTaskIds={Array.from(selectedRequirements)}
            requirements={requirements}
            getRequirementId={getRequirementId}
          />
        ) : (
          <CLIBatchPanel
            selectedTaskIds={Array.from(selectedRequirements)}
            requirements={requirements}
            getRequirementId={getRequirementId}
            onClearSelection={() => actions.setSelectedRequirements(new Set())}
            onRequirementCompleted={(reqId) => {
              // Remove completed requirement from list
              setRequirements(prev => prev.filter(r => getRequirementId(r) !== reqId));
              // Remove from selected if was selected
              actions.setSelectedRequirements(prev => {
                const newSet = new Set(prev);
                newSet.delete(reqId);
                return newSet;
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
