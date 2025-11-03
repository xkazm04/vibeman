/**
 * API handlers for scanning operations
 */

import { SupportedProvider } from '@/lib/llm/types';
import { ScanType } from './scanTypes';

interface CodebaseFile {
  path: string;
  content: string;
  type: string;
}

/**
 * Gather codebase files for analysis
 */
export async function gatherCodebaseFiles(
  projectPath: string,
  contextFilePaths?: string[]
): Promise<CodebaseFile[]> {
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
      return [];
    }

    const data = await response.json();
    return data.files || [];

  } catch (error) {
    return [];
  }
}

/**
 * Execute a single scan for a specific scan type
 */
export async function executeScan(params: {
  projectId: string;
  projectName: string;
  projectPath: string;
  contextId?: string;
  provider: SupportedProvider;
  scanType: ScanType;
  codebaseFiles: CodebaseFile[];
}): Promise<number> {
  const response = await fetch('/api/ideas/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate ideas');
  }

  const data = await response.json();
  return data.count || 0;
}

/**
 * Delete all ideas from the database
 */
export async function deleteAllIdeas(): Promise<{ success: boolean; deletedCount: number }> {
  const response = await fetch('/api/ideas?all=true', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to delete ideas');
  }

  return response.json();
}
