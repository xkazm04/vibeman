import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type { FileAnalysis } from './types';

/**
 * File scanning utilities
 */

// Patterns to scan
const SCAN_PATTERNS = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
];

// Patterns to ignore
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.test.*',
  '**/*.spec.*',
];

/**
 * Scans project files for analysis
 */
export async function scanProjectFiles(projectPath: string): Promise<FileAnalysis[]> {
  const files: FileAnalysis[] = [];

  for (const pattern of SCAN_PATTERNS) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore: IGNORE_PATTERNS,
      absolute: true,
      windowsPathsNoEscape: true, // Support Windows paths
    });

    // Ensure matches is an array
    const matchArray = Array.isArray(matches) ? matches : [];

    for (const filePath of matchArray) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').length;
        const size = Buffer.byteLength(content, 'utf-8');

        files.push({
          path: path.relative(projectPath, filePath),
          content,
          size,
          lines,
        });
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    }
  }

  return files;
}
