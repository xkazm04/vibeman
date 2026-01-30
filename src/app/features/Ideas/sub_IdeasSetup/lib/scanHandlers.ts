/**
 * Handler functions for scan operations
 * Used by scanQueueWorker and lifecycle API for background scanning
 */

import { SupportedProvider } from '@/lib/llm/types';
import { ScanType } from '../../lib/scanTypes';
import { gatherCodebaseFiles, executeScan, GatherFilesError } from '../../lib/scanApi';

// Re-export for consumers
export { GatherFilesError };

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
