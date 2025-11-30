/**
 * Manifest Generator
 * 
 * Aggregates scan results into a RefactorManifest structure with
 * summary statistics by category and files over 200 lines.
 * 
 * Requirements: 1.3
 */

import type { ScanResult, ColorCategory } from './colorScanner';

/**
 * Status of a file in the refactoring process
 */
export type FileStatus = 'pending' | 'transformed' | 'extracted' | 'complete';

/**
 * Entry for a single file in the manifest
 */
export interface FileEntry {
  path: string;
  status: FileStatus;
  lineCount: number;
  colorReplacements: number;
  extractedComponents: string[];
}

/**
 * Summary statistics for the manifest
 */
export interface ManifestSummary {
  byCategory: Record<ColorCategory, number>;
  filesOver200Lines: number;
}

/**
 * Complete refactor manifest structure
 */
export interface RefactorManifest {
  version: string;
  timestamp: string;
  files: FileEntry[];
  summary: ManifestSummary;
  totalFiles: number;
}

/**
 * Line count threshold for flagging files that need component extraction
 */
export const LINE_COUNT_THRESHOLD = 200;

/**
 * Current manifest version
 */
export const MANIFEST_VERSION = '1.0.0';

/**
 * Converts a ScanResult to a FileEntry
 */
export function scanResultToFileEntry(scanResult: ScanResult): FileEntry {
  return {
    path: scanResult.filePath,
    status: 'pending',
    lineCount: scanResult.lineCount,
    colorReplacements: scanResult.colorPatterns.length,
    extractedComponents: [],
  };
}


/**
 * Calculates summary statistics from scan results
 */
export function calculateSummary(scanResults: ScanResult[]): ManifestSummary {
  const byCategory: Record<ColorCategory, number> = {
    text: 0,
    border: 0,
    background: 0,
    shadow: 0,
    gradient: 0,
  };

  let filesOver200Lines = 0;

  for (const result of scanResults) {
    // Count patterns by category
    for (const pattern of result.colorPatterns) {
      byCategory[pattern.category]++;
    }

    // Count files over threshold
    if (result.lineCount > LINE_COUNT_THRESHOLD) {
      filesOver200Lines++;
    }
  }

  return {
    byCategory,
    filesOver200Lines,
  };
}

/**
 * Generates a RefactorManifest from scan results
 * 
 * @param scanResults - Array of ScanResult from the color scanner
 * @returns Complete RefactorManifest with all files and summary statistics
 */
export function generateManifest(scanResults: ScanResult[]): RefactorManifest {
  const files = scanResults.map(scanResultToFileEntry);
  const summary = calculateSummary(scanResults);

  return {
    version: MANIFEST_VERSION,
    timestamp: new Date().toISOString(),
    files,
    summary,
    totalFiles: files.length,
  };
}

/**
 * Checks if a file exceeds the line count threshold
 */
export function exceedsLineThreshold(lineCount: number): boolean {
  return lineCount > LINE_COUNT_THRESHOLD;
}

/**
 * Gets all files from a manifest that exceed the line threshold
 */
export function getFilesOverThreshold(manifest: RefactorManifest): FileEntry[] {
  return manifest.files.filter(file => exceedsLineThreshold(file.lineCount));
}

/**
 * Gets the total count of color patterns across all files
 */
export function getTotalPatternCount(manifest: RefactorManifest): number {
  return manifest.files.reduce((sum, file) => sum + file.colorReplacements, 0);
}

/**
 * Updates the status of a file in the manifest
 */
export function updateFileStatus(
  manifest: RefactorManifest,
  filePath: string,
  status: FileStatus
): RefactorManifest {
  return {
    ...manifest,
    files: manifest.files.map(file =>
      file.path === filePath ? { ...file, status } : file
    ),
  };
}

/**
 * Adds an extracted component to a file entry
 */
export function addExtractedComponent(
  manifest: RefactorManifest,
  filePath: string,
  componentName: string
): RefactorManifest {
  return {
    ...manifest,
    files: manifest.files.map(file =>
      file.path === filePath
        ? { ...file, extractedComponents: [...file.extractedComponents, componentName] }
        : file
    ),
  };
}
