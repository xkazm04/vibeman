'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, CheckCircle2, Loader2, Plus, X, Zap, Clock, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import type { BatchState, BatchId } from '../store';
import {
  useAutoExecution,
  useExecutionMonitor,
  isBatchRunning,
  isBatchPaused,
  isBatchCompleted,
  // ProjectRequirement status helpers
  isRequirementQueued,
  isRequirementRunning,
  isRequirementCompleted,
  isRequirementFailed,
  // Remote batch
  useRemoteBatchStore,
  useAllRemoteBatches,
} from '../store';
import type { ProjectRequirement } from '../lib/types';
import { TaskOffloadButton } from './TaskOffloadPanel';
import DelegateBatchButton from './DelegateBatchButton';
import RemoteBatchDisplay, { RemoteBatchId } from './RemoteBatchDisplay';
import { useZenStore } from '@/app/zen/lib/zenStore';

interface DualBatchPanelProps {
  batch1: BatchState | null;
  batch2: BatchState | null;
  batch3?: BatchState | null;
  batch4?: BatchState | null;
  onStartBatch: (batchId: BatchId) => void;
  onPauseBatch: (batchId: BatchId) => void;
  onResumeBatch: (batchId: BatchId) => void;
  onClearBatch: (batchId: BatchId) => void;
  onCreateBatch: (batchId: BatchId) => void;
  selectedCount: number;
  requirements: ProjectRequirement[];
  getRequirementId: (req: ProjectRequirement) => string;
}

const getStatusIcon = (status: ProjectRequirement['status']) => {
  switch (status) {
    case 'running':
      return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
    case 'completed':
      return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    case 'failed':
    case 'session-limit':
      return <XCircle className="w-3 h-3 text-red-400" />;
    case 'queued':
      return <Clock className="w-3 h-3 text-amber-400" />;
    default:
      return null;
  }
};

const getStatusColor = (status: ProjectRequirement['status']) => {
  switch (status) {
    case 'running':
      return 'border-blue-500/50 bg-blue-500/10';
    case 'completed':
      return 'border-emerald-500/50 bg-emerald-500/10';
    case 'failed':
    case 'session-limit':
      return 'border-red-500/50 bg-red-500/10';
    case 'queued':
      return 'border-amber-500/50 bg-amber-500/10';
    default:
      return 'border-gray-600/50 bg-gray-700/10';
  }
};

/**
 * Single Batch Display Component with Auto-Execution
 */
function BatchDisplay({
  batch,
  batchId,
  label,
  requirements,
  getRequirementId,
  onStartBatch,
  onPauseBatch,
  onResumeBatch,
  onClearBatch,
  onCreateBatch,
  selectedCount,
  onDelegated,
}: {
  batch: BatchState | null;
  batchId: BatchId;
  label: string;
  requirements: ProjectRequirement[];
  getRequirementId: (req: ProjectRequirement) => string;
  onStartBatch: (batchId: BatchId) => void;
  onPauseBatch: (batchId: BatchId) => void;
  onResumeBatch: (batchId: BatchId) => void;
  onClearBatch: (batchId: BatchId) => void;
  onCreateBatch: (batchId: BatchId) => void;
  selectedCount: number;
  onDelegated?: (batchId: BatchId, remoteBatchId: string) => void;
}) {
  // Auto-execution hooks - will automatically execute tasks when batch is running
  useAutoExecution(batchId, requirements);
  useExecutionMonitor(batchId, requirements);

  // Helper to get queue items for this batch
  const getBatchQueueItems = () => {
    if (!batch) return [];
    return requirements.filter((r) => batch.taskIds.includes(getRequirementId(r)));
  };

  const queueItems = getBatchQueueItems();
  const queuedCount = queueItems.filter(r => isRequirementQueued(r.status)).length;
  const runningCount = queueItems.filter(r => isRequirementRunning(r.status)).length;
  const completedCount = queueItems.filter(r => isRequirementCompleted(r.status)).length;
  const failedCount = queueItems.filter(r => isRequirementFailed(r.status)).length;

  if (!batch) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="relative bg-gray-800/30 border border-dashed border-gray-700/50 rounded-lg p-3 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700/20 rounded-lg">
                <Plus className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400">{label}</h3>
                <p className="text-[10px] text-gray-600">Select tasks and create batch</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onCreateBatch(batchId)}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded text-xs font-medium text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              data-testid={`create-batch-${batchId}-btn`}
            >
              Create from {selectedCount} selected
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  const progress = batch.taskIds.length > 0
    ? (batch.completedCount / batch.taskIds.length) * 100
    : 0;
  const isRunning = isBatchRunning(batch.status);
  const isPaused = isBatchPaused(batch.status);
  const isCompleted = isBatchCompleted(batch.status);

  // Show running/queued items + last 3 completed/failed
  const displayItems = [
    ...queueItems.filter(r => isRequirementRunning(r.status)),
    ...queueItems.filter(r => isRequirementQueued(r.status)),
    ...queueItems.filter(r => isRequirementCompleted(r.status)).slice(-2),
    ...queueItems.filter(r => isRequirementFailed(r.status)).slice(-2),
  ].slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className={`relative bg-gray-800/40 border rounded-lg overflow-hidden ${
        isRunning
          ? 'border-blue-500/50 shadow-sm shadow-blue-500/20'
          : isPaused
          ? 'border-amber-500/50 shadow-sm shadow-amber-500/20'
          : isCompleted
          ? 'border-green-500/50 shadow-sm shadow-green-500/20'
          : 'border-gray-700/50'
      }`}>
        {/* Static background highlight for running state - removed animate-pulse for performance */}
        {isRunning && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-blue-500/5" />
        )}

        <div className="relative p-3 flex items-center gap-4">
          {/* Left Side: Batch Info and Controls */}
          <div className="w-64 flex-shrink-0 space-y-2">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isRunning && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                {isPaused && <Pause className="w-3.5 h-3.5 text-amber-400" />}
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                {!isRunning && !isPaused && !isCompleted && <Zap className="w-3.5 h-3.5 text-gray-400" />}
                <h3 className="text-xs font-semibold text-white">{label}</h3>
              </div>
              <div className="flex items-center gap-1">
                {/* Task Offload Button - Move to local batch */}
                <TaskOffloadButton sourceBatchId={batchId} />
                {/* Delegate Button - Send to remote device */}
                {batch && (
                  <DelegateBatchButton
                    batchId={batchId}
                    batch={batch}
                    requirements={requirements.map(r => ({
                      projectId: r.projectId,
                      projectName: r.projectName,
                      projectPath: r.projectPath,
                      requirementName: r.requirementName,
                    }))}
                    onDelegated={(remoteBatchId) => onDelegated?.(batchId, remoteBatchId)}
                  />
                )}
                <button
                  onClick={() => onClearBatch(batchId)}
                  className="p-1 hover:bg-red-500/10 rounded transition-colors text-gray-400 hover:text-red-400"
                  title="Clear batch"
                  data-testid={`clear-batch-${batchId}-btn`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {(!isRunning && !isPaused && !isCompleted) && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onStartBatch(batchId)}
                  className="flex-1 px-2 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded text-[10px] font-medium transition-all shadow-sm shadow-cyan-500/20 flex items-center justify-center gap-1"
                  data-testid={`start-batch-${batchId}-btn`}
                >
                  <Play className="w-3 h-3" />
                  <span>Start</span>
                </motion.button>
              )}

              {isRunning && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onPauseBatch(batchId)}
                  className="flex-1 px-2 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1"
                  data-testid={`pause-batch-${batchId}-btn`}
                >
                  <Pause className="w-3 h-3" />
                  <span>Pause</span>
                </motion.button>
              )}

              {isPaused && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onResumeBatch(batchId)}
                  className="flex-1 px-2 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded text-[10px] font-medium transition-all shadow-sm shadow-cyan-500/20 flex items-center justify-center gap-1"
                  data-testid={`resume-batch-${batchId}-btn`}
                >
                  <Play className="w-3 h-3" />
                  <span>Resume</span>
                </motion.button>
              )}

              {isCompleted && (
                <div className="flex-1 px-2 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-[10px] font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Completed</span>
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                {queuedCount}
              </span>
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 text-blue-400" />
                {runningCount}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {completedCount}
              </span>
              {failedCount > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-400" />
                  {failedCount}
                </span>
              )}
            </div>
          </div>

          {/* Right Side: Progress Bar and Queue Items */}
          <div className="flex-1 min-w-0 border-l border-gray-700/30 pl-4 space-y-2">
            {/* Progress Bar - Full Width */}
            <div className="space-y-1">
              <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className={`h-full ${
                    isCompleted
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className={isRunning ? 'text-blue-400 font-medium' : 'text-gray-500'}>
                  {batch.completedCount} / {batch.taskIds.length}
                </span>
                <span className="text-gray-500">{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Queue Items */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
              <AnimatePresence mode="popLayout">
                {displayItems.map((item) => {
                  const itemId = getRequirementId(item);
                  return (
                    <motion.div
                      key={itemId}
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className={`
                        relative flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded border
                        transition-all duration-200
                        ${getStatusColor(item.status)}
                        min-w-[120px] max-w-[160px]
                      `}
                      title={`${item.projectName} / ${item.requirementName}`}
                    >
                      {/* Status Icon */}
                      <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-gray-300 truncate">
                          {item.requirementName}
                        </div>
                        <div className="text-[8px] text-gray-500 truncate">
                          {item.projectName}
                        </div>
                      </div>

                      {/* Running indicator - using CSS animation instead of Framer Motion */}
                      {isRequirementRunning(item.status) && (
                        <div className="absolute inset-0 rounded border border-blue-500/40 animate-pulse" />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Show indicator if there are more items */}
              {queueItems.length > displayItems.length && (
                <div className="flex-shrink-0 text-[9px] text-gray-600 font-medium px-2">
                  +{queueItems.length - displayItems.length} more
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DualBatchPanel({
  batch1,
  batch2,
  batch3,
  batch4,
  onStartBatch,
  onPauseBatch,
  onResumeBatch,
  onClearBatch,
  onCreateBatch,
  selectedCount,
  requirements,
  getRequirementId,
}: DualBatchPanelProps) {
  // Remote batch state
  const remoteBatches = useAllRemoteBatches();
  const { createRemoteBatch, clearRemoteBatch, getNextAvailableRemoteBatchId } = useRemoteBatchStore();
  const { pairing } = useZenStore();

  // Handle batch delegation to remote device
  const handleDelegated = (sourceBatchId: BatchId, remoteBatchId: string) => {
    const nextRemoteBatchId = getNextAvailableRemoteBatchId();
    if (!nextRemoteBatchId) {
      console.warn('No available remote batch slots');
      return;
    }

    // Get the source batch to extract tasks
    const sourceBatch = { batch1, batch2, batch3, batch4 }[sourceBatchId];
    if (!sourceBatch) return;

    // Get requirements for the delegated tasks
    const delegatedTasks = sourceBatch.taskIds.map(taskId => {
      const [projectId, reqName] = taskId.includes(':') ? taskId.split(':') : [null, taskId];
      const req = requirements.find(r =>
        projectId ? r.projectId === projectId && r.requirementName === reqName : r.requirementName === reqName
      );
      return {
        id: taskId,
        requirementName: req?.requirementName || reqName || taskId,
      };
    });

    // Create remote batch
    createRemoteBatch(
      nextRemoteBatchId,
      pairing.partnerDeviceName || 'Remote Device',
      delegatedTasks
    );

    // Clear the source batch since tasks are delegated
    onClearBatch(sourceBatchId);
  };

  // Auto-reset completed batches after 3 seconds
  useEffect(() => {
    const batches = [
      { batch: batch1, id: 'batch1' as BatchId },
      { batch: batch2, id: 'batch2' as BatchId },
      { batch: batch3, id: 'batch3' as BatchId },
      { batch: batch4, id: 'batch4' as BatchId },
    ];

    batches.forEach(({ batch, id }) => {
      if (batch && isBatchCompleted(batch.status)) {
        const timer = setTimeout(() => {
          onClearBatch(id);
        }, 3000);
        return () => clearTimeout(timer);
      }
    });
  }, [batch1, batch2, batch3, batch4, onClearBatch]);

  // Determine which batches to show based on running state
  const anyBatchRunning = [batch1, batch2, batch3, batch4].some(
    (b: BatchState | null | undefined) => b && isBatchRunning(b.status)
  );

  // Show batch2 if: batch1 is running, batch2 exists, or any batch is running
  const showBatch2 = (batch1 && isBatchRunning(batch1.status)) || batch2 !== null || anyBatchRunning;

  // Show batch3 if: any batch is running or batch3 exists
  const showBatch3 = anyBatchRunning || batch3 !== null;

  // Show batch4 if: any batch is running or batch4 exists
  const showBatch4 = anyBatchRunning || batch4 !== null;

  // Check if there are any remote batches to show
  const hasRemoteBatches = Object.values(remoteBatches).some(b => b !== null);
  const remoteBatchIds: RemoteBatchId[] = ['remoteBatch1', 'remoteBatch2', 'remoteBatch3', 'remoteBatch4'];

  return (
    <div className="space-y-3 w-full">
      {/* Batch 1 - Always shown */}
      <BatchDisplay
        batch={batch1}
        batchId="batch1"
        label="Batch 1"
        requirements={requirements}
        getRequirementId={getRequirementId}
        onStartBatch={onStartBatch}
        onPauseBatch={onPauseBatch}
        onResumeBatch={onResumeBatch}
        onClearBatch={onClearBatch}
        onCreateBatch={onCreateBatch}
        selectedCount={selectedCount}
        onDelegated={handleDelegated}
      />

      {/* Batch 2 - Show when conditions met */}
      {showBatch2 && (
        <BatchDisplay
          batch={batch2}
          batchId="batch2"
          label="Batch 2"
          requirements={requirements}
          getRequirementId={getRequirementId}
          onStartBatch={onStartBatch}
          onPauseBatch={onPauseBatch}
          onResumeBatch={onResumeBatch}
          onClearBatch={onClearBatch}
          onCreateBatch={onCreateBatch}
          selectedCount={selectedCount}
          onDelegated={handleDelegated}
        />
      )}

      {/* Batch 3 - Show when conditions met */}
      {showBatch3 && (
        <BatchDisplay
          batch={batch3 ?? null}
          batchId="batch3"
          label="Batch 3"
          requirements={requirements}
          getRequirementId={getRequirementId}
          onStartBatch={onStartBatch}
          onPauseBatch={onPauseBatch}
          onResumeBatch={onResumeBatch}
          onClearBatch={onClearBatch}
          onCreateBatch={onCreateBatch}
          selectedCount={selectedCount}
          onDelegated={handleDelegated}
        />
      )}

      {/* Batch 4 - Show when conditions met */}
      {showBatch4 && (
        <BatchDisplay
          batch={batch4 ?? null}
          batchId="batch4"
          label="Batch 4"
          requirements={requirements}
          getRequirementId={getRequirementId}
          onStartBatch={onStartBatch}
          onPauseBatch={onPauseBatch}
          onResumeBatch={onResumeBatch}
          onClearBatch={onClearBatch}
          onCreateBatch={onCreateBatch}
          selectedCount={selectedCount}
          onDelegated={handleDelegated}
        />
      )}

      {/* Remote Batches Section - Delegated to paired device */}
      {hasRemoteBatches && (
        <>
          <div className="pt-2 border-t border-purple-700/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">
                Delegated to Remote
              </span>
              {pairing.partnerDeviceName && (
                <span className="text-xs text-gray-500">({pairing.partnerDeviceName})</span>
              )}
            </div>
          </div>

          {remoteBatchIds.map(remoteBatchId => {
            const remoteBatch = remoteBatches[remoteBatchId];
            if (!remoteBatch) return null;

            return (
              <RemoteBatchDisplay
                key={remoteBatchId}
                batch={remoteBatch}
                batchId={remoteBatchId}
                onClear={clearRemoteBatch}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
