import * as fs from 'fs/promises';
import * as path from 'path';
import { minimatch } from 'minimatch';

/**
 * File Scanner Module
 * Handles file system scanning operations for structure validation
 */

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
        const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        const entryFullPath = path.join(currentPath, entry.name);

        // Check if should ignore
        const shouldIgnore = ignorePatterns.some(pattern =>
          minimatch(entryRelPath, pattern, { dot: true })
        );

        if (shouldIgnore) continue;

        if (entry.isDirectory()) {
          await scan(entryFullPath, entryRelPath);
        } else if (entry.isFile()) {
          // Use forward slashes for consistency
          files.push(entryRelPath.replace(/\\/g, '/'));
        }
      }
    } catch (error) {
      console.error(`[FileScanner] Error scanning ${currentPath}:`, error);
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
        const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        const entryFullPath = path.join(currentPath, entry.name);

        // Check if should ignore
        const shouldIgnore = ignorePatterns.some(pattern =>
          minimatch(entryRelPath, pattern, { dot: true })
        );

        if (shouldIgnore) continue;

        // Store this item
        const normalizedPath = entryRelPath.replace(/\\/g, '/');
        items.set(normalizedPath, {
          isDirectory: entry.isDirectory(),
          relativePath: normalizedPath,
        });

        if (entry.isDirectory()) {
          await scan(entryFullPath, entryRelPath);
        }
      }
    } catch (error) {
      console.error(`[FileScanner] Error scanning ${currentPath}:`, error);
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
