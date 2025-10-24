'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useContextStore } from '@/stores/contextStore';
import { SupportedProvider } from '@/lib/llm/types';
import { ScanState, QueueItem, ContextQueueItem } from '../lib/scanTypes';
import { ScanType } from './ScanTypeSelector';
import { getScanTypeConfig } from './lib/ScanTypeConfig';

// Modular imports
import { executeContextScan, getButtonColor, getButtonText } from './lib/scanHandlers';
import {
  initializeScanQueue,
  initializeContextQueue,
  findNextPending,
  hasRunningItem,
  isQueueComplete,
  calculateQueueStats,
  updateQueueItem
} from './lib/scanQueue';

// Component imports
import ProviderSelector from './components/ProviderSelector';
import ContextSelector from './components/ContextSelector';
import ScanButton from './components/ScanButton';
import BatchScanButton from './components/BatchScanButton';
import ProgressBar from './ProgressBar';

interface ScanInitiatorProps {
  onScanComplete: () => void;
  selectedScanTypes: ScanType[];
  selectedContextId?: string | null;
  onBatchScan?: () => void;
}

export default function ScanInitiator({
  onScanComplete,
  selectedScanTypes,
  selectedContextId,
  onBatchScan
}: ScanInitiatorProps) {
  const [scanState, setScanState] = React.useState<ScanState>('idle');
  const [message, setMessage] = React.useState<string>('');
  const [totalIdeas, setTotalIdeas] = React.useState<number>(0);
  const [selectedProvider, setSelectedProvider] = React.useState<SupportedProvider>('ollama');

  // Queue management for multiple scans
  const [scanQueue, setScanQueue] = React.useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = React.useState(false);

  // Queue management for batch context scanning
  const [contextQueue, setContextQueue] = React.useState<ContextQueueItem[]>([]);
  const [isProcessingContextQueue, setIsProcessingContextQueue] = React.useState(false);
  const [batchMode, setBatchMode] = React.useState(false);

  const { activeProject } = useActiveProjectStore();
  const { selectedContextIds, contexts, setSelectedContext, clearContextSelection } = useContextStore();

  const currentSelectedContextId = selectedContextId ?? (selectedContextIds.length > 0 ? selectedContextIds[0] : null);
  const selectedContext = currentSelectedContextId
    ? contexts.find(c => c.id === currentSelectedContextId)
    : undefined;

  // Get contexts for active project
  const projectContexts = React.useMemo(() => {
    if (!activeProject) return [];
    return contexts.filter(c => c.projectId === activeProject.id);
  }, [contexts, activeProject]);

  const handleContextSelect = (contextId: string | null) => {
    if (contextId === null) {
      clearContextSelection();
    } else {
      setSelectedContext(contextId);
    }
  };

  const handleScan = async () => {
    if (!activeProject) {
      setMessage('No active project selected');
      setScanState('error');
      setTimeout(() => setScanState('idle'), 3000);
      return;
    }

    // Initialize queue with all selected scan types
    const queue = initializeScanQueue(selectedScanTypes);

    console.log('[ScanInitiator] Initializing queue with', queue.length, 'scans');
    setScanQueue(queue);
    setContextQueue([]);
    setBatchMode(false);
    setTotalIdeas(0);
    setScanState('scanning');
    setIsProcessingQueue(true);
  };

  const handleBatchScan = async () => {
    if (!activeProject) {
      setMessage('No active project selected');
      setScanState('error');
      setTimeout(() => setScanState('idle'), 3000);
      return;
    }

    if (projectContexts.length === 0) {
      setMessage('No contexts found for this project');
      setScanState('error');
      setTimeout(() => setScanState('idle'), 3000);
      return;
    }

    // Initialize context queue with all contexts + full project
    const queue = initializeContextQueue(projectContexts);

    console.log('[ScanInitiator] Initializing batch context queue with', queue.length, 'contexts');
    setContextQueue(queue);
    setScanQueue([]);
    setBatchMode(true);
    setTotalIdeas(0);
    setScanState('scanning');
    setIsProcessingContextQueue(true);
  };

  // Process scan queue automatically when it changes
  React.useEffect(() => {
    if (!isProcessingQueue || scanQueue.length === 0) return;

    const pendingIndex = findNextPending(scanQueue);
    const hasRunning = hasRunningItem(scanQueue);

    if (isQueueComplete(scanQueue)) {
      const { successCount, failedCount } = calculateQueueStats(scanQueue);

      setMessage(`Completed ${successCount} scans (${failedCount} failed). Total: ${totalIdeas} ideas!`);
      setScanState(failedCount === scanQueue.length ? 'error' : 'success');
      setIsProcessingQueue(false);

      setTimeout(() => {
        setScanState('idle');
        setMessage('');
        setScanQueue([]);
      }, 5000);
      return;
    }

    if (hasRunning || pendingIndex === -1) return;

    const processNextScan = async () => {
      // Update status to running
      let updatedQueue = updateQueueItem(scanQueue, pendingIndex, { status: 'running' });
      setScanQueue(updatedQueue);

      const currentScan = updatedQueue[pendingIndex];
      const config = getScanTypeConfig(currentScan.scanType);
      console.log('[ScanInitiator] Starting scan:', currentScan.scanType);
      setMessage(`${config?.emoji} Scanning: ${config?.label}...`);

      try {
        const ideaCount = await executeContextScan({
          projectId: activeProject!.id,
          projectName: activeProject!.name,
          projectPath: activeProject!.path,
          scanType: currentScan.scanType,
          provider: selectedProvider,
          contextId: currentSelectedContextId || undefined,
          contextFilePaths: selectedContext?.filePaths
        });

        console.log('[ScanInitiator] Scan completed:', currentScan.scanType, 'Ideas:', ideaCount);

        updatedQueue = updateQueueItem(updatedQueue, pendingIndex, {
          status: 'completed',
          ideaCount
        });
        setScanQueue(updatedQueue);
        setTotalIdeas(prev => prev + ideaCount);
        onScanComplete();

      } catch (error) {
        console.error('Scan error:', error);

        updatedQueue = updateQueueItem(updatedQueue, pendingIndex, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Scan failed'
        });
        setScanQueue(updatedQueue);
      }
    };

    processNextScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessingQueue, scanQueue]);

  // Process context queue automatically when it changes
  React.useEffect(() => {
    if (!isProcessingContextQueue || contextQueue.length === 0) return;

    const pendingIndex = findNextPending(contextQueue);
    const hasRunning = hasRunningItem(contextQueue);

    if (isQueueComplete(contextQueue)) {
      const { successCount, failedCount } = calculateQueueStats(contextQueue);

      setMessage(`Batch complete! ${successCount} contexts (${failedCount} failed). Total: ${totalIdeas} ideas!`);
      setScanState(failedCount === contextQueue.length ? 'error' : 'success');
      setIsProcessingContextQueue(false);

      setTimeout(() => {
        setScanState('idle');
        setMessage('');
        setContextQueue([]);
        setBatchMode(false);
      }, 5000);
      return;
    }

    if (hasRunning || pendingIndex === -1) return;

    const processNextContext = async () => {
      let updatedQueue = updateQueueItem(contextQueue, pendingIndex, { status: 'running' });
      setContextQueue(updatedQueue);

      const currentContext = updatedQueue[pendingIndex];
      console.log('[ScanInitiator] Starting context scan:', currentContext.contextName);
      setMessage(`📂 Scanning: ${currentContext.contextName}...`);

      try {
        const contextData = currentContext.contextId
          ? contexts.find(c => c.id === currentContext.contextId)
          : null;

        const scanType = selectedScanTypes[0] || 'overall';
        const ideaCount = await executeContextScan({
          projectId: activeProject!.id,
          projectName: activeProject!.name,
          projectPath: activeProject!.path,
          scanType,
          provider: selectedProvider,
          contextId: currentContext.contextId || undefined,
          contextFilePaths: contextData?.filePaths
        });

        console.log('[ScanInitiator] Context scan completed:', currentContext.contextName, 'Ideas:', ideaCount);

        updatedQueue = updateQueueItem(updatedQueue, pendingIndex, {
          status: 'completed',
          ideaCount
        });
        setContextQueue(updatedQueue);
        setTotalIdeas(prev => prev + ideaCount);
        onScanComplete();

      } catch (error) {
        console.error('Context scan error:', error);

        updatedQueue = updateQueueItem(updatedQueue, pendingIndex, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Context scan failed'
        });
        setContextQueue(updatedQueue);
      }
    };

    processNextContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessingContextQueue, contextQueue]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40">
        {/* Status message */}
        {message && (
          <motion.div
            className="flex-1 text-sm text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {message}
          </motion.div>
        )}

        <div className="flex items-center gap-3">
          {/* Provider Selection */}
          <ProviderSelector
            selectedProvider={selectedProvider}
            onSelectProvider={setSelectedProvider}
            disabled={scanState === 'scanning'}
          />

          {/* Context Selector */}
          {activeProject && projectContexts.length > 0 && !batchMode && (
            <ContextSelector
              contexts={projectContexts}
              selectedContext={selectedContext}
              onSelectContext={handleContextSelect}
              disabled={scanState === 'scanning'}
            />
          )}

          {/* Generate Button */}
          <ScanButton
            onClick={handleScan}
            disabled={scanState === 'scanning' || !activeProject}
            scanState={scanState}
            buttonColor={getButtonColor(scanState)}
            buttonText={getButtonText(scanState, batchMode, selectedScanTypes.length)}
          />

          {/* Batch Ideas Button */}
          {activeProject && projectContexts.length > 0 && (
            <BatchScanButton
              onClick={onBatchScan || handleBatchScan}
              disabled={scanState === 'scanning' || !activeProject}
              isScanning={scanState === 'scanning' && batchMode}
              contextsCount={projectContexts.length + 1}
            />
          )}
        </div>
      </div>

      {/* Progress Bar - Scan Queue */}
      {scanQueue.length > 0 && isProcessingQueue && (
        <ProgressBar items={scanQueue} totalIdeas={totalIdeas} type="scan" />
      )}

      {/* Progress Bar - Context Queue (Batch Mode) */}
      {contextQueue.length > 0 && isProcessingContextQueue && (
        <ProgressBar items={contextQueue} totalIdeas={totalIdeas} type="context" />
      )}
    </div>
  );
}
