import * as fs from 'fs/promises';
import * as path from 'path';
import { minimatch } from 'minimatch';

/**
 * File Scanner Module
 *
 * Provides file system scanning utilities for project structure validation.
 * All paths are normalized to forward slashes for cross-OS compatibility.
 */

/** Default glob patterns for directories/files to ignore during scanning. */
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules/**',
  '.next/**',
  '.git/**',
  'dist/**',
  'build/**',
  '__pycache__/**',
  '*.pyc',
  '.venv/**',
  'venv/**',
  '.claude/**',
  'database/**',
  'context/**',
  'public/**',
];

/** Describes an item (file or directory) discovered during a project scan. */
export interface ScannedItem {
  isDirectory: boolean;
  relativePath: string;
}

/**
 * Normalize a file path to use forward slashes.
 * Ensures consistent path separators across Windows and Unix systems.
 *
 * @param filePath - The path to normalize (may contain backslashes on Windows)
 * @returns The path with all backslashes replaced by forward slashes
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Check if a relative path should be ignored based on glob patterns.
 *
 * @param relativePath - The path relative to the project root (forward-slash separated)
 * @param ignorePatterns - Array of glob patterns to match against
 * @returns `true` if the path matches any ignore pattern
 */
export function shouldIgnorePath(relativePath: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern => minimatch(relativePath, pattern, { dot: true }));
}

/**
 * Build a relative path by joining a parent path and entry name.
 */
function buildRelativePath(relativePath: string, entryName: string): string {
  return relativePath ? `${relativePath}/${entryName}` : entryName;
}

/**
 * Recursively collect all file paths under a directory.
 *
 * Walks the file tree starting at `dirPath`, returning relative paths
 * (forward-slash separated) for every file that does not match an ignore pattern.
 *
 * @param dirPath - Absolute path to the directory to scan
 * @param ignorePatterns - Glob patterns for paths to skip (defaults to empty)
 * @returns Array of relative file paths with forward slashes
 *
 * @example
 * ```ts
 * const files = await getAllFiles('/project', ['node_modules/**']);
 * // => ['src/index.ts', 'src/lib/utils.ts', ...]
 * ```
 */
export async function getAllFiles(
  dirPath: string,
  ignorePatterns: string[] = []
): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentPath: string, relativePath: string = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelPath = buildRelativePath(relativePath, entry.name);
        const entryFullPath = path.join(currentPath, entry.name);

        if (shouldIgnorePath(entryRelPath, ignorePatterns)) continue;

        if (entry.isDirectory()) {
          await scan(entryFullPath, entryRelPath);
        } else if (entry.isFile()) {
          files.push(normalizePath(entryRelPath));
        }
      }
    } catch {
      // Silently skip directories that can't be read
    }
  }

  await scan(dirPath);
  return files;
}

/**
 * Recursively scan a project directory and collect every file and folder.
 *
 * Returns a `Map` keyed by normalized relative path, where each value
 * indicates whether the entry is a directory or file.
 *
 * @param projectPath - Absolute path to the project root
 * @param ignorePatterns - Glob patterns for paths to skip (defaults to empty)
 * @returns Map of relative path to {@link ScannedItem}
 *
 * @example
 * ```ts
 * const items = await getProjectDirectories('/project', getDefaultIgnorePatterns());
 * for (const [path, item] of items) {
 *   console.log(path, item.isDirectory ? 'dir' : 'file');
 * }
 * ```
 */
export async function getProjectDirectories(
  projectPath: string,
  ignorePatterns: string[] = []
): Promise<Map<string, ScannedItem>> {
  const items = new Map<string, ScannedItem>();

  async function scan(currentPath: string, relativePath: string = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelPath = buildRelativePath(relativePath, entry.name);
        const entryFullPath = path.join(currentPath, entry.name);

        if (shouldIgnorePath(entryRelPath, ignorePatterns)) continue;

        const normalizedEntryPath = normalizePath(entryRelPath);
        items.set(normalizedEntryPath, {
          isDirectory: entry.isDirectory(),
          relativePath: normalizedEntryPath,
        });

        if (entry.isDirectory()) {
          await scan(entryFullPath, entryRelPath);
        }
      }
    } catch {
      // Silently skip directories that can't be read
    }
  }

  await scan(projectPath);
  return items;
}

/**
 * Filter a list of file paths against a glob pattern.
 *
 * @param files - Array of relative file paths to filter
 * @param pattern - Glob pattern to match (e.g. `"src/pages/**"`)
 * @returns Subset of `files` that match the pattern
 */
export function matchPattern(files: string[], pattern: string): string[] {
  return files.filter(file => minimatch(file, pattern, { dot: true }));
}

/**
 * Check if a file or folder name matches a name pattern.
 *
 * Supports exact matches and wildcard patterns via minimatch
 * (e.g. `"*-page"`, `"sub_*"`, `"*.tsx"`). The special pattern
 * `"*"` matches any name.
 *
 * @param name - The file or folder name to test
 * @param pattern - The pattern to match against
 * @returns `true` if the name matches the pattern
 */
export function matchesNamePattern(name: string, pattern: string): boolean {
  if (pattern === '*') return true;

  if (pattern.includes('*')) {
    return minimatch(name, pattern, { dot: true });
  }

  return name === pattern;
}

/**
 * Check if a full relative path matches a path pattern.
 *
 * Each segment of the path is compared against the corresponding
 * segment in the pattern using {@link matchesNamePattern}, so
 * `"src/app/features/sub_auth"` matches `"src/app/features/sub_*"`.
 *
 * @param actualPath - The path to test (forward-slash separated)
 * @param patternPath - The pattern path, may contain wildcards in segments
 * @returns `true` if every segment matches and segment counts are equal
 */
export function matchesPathPattern(actualPath: string, patternPath: string): boolean {
  if (!patternPath.includes('*')) {
    return actualPath === patternPath;
  }

  const actualParts = actualPath.split('/');
  const patternParts = patternPath.split('/');

  if (actualParts.length !== patternParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    if (!matchesNamePattern(actualParts[i], patternParts[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Return the default set of ignore patterns used during project scanning.
 *
 * Includes common build artifacts, dependency folders, and tool-specific
 * directories (e.g. `node_modules`, `.next`, `.git`, `__pycache__`).
 *
 * @returns A new array of glob pattern strings
 */
export function getDefaultIgnorePatterns(): string[] {
  return [...DEFAULT_IGNORE_PATTERNS];
}
