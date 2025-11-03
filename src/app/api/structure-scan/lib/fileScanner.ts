import * as fs from 'fs/promises';
import * as path from 'path';
import { minimatch } from 'minimatch';

/**
 * File Scanner Module
 * Handles file system scanning operations for structure validation
 */

/**
 * Check if an entry should be ignored based on patterns
 */
function shouldIgnoreEntry(relativePath: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern => minimatch(relativePath, pattern, { dot: true }));
}

/**
 * Normalize path to use forward slashes
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Build relative path for an entry
 */
function buildRelativePath(relativePath: string, entryName: string): string {
  return relativePath ? `${relativePath}/${entryName}` : entryName;
}

/**
 * Recursively get all files in a directory
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

        if (shouldIgnoreEntry(entryRelPath, ignorePatterns)) continue;

        if (entry.isDirectory()) {
          await scan(entryFullPath, entryRelPath);
        } else if (entry.isFile()) {
          files.push(normalizePath(entryRelPath));
        }
      }
    } catch (error) {
      // Silently skip directories that can't be read
    }
  }

  await scan(dirPath);
  return files;
}

/**
 * Get unique directories and files from project
 */
export async function getProjectDirectories(
  projectPath: string,
  ignorePatterns: string[] = []
): Promise<Map<string, { isDirectory: boolean; relativePath: string }>> {
  const items = new Map<string, { isDirectory: boolean; relativePath: string }>();

  async function scan(currentPath: string, relativePath: string = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelPath = buildRelativePath(relativePath, entry.name);
        const entryFullPath = path.join(currentPath, entry.name);

        if (shouldIgnoreEntry(entryRelPath, ignorePatterns)) continue;

        const normalizedPath = normalizePath(entryRelPath);
        items.set(normalizedPath, {
          isDirectory: entry.isDirectory(),
          relativePath: normalizedPath,
        });

        if (entry.isDirectory()) {
          await scan(entryFullPath, entryRelPath);
        }
      }
    } catch (error) {
      // Silently skip directories that can't be read
    }
  }

  await scan(projectPath);
  return items;
}

/**
 * Match files against a glob pattern
 */
export function matchPattern(files: string[], pattern: string): string[] {
  return files.filter(file => minimatch(file, pattern, { dot: true }));
}

/**
 * Check if a name matches a pattern (supports wildcards)
 */
export function matchesNamePattern(name: string, pattern: string): boolean {
  if (pattern === '*') return true;

  if (pattern.includes('*')) {
    return minimatch(name, pattern, { dot: true });
  }

  return name === pattern;
}

/**
 * Check if a path matches a pattern
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
 * Get default ignore patterns for scanning
 */
export function getDefaultIgnorePatterns(): string[] {
  return [
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
}
