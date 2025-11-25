/**
 * Reusable scan operations for idea generation
 * These functions handle the core logic for initiating single and batch scans
 */

import { ScanState, QueueItem, ContextQueueItem, ScanType } from '../../lib/scanTypes';
import { initializeScanQueue, initializeContextQueue } from './scanQueue';
import { Context } from '@/lib/queries/contextQueries';

export interface ScanOperationDependencies {
  activeProject: { id: string; name: string; path: string } | null;
  selectedScanTypes: ScanType[];
  projectContexts: Context[];
  setScanQueue: (queue: QueueItem[]) => void;
  setContextQueue: (queue: ContextQueueItem[]) => void;
  setBatchMode: (mode: boolean) => void;
  setTotalIdeas: (count: number) => void;
  setScanState: (state: ScanState) => void;
  setIsProcessingQueue: (processing: boolean) => void;
  setIsProcessingContextQueue: (processing: boolean) => void;
  setShowProviderPopup?: (show: boolean) => void;
  setMessage: (message: string) => void;
}

/**
 * Initiate a single-context scan with selected scan types
 */
export async function handleScan(deps: ScanOperationDependencies): Promise<void> {
  const {
    activeProject,
    selectedScanTypes,
    setScanQueue,
    setContextQueue,
    setBatchMode,
    setTotalIdeas,
    setScanState,
    setIsProcessingQueue,
    setShowProviderPopup,
    setMessage
  } = deps;

  if (!activeProject) {
    setMessage('No active project selected');
    setScanState('error');
    setTimeout(() => setScanState('idle'), 3000);
    return;
  }

  // Initialize queue with all selected scan types
  const queue = initializeScanQueue(selectedScanTypes);

  setScanQueue(queue);
  setContextQueue([]);
  setBatchMode(false);
  setTotalIdeas(0);
  setScanState('scanning');
  setIsProcessingQueue(true);

  // Close provider popup if available
  if (setShowProviderPopup) {
    setShowProviderPopup(false);
  }
}

/**
 * Initiate a batch scan across all project contexts with selected scan types
 * Note: Always scans ALL contexts in the active project, regardless of selection
 */
export async function handleBatchScan(deps: ScanOperationDependencies): Promise<void> {
  const {
    activeProject,
    selectedScanTypes,
    projectContexts,
    setContextQueue,
    setScanQueue,
    setBatchMode,
    setTotalIdeas,
    setScanState,
    setIsProcessingContextQueue,
    setMessage
  } = deps;

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

  // Initialize context queue with ALL contexts in the project + full project × all scan types
  // Note: This deliberately scans all contexts regardless of which ones are selected in the UI
  // Map contexts to ensure null values are converted to undefined
  const mappedContexts = projectContexts.map(c => ({
    ...c,
    preview: c.preview ?? undefined,
    testScenario: c.testScenario ?? undefined,
    groupId: c.groupId ?? undefined,
  })) as any;

  const queue = initializeContextQueue(mappedContexts, selectedScanTypes);

  setContextQueue(queue);
  setScanQueue([]);
  setBatchMode(true);
  setTotalIdeas(0);
  setScanState('scanning');
  setIsProcessingContextQueue(true);
}
