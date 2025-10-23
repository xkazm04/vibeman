import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Loader2, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useContextStore } from '@/stores/contextStore';
import { SupportedProvider } from '@/lib/llm/types';
import { ScanType } from './ScanTypeSelector';
import { getScanTypeConfig } from '../lib/ScanTypeConfig';
import Image from 'next/image';

interface ScanInitiatorProps {
  onScanComplete: () => void;
  selectedScanTypes: ScanType[];
}

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

interface QueueItem {
  scanType: ScanType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ideaCount?: number;
  error?: string;
}

const LLM_PROVIDERS = [
  { value: 'ollama' as SupportedProvider, icon: '/llm_icons/ollama.svg', name: 'Ollama' },
  { value: 'anthropic' as SupportedProvider, icon: '/llm_icons/claude.svg', name: 'Claude' },
  { value: 'gemini' as SupportedProvider, icon: '/llm_icons/gemini.svg', name: 'Gemini' },
  { value: 'openai' as SupportedProvider, icon: '/llm_icons/openai.svg', name: 'OpenAI' }
];

export default function ScanInitiator({ onScanComplete, selectedScanTypes }: ScanInitiatorProps) {
  const [scanState, setScanState] = React.useState<ScanState>('idle');
  const [message, setMessage] = React.useState<string>('');
  const [totalIdeas, setTotalIdeas] = React.useState<number>(0);
  const [selectedProvider, setSelectedProvider] = React.useState<SupportedProvider>('ollama');
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  
  // Queue management for multiple scans
  const [scanQueue, setScanQueue] = React.useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = React.useState(false);

  const { activeProject } = useActiveProjectStore();
  const { selectedContextIds, contexts, setSelectedContext, clearContextSelection, loadProjectData } = useContextStore();

  // Load contexts when active project changes
  React.useEffect(() => {
    if (activeProject?.id) {
      loadProjectData(activeProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  // Get selected context (first one if multiple selected)
  const selectedContextId = selectedContextIds.size > 0
    ? Array.from(selectedContextIds)[0]
    : undefined;

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

  // Execute a single scan for a specific scan type
  const executeScan = async (scanType: ScanType): Promise<number> => {
    const codebaseFiles = await gatherCodebaseFiles(activeProject!.path, selectedContext?.filePaths);

    if (codebaseFiles.length === 0) {
      throw new Error('No code files found to analyze');
    }

    const response = await fetch('/api/ideas/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: activeProject!.id,
        projectName: activeProject!.name,
        projectPath: activeProject!.path,
        contextId: selectedContextId,
        provider: selectedProvider,
        scanType: scanType,
        codebaseFiles
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate ideas');
    }

    const data = await response.json();
    return data.count || 0;
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
    setTotalIdeas(0);
    setScanState('scanning');
    setIsProcessingQueue(true);
  };

  // Process queue automatically when it changes
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
        const ideaCount = await executeScan(currentScan.scanType);
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
    <div className="w-full border-b border-gray-700/40 bg-gray-900/40">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-center space-x-6">
          {/* LLM Provider Icons */}
          <div className="flex items-center space-x-2">
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
          {activeProject && projectContexts.length > 0 && (
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
              {scanState === 'scanning'
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

          {/* Status message */}
          <AnimatePresence>
            {message && (
              <motion.div
                className={`text-xs font-medium ${
                  scanState === 'success'
                    ? 'text-green-400'
                    : scanState === 'error'
                    ? 'text-red-400'
                    : 'text-blue-400'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        {scanQueue.length > 0 && (isProcessingQueue || scanState === 'scanning') && (
          <motion.div
            className="mt-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">
                Processing {scanQueue.filter(s => s.status === 'completed').length} / {scanQueue.length} scans
              </span>
              <span className="text-xs font-semibold text-blue-400">
                {totalIdeas} ideas generated
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-700/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(scanQueue.filter(s => s.status === 'completed' || s.status === 'failed').length / scanQueue.length) * 100}%` 
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            {/* Individual scan status */}
            <div className="flex flex-wrap gap-2 mt-2">
              {scanQueue.map((item, index) => {
                const config = getScanTypeConfig(item.scanType);
                return (
                  <motion.div
                    key={`${item.scanType}-${index}`}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs ${
                      item.status === 'completed'
                        ? 'bg-green-500/20 text-green-300'
                        : item.status === 'failed'
                        ? 'bg-red-500/20 text-red-300'
                        : item.status === 'running'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-gray-700/40 text-gray-400'
                    }`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span>{config?.emoji}</span>
                    <span>{config?.label}</span>
                    {item.status === 'running' && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                    {item.status === 'completed' && (
                      <span className="ml-1 font-semibold">+{item.ideaCount}</span>
                    )}
                    {item.status === 'failed' && <XCircle className="w-3 h-3 ml-1" />}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

async function gatherCodebaseFiles(
  projectPath: string,
  contextFilePaths?: string[]
): Promise<Array<{ path: string; content: string; type: string }>> {
  try {
    const filesToAnalyze = contextFilePaths || [];

    const response = await fetch('/api/project/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        filePaths: filesToAnalyze.length > 0 ? filesToAnalyze : undefined,
        limit: 20
      })
    });

    if (!response.ok) {
      console.error('Failed to fetch project files');
      return [];
    }

    const data = await response.json();
    return data.files || [];

  } catch (error) {
    console.error('Error gathering codebase files:', error);
    return [];
  }
}
