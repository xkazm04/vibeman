'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Loader2, CheckCircle, XCircle, ChevronDown, Layers } from 'lucide-react';
import Image from 'next/image';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useContextStore } from '@/stores/contextStore';
import { SupportedProvider } from '@/lib/llm/types';
import { ScanType } from './ScanTypeSelector';
import { getScanTypeConfig } from '../lib/ScanTypeConfig';
import { LLM_PROVIDERS } from '../lib/llmProviders';
import { ScanState, QueueItem, ContextQueueItem } from '../lib/scanTypes';
import { gatherCodebaseFiles, executeScan } from '../lib/scanApi';
import ProgressBar from './ProgressBar';

interface ScanInitiatorProps {
  onScanComplete: () => void;
  selectedScanTypes: ScanType[];
}

export default function ScanInitiator({ onScanComplete, selectedScanTypes }: ScanInitiatorProps) {
  const [scanState, setScanState] = React.useState<ScanState>('idle');
  const [message, setMessage] = React.useState<string>('');
  const [totalIdeas, setTotalIdeas] = React.useState<number>(0);
  const [selectedProvider, setSelectedProvider] = React.useState<SupportedProvider>('ollama');
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  
  // Queue management for multiple scans
  const [scanQueue, setScanQueue] = React.useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = React.useState(false);
  
  // Queue management for batch context scanning
  const [contextQueue, setContextQueue] = React.useState<ContextQueueItem[]>([]);
  const [isProcessingContextQueue, setIsProcessingContextQueue] = React.useState(false);
  const [batchMode, setBatchMode] = React.useState(false);

  const { activeProject } = useActiveProjectStore();
  const { selectedContextIds, contexts, setSelectedContext, clearContextSelection } = useContextStore();

  const selectedContextId = selectedContextIds.length > 0 ? selectedContextIds[0] : null;
  const selectedContext = selectedContextId
    ? contexts.find(c => c.id === selectedContextId)
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
    setShowContextMenu(false);
  };

  // Execute a single scan for a specific scan type and context
  const executeContextScan = async (scanType: ScanType, contextId?: string, contextFilePaths?: string[]): Promise<number> => {
    const codebaseFiles = await gatherCodebaseFiles(activeProject!.path, contextFilePaths);

    if (codebaseFiles.length === 0) {
      throw new Error('No code files found to analyze');
    }

    return executeScan({
      projectId: activeProject!.id,
      projectName: activeProject!.name,
      projectPath: activeProject!.path,
      contextId,
      provider: selectedProvider,
      scanType: scanType,
      codebaseFiles
    });
  };

  const handleScan = async () => {
    if (!activeProject) {
      setMessage('No active project selected');
      setScanState('error');
      setTimeout(() => setScanState('idle'), 3000);
      return;
    }

    // Initialize queue with all selected scan types
    const queue: QueueItem[] = selectedScanTypes.map(scanType => ({
      scanType,
      status: 'pending',
      ideaCount: 0
    }));

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
    const queue: ContextQueueItem[] = [
      {
        contextId: null,
        contextName: 'Full Project',
        status: 'pending',
        ideaCount: 0
      },
      ...projectContexts.map(context => ({
        contextId: context.id,
        contextName: context.name,
        status: 'pending' as const,
        ideaCount: 0
      }))
    ];

    console.log('[ScanInitiator] Initializing batch context queue with', queue.length, 'contexts');
    setContextQueue(queue);
    setScanQueue([]);
    setBatchMode(true);
    setTotalIdeas(0);
    setScanState('scanning');
    setIsProcessingContextQueue(true);
  };  // Process scan queue automatically when it changes
  React.useEffect(() => {
    if (!isProcessingQueue || scanQueue.length === 0) return;

    // Find next pending scan
    const pendingIndex = scanQueue.findIndex(item => item.status === 'pending');
    
    // Check if we have a scan already running
    const hasRunningScan = scanQueue.some(item => item.status === 'running');
    
    if (pendingIndex === -1) {
      // No more pending scans
      if (!hasRunningScan) {
        // All scans completed (no running, no pending)
        const successCount = scanQueue.filter(item => item.status === 'completed').length;
        const failedCount = scanQueue.filter(item => item.status === 'failed').length;
        
        setMessage(`Completed ${successCount} scans (${failedCount} failed). Total: ${totalIdeas} ideas!`);
        setScanState(failedCount === scanQueue.length ? 'error' : 'success');
        setIsProcessingQueue(false);
        
        // Reset after 5 seconds
        setTimeout(() => {
          setScanState('idle');
          setMessage('');
          setScanQueue([]);
        }, 5000);
      }
      return;
    }

    // Don't start a new scan if one is already running
    if (hasRunningScan) return;

    // Process the next pending scan
    const processNextScan = async () => {
      // Update status to running
      const updatedQueue = [...scanQueue];
      updatedQueue[pendingIndex] = { ...updatedQueue[pendingIndex], status: 'running' };
      setScanQueue(updatedQueue);

      const currentScan = updatedQueue[pendingIndex];
      const config = getScanTypeConfig(currentScan.scanType);
      console.log('[ScanInitiator] Starting scan:', currentScan.scanType);
      setMessage(`${config?.emoji} Scanning: ${config?.label}...`);

      try {
        // Execute the scan
        console.log('[ScanInitiator] Executing scan for:', currentScan.scanType);
        const ideaCount = await executeContextScan(currentScan.scanType, selectedContextId || undefined, selectedContext?.filePaths);
        console.log('[ScanInitiator] Scan completed:', currentScan.scanType, 'Ideas:', ideaCount);
        
        // Update with success
        const finalQueue = [...updatedQueue];
        finalQueue[pendingIndex] = {
          ...finalQueue[pendingIndex],
          status: 'completed',
          ideaCount
        };
        setScanQueue(finalQueue);
        setTotalIdeas(prev => prev + ideaCount);
        
        // Refresh ideas list after each scan
        onScanComplete();
        
      } catch (error) {
        console.error('Scan error:', error);
        
        // Update with error
        const finalQueue = [...updatedQueue];
        finalQueue[pendingIndex] = {
          ...finalQueue[pendingIndex],
          status: 'failed',
          error: error instanceof Error ? error.message : 'Scan failed'
        };
        setScanQueue(finalQueue);
      }
    };

    processNextScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessingQueue, scanQueue]);

  // Process context queue automatically when it changes
  React.useEffect(() => {
    if (!isProcessingContextQueue || contextQueue.length === 0) return;

    // Find next pending context
    const pendingIndex = contextQueue.findIndex(item => item.status === 'pending');
    
    // Check if we have a context already running
    const hasRunningContext = contextQueue.some(item => item.status === 'running');
    
    if (pendingIndex === -1) {
      // No more pending contexts
      if (!hasRunningContext) {
        // All contexts completed (no running, no pending)
        const successCount = contextQueue.filter(item => item.status === 'completed').length;
        const failedCount = contextQueue.filter(item => item.status === 'failed').length;
        
        setMessage(`Batch complete! ${successCount} contexts (${failedCount} failed). Total: ${totalIdeas} ideas!`);
        setScanState(failedCount === contextQueue.length ? 'error' : 'success');
        setIsProcessingContextQueue(false);
        
        // Reset after 5 seconds
        setTimeout(() => {
          setScanState('idle');
          setMessage('');
          setContextQueue([]);
          setBatchMode(false);
        }, 5000);
      }
      return;
    }

    // Don't start a new context if one is already running
    if (hasRunningContext) return;

    // Process the next pending context
    const processNextContext = async () => {
      // Update status to running
      const updatedQueue = [...contextQueue];
      updatedQueue[pendingIndex] = { ...updatedQueue[pendingIndex], status: 'running' };
      setContextQueue(updatedQueue);

      const currentContext = updatedQueue[pendingIndex];
      console.log('[ScanInitiator] Starting context scan:', currentContext.contextName);
      setMessage(`📂 Scanning: ${currentContext.contextName}...`);

      try {
        // Get context data
        const contextData = currentContext.contextId 
          ? contexts.find(c => c.id === currentContext.contextId)
          : null;

        // Execute scan for this context (using first selected scan type)
        const scanType = selectedScanTypes[0] || 'overall';
        console.log('[ScanInitiator] Executing scan for context:', currentContext.contextName, 'Scan type:', scanType);
        const ideaCount = await executeContextScan(
          scanType, 
          currentContext.contextId || undefined,
          contextData?.filePaths
        );
        console.log('[ScanInitiator] Context scan completed:', currentContext.contextName, 'Ideas:', ideaCount);
        
        // Update with success
        const finalQueue = [...updatedQueue];
        finalQueue[pendingIndex] = {
          ...finalQueue[pendingIndex],
          status: 'completed',
          ideaCount
        };
        setContextQueue(finalQueue);
        setTotalIdeas(prev => prev + ideaCount);
        
        // Refresh ideas list after each scan
        onScanComplete();
        
      } catch (error) {
        console.error('Context scan error:', error);
        
        // Update with error
        const finalQueue = [...updatedQueue];
        finalQueue[pendingIndex] = {
          ...finalQueue[pendingIndex],
          status: 'failed',
          error: error instanceof Error ? error.message : 'Context scan failed'
        };
        setContextQueue(finalQueue);
      }
    };

    processNextContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessingContextQueue, contextQueue]);

  const getButtonColor = () => {
    switch (scanState) {
      case 'scanning':
        return 'bg-blue-500/30 border-blue-500/50';
      case 'success':
        return 'bg-green-500/30 border-green-500/50';
      case 'error':
        return 'bg-red-500/30 border-red-500/50';
      default:
        return 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 hover:border-blue-500/60';
    }
  };

  const getIcon = () => {
    switch (scanState) {
      case 'scanning':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Scan className="w-4 h-4" />;
    }
  };

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
          <div className="flex items-center gap-2">
            {LLM_PROVIDERS.map((provider) => (
              <motion.button
                key={provider.value}
                onClick={() => setSelectedProvider(provider.value)}
                disabled={scanState === 'scanning'}
                className={`relative w-10 h-10 rounded-lg border-2 transition-all duration-300 ${
                  selectedProvider === provider.value
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700/40 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60'
                }`}
                whileHover={{ scale: scanState === 'idle' ? 1.05 : 1 }}
                whileTap={{ scale: scanState === 'idle' ? 0.95 : 1 }}
                title={provider.name}
              >
                <Image
                  src={provider.icon}
                  alt={provider.name}
                  width={24}
                  height={24}
                  className="mx-auto"
                />
              </motion.button>
            ))}
          </div>

          {/* Context Selector */}
          {activeProject && projectContexts.length > 0 && !batchMode && (
            <div className="relative">
              <motion.button
                onClick={() => setShowContextMenu(!showContextMenu)}
                disabled={scanState === 'scanning'}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-700/40 bg-gray-800/40 hover:bg-gray-800/60 transition-all text-xs"
                whileHover={{ scale: scanState === 'idle' ? 1.02 : 1 }}
              >
                <span className="text-gray-300">📂 {selectedContext ? selectedContext.name : 'Full Project'}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </motion.button>

              <AnimatePresence>
                {showContextMenu && (
                  <motion.div
                    className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700/40 rounded-lg shadow-xl z-50 overflow-hidden min-w-[200px]"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <button
                      onClick={() => handleContextSelect(null)}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-700/40 transition-colors ${
                        !selectedContext ? 'bg-gray-700/20 text-cyan-300' : 'text-gray-300'
                      }`}
                    >
                      Full Project
                    </button>
                    {projectContexts.map((context) => (
                      <button
                        key={context.id}
                        onClick={() => handleContextSelect(context.id)}
                        className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-700/40 transition-colors ${
                          selectedContext?.id === context.id ? 'bg-gray-700/20 text-cyan-300' : 'text-gray-300'
                        }`}
                      >
                        📂 {context.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Generate Button */}
          <motion.button
            onClick={handleScan}
            disabled={scanState === 'scanning' || !activeProject}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg border transition-all duration-300 font-semibold text-sm ${getButtonColor()} ${
              !activeProject ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            whileHover={scanState === 'idle' && activeProject ? { scale: 1.05 } : {}}
            whileTap={scanState === 'idle' && activeProject ? { scale: 0.95 } : {}}
          >
            {getIcon()}
            <span className="text-white">
              {scanState === 'scanning' && !batchMode
                ? 'Scanning...'
                : scanState === 'success'
                ? `✓ Success!`
                : scanState === 'error'
                ? 'Error'
                : selectedScanTypes.length > 1
                ? `Generate Ideas (${selectedScanTypes.length})`
                : 'Generate Ideas'}
            </span>
          </motion.button>

          {/* Batch Ideas Button */}
          {activeProject && projectContexts.length > 0 && (
            <motion.button
              onClick={handleBatchScan}
              disabled={scanState === 'scanning' || !activeProject}
              className={`flex items-center space-x-2 px-5 py-2 rounded-lg border transition-all duration-300 font-semibold text-sm ${
                scanState === 'scanning' && batchMode
                  ? 'bg-purple-500/30 border-purple-500/50'
                  : 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 hover:border-purple-500/60'
              } ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}
              whileHover={scanState === 'idle' && activeProject ? { scale: 1.05 } : {}}
              whileTap={scanState === 'idle' && activeProject ? { scale: 0.95 } : {}}
              title="Generate ideas for all contexts in this project"
            >
              {scanState === 'scanning' && batchMode ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Layers className="w-4 h-4" />
              )}
              <span className="text-white">
                {scanState === 'scanning' && batchMode
                  ? 'Batch Scanning...'
                  : `Batch Ideas (${projectContexts.length + 1})`}
              </span>
            </motion.button>
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