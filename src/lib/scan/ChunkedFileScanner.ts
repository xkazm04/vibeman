/**
 * Chunked File Scanner
 *
 * Splits large codebase scanning into manageable chunks to prevent memory issues
 * and provide progressive feedback during the scanning process.
 *
 * Performance optimizations:
 * - Processes files in chunks to avoid memory overflow
 * - Reports progress after each chunk
 * - Allows early termination if needed
 * - Concurrent file reading within chunks (configurable)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/refactorAnalyzer';

export interface ChunkedScanOptions {
  /** Maximum number of files to process in a single chunk */
  chunkSize?: number;
  /** Maximum file size to read (in bytes) - skip larger files */
  maxFileSize?: number;
  /** Callback for progress updates */
  onProgress?: (processed: number, total: number, currentFile: string) => void;
  /** Callback for chunk completion */
  onChunkComplete?: (chunkIndex: number, filesInChunk: number) => void;
  /** Number of concurrent file reads within a chunk */
  concurrency?: number;
}

export interface ChunkedScanResult {
  files: FileAnalysis[];
  totalFiles: number;
  totalSize: number;
  skippedFiles: number;
  chunksProcessed: number;
}

const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_MAX_FILE_SIZE = 1024 * 1024; // 1MB
const DEFAULT_CONCURRENCY = 10;

/**
 * Chunk an array into smaller arrays
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process files concurrently with a concurrency limit
 */
async function processConcurrently<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Scan project files in chunks with progress tracking
 */
export async function scanProjectFilesChunked(
  projectPath: string,
  scanPatterns: string[],
  ignorePatterns: string[],
  options: ChunkedScanOptions = {}
): Promise<ChunkedScanResult> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    onProgress,
    onChunkComplete,
    concurrency = DEFAULT_CONCURRENCY
  } = options;

  // Step 1: Find all matching files
  const allFilePaths: string[] = [];

  for (const pattern of scanPatterns) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore: ignorePatterns,
      absolute: true,
      windowsPathsNoEscape: true,
    });

    const matchArray = Array.isArray(matches) ? matches : [];
    allFilePaths.push(...matchArray);
  }

  const uniqueFilePaths = Array.from(new Set(allFilePaths));
  const totalFiles = uniqueFilePaths.length;

  console.log(`[ChunkedFileScanner] Found ${totalFiles} files to scan`);

  // Step 2: Process files in chunks
  const chunks = chunkArray(uniqueFilePaths, chunkSize);
  const files: FileAnalysis[] = [];
  let totalSize = 0;
  let skippedFiles = 0;
  let processedFiles = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    console.log(`[ChunkedFileScanner] Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} files)`);

    // Process files in this chunk concurrently
    const chunkResults = await processConcurrently(
      chunk,
      async (filePath: string) => {
        try {
          // Check file size first
          const stats = await fs.stat(filePath);
          if (stats.size > maxFileSize) {
            console.log(`[ChunkedFileScanner] Skipping large file: ${filePath} (${stats.size} bytes)`);
            skippedFiles++;
            return null;
          }

          // Read file content
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n').length;
          const size = Buffer.byteLength(content, 'utf-8');

          totalSize += size;
          processedFiles++;

          // Report progress
          if (onProgress) {
            const relativePath = path.relative(projectPath, filePath);
            onProgress(processedFiles, totalFiles, relativePath);
          }

          return {
            path: path.relative(projectPath, filePath),
            content,
            size,
            lines,
          } as FileAnalysis;
        } catch (error) {
          console.warn(`[ChunkedFileScanner] Failed to read file: ${filePath}`, error);
          skippedFiles++;
          return null;
        }
      },
      concurrency
    );

    // Filter out null results and add to files array
    const validFiles = chunkResults.filter((f): f is FileAnalysis => f !== null);
    files.push(...validFiles);

    // Report chunk completion
    if (onChunkComplete) {
      onChunkComplete(chunkIndex, validFiles.length);
    }
  }

  console.log(`[ChunkedFileScanner] Completed: ${files.length} files processed, ${skippedFiles} skipped`);

  return {
    files,
    totalFiles,
    totalSize,
    skippedFiles,
    chunksProcessed: chunks.length,
  };
}

/**
 * Estimate optimal chunk size based on file count
 */
export function estimateChunkSize(totalFiles: number): number {
  if (totalFiles < 100) return totalFiles; // Process all at once
  if (totalFiles < 500) return 100;
  if (totalFiles < 2000) return 200;
  return 250; // For very large codebases
}

/**
 * Calculate total chunks that will be created
 */
export function calculateChunkCount(totalFiles: number, chunkSize: number): number {
  return Math.ceil(totalFiles / chunkSize);
}
