/**
 * Handler functions for scan operations
 */

import { SupportedProvider } from '@/lib/llm/types';
import { ScanType } from '../../lib/scanTypes';
import { gatherCodebaseFiles, executeScan } from '../../lib/scanApi';

export interface ExecuteContextScanParams {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanType: ScanType;
  provider: SupportedProvider;
  contextId?: string;
  contextFilePaths?: string[];
}

/**
 * Execute a single scan for a specific scan type and context
 */
export async function executeContextScan(params: ExecuteContextScanParams): Promise<number> {
  const { projectPath, contextFilePaths, ...restParams } = params;

  const codebaseFiles = await gatherCodebaseFiles(projectPath, contextFilePaths);

  if (codebaseFiles.length === 0) {
    throw new Error('No code files found to analyze');
  }

  return executeScan({
    ...restParams,
    projectPath,
    codebaseFiles
  });
}

/**
 * Get button color based on scan state
 */
export function getButtonColor(scanState: 'idle' | 'scanning' | 'success' | 'error'): string {
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
}

/**
 * Get button text based on scan state
 */
export function getButtonText(
  scanState: 'idle' | 'scanning' | 'success' | 'error',
  batchMode: boolean,
  selectedScanTypesCount: number
): string {
  if (scanState === 'scanning' && !batchMode) {
    return 'Scanning...';
  }
  if (scanState === 'success') {
    return '✓ Success!';
  }
  if (scanState === 'error') {
    return 'Error';
  }
  if (selectedScanTypesCount > 1) {
    return `Generate Ideas (${selectedScanTypesCount})`;
  }
  return 'Generate Ideas';
}
