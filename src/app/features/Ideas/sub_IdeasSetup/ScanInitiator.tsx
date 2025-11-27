'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useContextStore } from '@/stores/contextStore';
import { SupportedProvider } from '@/lib/llm/types';
import { ScanState, QueueItem, ContextQueueItem, ScanType } from '../lib/scanTypes';
import { getScanTypeConfig } from './lib/ScanTypeConfig';

// Modular imports
import { executeContextScan, getButtonColor, getButtonText } from './lib/scanHandlers';
import {
  findNextPending,
  hasRunningItem,
  isQueueComplete,
  calculateQueueStats,
  updateQueueItem
} from './lib/scanQueue';
import { handleScan as handleScanOperation, handleBatchScan as handleBatchScanOperation } from './lib/scanOperations';

// Component imports
import ProviderSelector from '@/components/llm/ProviderSelector';
import ScanButton from './components/ScanButton';
import BatchScanButton from './components/BatchScanButton';
import ProgressBar from './ProgressBar';
import ScanIdeaScoreboard from './components/ScanIdeaScoreboard';
import ScanTypeSelector from './ScanTypeSelector';

interface ScanInitiatorProps {
  onScanComplete: () => void;
  selectedScanTypes: ScanType[];
  onScanTypesChange?: (types: ScanType[]) => void;
  selectedContextId?: string | null;
  onBatchScan?: () => void;
}

export default function ScanInitiator({
  onScanComplete,
  selectedScanTypes,
  onScanTypesChange,
  selectedContextId,
  onBatchScan
}: ScanInitiatorProps) {
  const [scanState, setScanState] = React.useState<ScanState>('idle');
  const [message, setMessage] = React.useState<string>('');
  const [totalIdeas, setTotalIdeas] = React.useState<number>(0);
  const [selectedProvider, setSelectedProvider] = React.useState<SupportedProvider>('ollama');
  const [showProviderPopup, setShowProviderPopup] = React.useState(false);

  // Queue management for multiple scans
  const [scanQueue, setScanQueue] = React.useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = React.useState(false);

  // Queue management for batch context scanning
  const [contextQueue, setContextQueue] = React.useState<ContextQueueItem[]>([]);
  const [isProcessingContextQueue, setIsProcessingContextQueue] = React.useState(false);
  const [batchMode, setBatchMode] = React.useState(false);

  const { activeProject } = useActiveProjectStore();
  const { selectedContextIds, contexts, loadProjectData } = useContextStore();

  // Load contexts for active project when it changes
  // Note: loadProjectData is excluded from deps as it's recreated on each render
  // but internally uses stable closure state
  React.useEffect(() => {
    if (activeProject?.id) {
      loadProjectData(activeProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  const currentSelectedContextId = selectedContextId ?? (selectedContextIds.size > 0 ? Array.from(selectedContextIds)[0] : null);
  const selectedContext = currentSelectedContextId
    ? contexts.find(c => c.id === currentSelectedContextId)
    : undefined;

  // Get ALL contexts for active project
  // NOTE: Batch scan will use ALL contexts regardless of UI selection
  const projectContexts = React.useMemo(() => {
    if (!activeProject) return [];
    return contexts.filter(c => c.projectId === activeProject.id);
  }, [contexts, activeProject]);


  const handleScan = async () => {
    await handleScanOperation({
      activeProject,
      selectedScanTypes,
      projectContexts,
      setScanQueue,
      setContextQueue,
      setBatchMode,
      setTotalIdeas,
      setScanState,
      setIsProcessingQueue,
      setIsProcessingContextQueue,
      setShowProviderPopup,
      setMessage
    });
  };

  const handleBatchScan = async () => {
    await handleBatchScanOperation({
      activeProject,
      selectedScanTypes,
      projectContexts,
      setScanQueue,
      setContextQueue,
      setBatchMode,
      setTotalIdeas,
      setScanState,
      setIsProcessingQueue,
      setIsProcessingContextQueue,
      setMessage
    });
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

        updatedQueue = updateQueueItem(updatedQueue, pendingIndex, {
          status: 'completed',
          ideaCount
        });
        setScanQueue(updatedQueue);
        setTotalIdeas(prev => prev + ideaCount);
        onScanComplete();

      } catch (error) {
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
      const scanConfig = getScanTypeConfig(currentContext.scanType);

      setMessage(`${scanConfig?.emoji || '📂'} ${currentContext.contextName} - ${scanConfig?.label}...`);

      try {
        const contextData = currentContext.contextId
          ? contexts.find(c => c.id === currentContext.contextId)
          : null;

        const ideaCount = await executeContextScan({
          projectId: activeProject!.id,
          projectName: activeProject!.name,
          projectPath: activeProject!.path,
          scanType: currentContext.scanType,
          provider: selectedProvider,
          contextId: currentContext.contextId || undefined,
          contextFilePaths: contextData?.filePaths
        });

        updatedQueue = updateQueueItem(updatedQueue, pendingIndex, {
          status: 'completed',
          ideaCount
        });
        setContextQueue(updatedQueue);
        setTotalIdeas(prev => prev + ideaCount);
        onScanComplete();

      } catch (error) {
        updatedQueue = updateQueueItem(updatedQueue, pendingIndex, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Batch scan failed'
        });
        setContextQueue(updatedQueue);
      }
    };

    processNextContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessingContextQueue, contextQueue]);

  return (
    <div className="space-y-4">
      {/* Main Controls Row */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40 space-y-4">
        {/* Status message */}
        {message && (
          <motion.div
            className="text-sm text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {message}
          </motion.div>
        )}

        {/* Scan Type Selector */}
        {onScanTypesChange && (
          <ScanTypeSelector
            selectedTypes={selectedScanTypes}
            onChange={onScanTypesChange}
          />
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-700/20">
          {/* Generate Button with Provider Popup */}
          <div className="relative">
            <ScanButton
              onClick={handleScan}
              onProviderClick={() => setShowProviderPopup(!showProviderPopup)}
              disabled={scanState === 'scanning' || !activeProject}
              scanState={scanState}
              buttonColor={getButtonColor(scanState)}
              buttonText={getButtonText(scanState, batchMode, selectedScanTypes.length)}
            />

            {/* Provider Selector Popup */}
            <AnimatePresence>
              {showProviderPopup && (
                <motion.div
                  className="absolute bottom-full mb-2 left-0 bg-gray-800 border border-gray-700/40 rounded-lg shadow-xl p-3 z-50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div className="text-sm text-gray-400 mb-2 font-semibold">Select LLM Provider:</div>
                  <ProviderSelector
                    selectedProvider={selectedProvider}
                    onSelectProvider={(provider) => {
                      setSelectedProvider(provider);
                      setShowProviderPopup(false);
                    }}
                    disabled={scanState === 'scanning'}
                    compact={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Batch Ideas Button - Next to Generate Button */}
          {activeProject && (
            <BatchScanButton
              onClick={onBatchScan || handleBatchScan}
              disabled={scanState === 'scanning' || !activeProject}
              isScanning={scanState === 'scanning' && batchMode}
              contextsCount={projectContexts.length + 1}
              scanTypesCount={selectedScanTypes.length}
            />
          )}

        </div>
      </div>

      {/* Progress Bar - Scan Queue */}
      {scanQueue.length > 0 && isProcessingQueue && (
        <>
          <ProgressBar items={scanQueue} totalIdeas={totalIdeas} type="scan" />
          <ScanIdeaScoreboard items={scanQueue} totalIdeas={totalIdeas} type="scan" />
        </>
      )}

      {/* Progress Bar - Context Queue (Batch Mode) */}
      {contextQueue.length > 0 && isProcessingContextQueue && (
        <>
          <ProgressBar items={contextQueue} totalIdeas={totalIdeas} type="context" />
          <ScanIdeaScoreboard items={contextQueue} totalIdeas={totalIdeas} type="context" />
        </>
      )}
    </div>
  );
}
