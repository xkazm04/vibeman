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
 * Error thrown when gathering codebase files fails
 */
export class GatherFilesError extends Error {
  constructor(
    message: string,
    public readonly code: 'NETWORK_ERROR' | 'NOT_FOUND' | 'PERMISSION_DENIED' | 'SERVER_ERROR' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GatherFilesError';
  }
}

/**
 * Gather codebase files for analysis
 * @throws {GatherFilesError} When files cannot be gathered due to network, permission, or server errors
 */
export async function gatherCodebaseFiles(
  projectPath: string,
  contextFilePaths?: string[]
): Promise<CodebaseFile[]> {
  const filesToAnalyze = contextFilePaths || [];

  let response: Response;
  try {
    response = await fetch('/api/project/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        filePaths: filesToAnalyze.length > 0 ? filesToAnalyze : undefined,
        limit: 20
      })
    });
  } catch (error) {
    throw new GatherFilesError(
      `Network error fetching files for ${projectPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    let errorMessage = 'Unknown error';
    let errorCode: GatherFilesError['code'] = 'UNKNOWN';

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    switch (response.status) {
      case 404:
        errorCode = 'NOT_FOUND';
        errorMessage = `Project not found: ${projectPath}`;
        break;
      case 403:
        errorCode = 'PERMISSION_DENIED';
        errorMessage = `Permission denied accessing: ${projectPath}`;
        break;
      case 500:
      case 502:
      case 503:
        errorCode = 'SERVER_ERROR';
        break;
    }

    throw new GatherFilesError(errorMessage, errorCode);
  }

  const data = await response.json();
  return data.files || [];
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
