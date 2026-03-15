/**
 * FileWalker
 *
 * Shared file discovery utilities consumed by all scanning paths.
 * Centralises the three previously duplicated implementations:
 *   - structureScanService (scanDirectory / getAllFiles)
 *   - ChunkedFileScanner (glob + chunkArray)
 *   - RefactorScanStrategy.scanProjectFiles (glob)
 *
 * Capabilities:
 *   - Recursive directory walking with minimatch-based ignore patterns
 *   - Glob-based file discovery with deduplication
 *   - Optional size filtering
 *   - Chunked iteration helpers
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';

// ─────────────────────────────────────────────────────────────────────────────
// Walk options
// ─────────────────────────────────────────────────────────────────────────────

export interface WalkOptions {
  /** Minimatch-style patterns to skip (e.g. 'node_modules/**') */
  ignorePatterns?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Glob options
// ─────────────────────────────────────────────────────────────────────────────

export interface GlobOptions {
  /** Glob-style ignore patterns passed directly to the glob library */
  ignorePatterns?: string[];
  /** Return absolute paths (default: true) */
  absolute?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Directory walking (replaces structureScanService's scanDirectory/getAllFiles)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively walk `dirPath` and return relative POSIX file paths.
 * Entries matching any `ignorePatterns` glob are skipped.
 */
export async function walkDirectory(
  dirPath: string,
  options: WalkOptions = {}
): Promise<string[]> {
  const { ignorePatterns = [] } = options;
  const files: string[] = [];
  await _recurse(dirPath, '', ignorePatterns, files);
  return files;
}

async function _recurse(
  currentPath: string,
  relativePath: string,
  ignorePatterns: string[],
  files: string[]
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch {
    return; // unreadable directory — skip silently
  }

  for (const entry of entries) {
    const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const entryFullPath = path.join(currentPath, entry.name);

    if (ignorePatterns.some(p => minimatch(entryRelPath, p, { dot: true }))) continue;

    if (entry.isDirectory()) {
      await _recurse(entryFullPath, entryRelPath, ignorePatterns, files);
    } else if (entry.isFile()) {
      files.push(entryRelPath.replace(/\\/g, '/'));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Glob-based discovery (replaces ChunkedFileScanner + RefactorScanStrategy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find files matching `patterns` within `projectPath`.
 * Results are deduplicated; absolute paths are returned by default.
 */
export async function globFiles(
  projectPath: string,
  patterns: string[],
  options: GlobOptions = {}
): Promise<string[]> {
  const { ignorePatterns = [], absolute = true } = options;
  const seen = new Set<string>();
  const results: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore: ignorePatterns,
      absolute,
      windowsPathsNoEscape: true,
      nodir: true,
    });

    for (const match of matches) {
      if (!seen.has(match)) {
        seen.add(match);
        results.push(match);
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunking helper (replaces ChunkedFileScanner's local chunkArray)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split `array` into sub-arrays of at most `size` elements.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
