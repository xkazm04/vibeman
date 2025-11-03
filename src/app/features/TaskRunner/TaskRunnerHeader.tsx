'use client';
import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ProjectRequirement, TaskRunnerActions } from './lib/types';
import DualBatchPanel from './components/DualBatchPanel';
import { BatchStorage, type BatchState } from './lib/batchStorage';
import { executeNextRequirement as executeTask } from './lib/taskExecutor';
import ConfigurationToolbar from './lib/ConfigurationToolbar';

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
  const executionQueueRef = useRef<string[]>([]);
  const isExecutingRef = useRef(false);
  const { setRequirements, setIsRunning, setProcessedCount, setError } = actions;

  // Pause/Resume state management with localStorage
  const [isPaused, setIsPaused] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('taskRunnerPaused');
      return stored === 'true';
    }
    return false;
  });

  // Persist pause state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskRunnerPaused', isPaused.toString());
    }
  }, [isPaused]);

  // Multi-batch state management (up to 4 batches)
  const [batch1, setBatch1] = useState<BatchState | null>(null);
  const [batch2, setBatch2] = useState<BatchState | null>(null);
  const [batch3, setBatch3] = useState<BatchState | null>(null);
  const [batch4, setBatch4] = useState<BatchState | null>(null);

  // Recovery logic - restore batches from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const recovered = BatchStorage.load();
    if (!recovered) return;

    let hasRecovered = false;

    // Define batch recovery function
    const recoverBatch = (
      batchData: BatchState | null,
      batchId: 'batch1' | 'batch2' | 'batch3' | 'batch4',
      setBatch: (batch: BatchState) => void
    ) => {
      if (!batchData) return false;

      console.log(`[TaskRunner] Recovering ${batchId}...`, batchData);

      // Don't recover completed batches
      if (batchData.status === 'completed') {
        console.log(`[TaskRunner] Skipping recovery of completed ${batchId}`);
        setBatch(batchData);
        return false;
      }

      setBatch(batchData);

      if (batchData.status === 'running') {
        // Re-queue unfinished tasks
        const remaining = batchData.requirementIds.slice(
          batchData.completedCount
        );

        // Filter to only include requirements that actually exist
        const existingRemaining = remaining.filter(reqId =>
          requirements.some(req => getRequirementId(req) === reqId)
        );

        // If no actual requirements remain, mark batch as completed
        if (existingRemaining.length === 0) {
          console.log(`[TaskRunner] No remaining requirements for ${batchId}, marking as completed`);
          const completedBatch = { ...batchData, status: 'completed' as const };
          setBatch(completedBatch);
          BatchStorage.updateBatch(batchId, completedBatch);
          return false;
        }

        executionQueueRef.current = [...executionQueueRef.current, ...existingRemaining];

        // Mark requirements as queued
        setRequirements(prev =>
          prev.map(req => {
            const reqId = getRequirementId(req);
            if (existingRemaining.includes(reqId)) {
              return { ...req, status: 'queued' as const, batchId };
            }
            return req;
          })
        );
        return true;
      }
      return false;
    };

    // Restore all batches
    if (recoverBatch(recovered.batch1, 'batch1', setBatch1)) hasRecovered = true;
    if (recoverBatch(recovered.batch2, 'batch2', setBatch2)) hasRecovered = true;
    if (recoverBatch(recovered.batch3, 'batch3', setBatch3)) hasRecovered = true;
    if (recoverBatch(recovered.batch4, 'batch4', setBatch4)) hasRecovered = true;

    // Resume execution if batches were recovered
    if (hasRecovered) {
      console.log('[TaskRunner] Resuming batch execution after recovery');
      setIsRunning(true);
      setTimeout(() => executeNextRequirement(), 500);
    }
  }, []); // Run once on mount - eslint-disable-next-line react-hooks/exhaustive-deps

  // Wrapper for executeNextRequirement from taskExecutor
  const executeNextRequirement = useCallback(() => {
    // Build batch states map from current batch objects
    const batchStates = new Map<string, 'idle' | 'running' | 'paused' | 'completed'>();
    if (batch1) batchStates.set('batch1', batch1.status);
    if (batch2) batchStates.set('batch2', batch2.status);
    if (batch3) batchStates.set('batch3', batch3.status);
    if (batch4) batchStates.set('batch4', batch4.status);

    executeTask({
      executionQueueRef,
      isExecutingRef,
      isPaused,
      batchStates,
      requirements,
      actions,
      getRequirementId,
      executeNextRequirement: () => executeNextRequirement(),
    });
  }, [requirements, getRequirementId, actions, isPaused, batch1, batch2, batch3, batch4]);

  // Auto-process queue - allow parallel execution from different batches
  useEffect(() => {
    // Find all currently running batches
    const runningBatchIds = new Set(
      requirements
        .filter(r => r.status === 'running' && r.batchId)
        .map(r => r.batchId!)
    );

    // Try to start requirements from batches that aren't currently running
    if (executionQueueRef.current.length > 0 && !isExecutingRef.current) {
      // Find the next requirement from a batch that's not currently executing
      const nextReqId = executionQueueRef.current.find(reqId => {
        const req = requirements.find(r => getRequirementId(r) === reqId);
        // Start this requirement if its batch isn't already running something
        return req && req.batchId && !runningBatchIds.has(req.batchId);
      });

      if (nextReqId) {
        console.log(`[TaskRunner] Auto-processing next requirement from idle batch: ${nextReqId}`);
        executeNextRequirement();
      }
    }

    // Check if all queued items are done
    const runningReq = requirements.find((r) => r.status === 'running');
    if (isRunning && executionQueueRef.current.length === 0 && !runningReq) {
      console.log('[TaskRunner] All requirements completed');
      setIsRunning(false);
      setProcessedCount(0);
    }
  }, [requirements, isRunning, setIsRunning, setProcessedCount, executeNextRequirement, getRequirementId]);

  // Batch Handler Functions
  const handleCreateBatch = useCallback((batchId: 'batch1' | 'batch2' | 'batch3' | 'batch4') => {
    const selectedReqIds = Array.from(selectedRequirements);
    const batchNumber = batchId.replace('batch', '');
    const batch = BatchStorage.createBatch(
      `batch_${Date.now()}`,
      `Batch ${batchNumber} - ${selectedReqIds.length} tasks`,
      selectedReqIds
    );

    // Update the appropriate batch state
    switch (batchId) {
      case 'batch1':
        setBatch1(batch);
        break;
      case 'batch2':
        setBatch2(batch);
        break;
      case 'batch3':
        setBatch3(batch);
        break;
      case 'batch4':
        setBatch4(batch);
        break;
    }

    // Update localStorage
    const currentState = BatchStorage.load() || { batch1: null, batch2: null, batch3: null, batch4: null, activeBatch: null };
    BatchStorage.save({
      ...currentState,
      [batchId]: batch,
    });

    // Clear selection
    actions.setSelectedRequirements(new Set());

    console.log(`[TaskRunner] Created ${batchId} with ${selectedReqIds.length} tasks`);
  }, [selectedRequirements, actions]);

  const handleStartBatch = useCallback((batchId: 'batch1' | 'batch2' | 'batch3' | 'batch4') => {
    // Get the appropriate batch
    let batch: BatchState | null = null;
    switch (batchId) {
      case 'batch1': batch = batch1; break;
      case 'batch2': batch = batch2; break;
      case 'batch3': batch = batch3; break;
      case 'batch4': batch = batch4; break;
    }

    if (!batch) return;

    console.log(`[TaskRunner] Starting ${batchId}`);

    // Update batch status
    const updatedBatch = {
      ...batch,
      status: 'running' as const,
      startedAt: Date.now(),
    };

    // Update the appropriate state
    switch (batchId) {
      case 'batch1': setBatch1(updatedBatch); break;
      case 'batch2': setBatch2(updatedBatch); break;
      case 'batch3': setBatch3(updatedBatch); break;
      case 'batch4': setBatch4(updatedBatch); break;
    }

    // Save to localStorage
    BatchStorage.updateBatch(batchId, updatedBatch);

    // Queue all requirements for this batch
    const reqIds = batch.requirementIds;
    executionQueueRef.current = [...executionQueueRef.current, ...reqIds];

    // Mark requirements as queued
    setRequirements(prev =>
      prev.map(req => {
        const reqId = getRequirementId(req);
        if (reqIds.includes(reqId)) {
          return { ...req, status: 'queued' as const, batchId };
        }
        return req;
      })
    );

    // Start execution
    setIsRunning(true);
    executeNextRequirement();
  }, [batch1, batch2, batch3, batch4, getRequirementId, setRequirements, setIsRunning, executeNextRequirement]);

  const handlePauseBatch = useCallback((batchId: 'batch1' | 'batch2' | 'batch3' | 'batch4') => {
    // Get the appropriate batch
    let batch: BatchState | null = null;
    switch (batchId) {
      case 'batch1': batch = batch1; break;
      case 'batch2': batch = batch2; break;
      case 'batch3': batch = batch3; break;
      case 'batch4': batch = batch4; break;
    }

    if (!batch) return;

    console.log(`[TaskRunner] Pausing ${batchId}`);

    const updatedBatch = { ...batch, status: 'paused' as const };

    // Update the appropriate state
    switch (batchId) {
      case 'batch1': setBatch1(updatedBatch); break;
      case 'batch2': setBatch2(updatedBatch); break;
      case 'batch3': setBatch3(updatedBatch); break;
      case 'batch4': setBatch4(updatedBatch); break;
    }

    BatchStorage.updateBatch(batchId, updatedBatch);
    // Don't set global isPaused - each batch is independent
  }, [batch1, batch2, batch3, batch4]);

  const handleResumeBatch = useCallback((batchId: 'batch1' | 'batch2' | 'batch3' | 'batch4') => {
    // Get the appropriate batch
    let batch: BatchState | null = null;
    switch (batchId) {
      case 'batch1': batch = batch1; break;
      case 'batch2': batch = batch2; break;
      case 'batch3': batch = batch3; break;
      case 'batch4': batch = batch4; break;
    }

    if (!batch) return;

    console.log(`[TaskRunner] Resuming ${batchId}`);

    const updatedBatch = { ...batch, status: 'running' as const };

    // Update the appropriate state
    switch (batchId) {
      case 'batch1': setBatch1(updatedBatch); break;
      case 'batch2': setBatch2(updatedBatch); break;
      case 'batch3': setBatch3(updatedBatch); break;
      case 'batch4': setBatch4(updatedBatch); break;
    }

    BatchStorage.updateBatch(batchId, updatedBatch);
    // Don't set global isPaused - each batch is independent

    // Resume execution - the executor will check batch states
    setTimeout(() => {
      if (executionQueueRef.current.length > 0) {
        executeNextRequirement();
      }
    }, 100);
  }, [batch1, batch2, batch3, batch4, executeNextRequirement]);

  const handleClearBatch = useCallback((batchId: 'batch1' | 'batch2' | 'batch3' | 'batch4') => {
    console.log(`[TaskRunner] Clearing ${batchId}`);

    // Get the batch to clear
    let batch: BatchState | null = null;
    switch (batchId) {
      case 'batch1': batch = batch1; break;
      case 'batch2': batch = batch2; break;
      case 'batch3': batch = batch3; break;
      case 'batch4': batch = batch4; break;
    }

    if (batch) {
      // Remove batch requirements from execution queue
      executionQueueRef.current = executionQueueRef.current.filter(
        reqId => !batch!.requirementIds.includes(reqId)
      );

      // Reset requirements status to idle and clear batchId
      setRequirements(prev =>
        prev.map(req => {
          const reqId = getRequirementId(req);
          if (batch!.requirementIds.includes(reqId)) {
            return { ...req, status: 'idle' as const, batchId: undefined };
          }
          return req;
        })
      );
    }

    // Update the appropriate state
    switch (batchId) {
      case 'batch1': setBatch1(null); break;
      case 'batch2': setBatch2(null); break;
      case 'batch3': setBatch3(null); break;
      case 'batch4': setBatch4(null); break;
    }

    const currentState = BatchStorage.load();
    if (currentState) {
      BatchStorage.save({
        ...currentState,
        [batchId]: null,
      });
    }
  }, [batch1, batch2, batch3, batch4, getRequirementId, setRequirements]);

  const clearError = () => {
    setError(undefined);
  };

  const handlePause = () => {
    console.log('[TaskRunner] Pausing queue execution');
    setIsPaused(true);
  };

  const handleResume = () => {
    console.log('[TaskRunner] Resuming queue execution');
    setIsPaused(false);
    // Trigger queue processing after resume
    setTimeout(() => {
      if (executionQueueRef.current.length > 0 && !isExecutingRef.current) {
        executeNextRequirement();
      }
    }, 100);
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
          batch1={batch1}
          batch2={batch2}
          batch3={batch3}
          batch4={batch4}
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
