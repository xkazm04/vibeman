/**
 * Unified File Gatherer
 *
 * Abstracts file gathering for both HTTP and filesystem modes.
 * Callers provide configuration to choose which mode.
 */

import type { FileGatherer, CodebaseFile, ScanConfig } from './types';
import { ScanError } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// HTTP-Based File Gatherer (for remote/API-based scanning)
// ─────────────────────────────────────────────────────────────────────────────

class HttpFileGatherer implements FileGatherer {
  async gather(
    config: ScanConfig,
    filters?: {
      extensions?: string[];
      exclude?: string[];
      maxFileSize?: number;
    }
  ): Promise<CodebaseFile[]> {
    try {
      // Call /api/files/gather endpoint
      const response = await fetch('/api/files/gather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: config.projectPath,
          projectId: config.projectId,
          filters,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      throw new ScanError(
        'http_gather_failed',
        `Failed to gather files via HTTP: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error }
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Filesystem-Based File Gatherer (for local scanning)
// ─────────────────────────────────────────────────────────────────────────────

class FilesystemFileGatherer implements FileGatherer {
  async gather(
    config: ScanConfig,
    filters?: {
      extensions?: string[];
      exclude?: string[];
      maxFileSize?: number;
    }
  ): Promise<CodebaseFile[]> {
    // This implementation requires server-side filesystem access
    // For client-side code, this will delegate to server API endpoint
    try {
      const response = await fetch('/api/files/gather-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: config.projectPath,
          projectId: config.projectId,
          filters,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      throw new ScanError(
        'fs_gather_failed',
        `Failed to gather files from filesystem: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error }
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a file gatherer for the specified mode.
 * @param mode 'http' for remote API gathering, 'filesystem' for local FS access
 */
export function createFileGatherer(mode: 'http' | 'filesystem' = 'http'): FileGatherer {
  switch (mode) {
    case 'filesystem':
      return new FilesystemFileGatherer();
    case 'http':
    default:
      return new HttpFileGatherer();
  }
}

/**
 * Get default file gatherer (HTTP-based for broad compatibility).
 */
export function getDefaultFileGatherer(): FileGatherer {
  return createFileGatherer('http');
}
