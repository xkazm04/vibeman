/**
 * File Discovery
 *
 * Context-first file discovery with keyword fallback for the goal analyzer.
 * Finds relevant project files to feed into gap analysis.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DiscoveredFile } from './goalAnalyzer.types';

const EXCLUDED_DIRS = ['node_modules', '.next', '.git', 'dist', '.turbo', '.vercel', 'coverage'];
const MAX_FILES = 20;
const MAX_LINES_PER_FILE = 200;
const MAX_TREE_ENTRIES = 200;

/**
 * Normalize a file path for cross-platform compatibility.
 * Uses node:path.normalize() + backslash-to-forward-slash replace (Phase 3 pattern).
 */
function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Extract keywords from goal text for file matching.
 * Splits on whitespace/punctuation, filters words > 4 chars, lowercased, deduplicated.
 */
function extractKeywords(text: string): string[] {
  const words = text.split(/[\s,.;:!?()[\]{}"'`<>/\\|@#$%^&*+=~]+/);
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const word of words) {
    const lower = word.toLowerCase();
    if (lower.length > 4 && !seen.has(lower)) {
      seen.add(lower);
      keywords.push(lower);
    }
  }

  return keywords;
}

/**
 * Recursively walk a directory, returning file paths.
 * Skips excluded directories.
 */
function walkDirectory(dir: string, excludes: string[]): string[] {
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (excludes.includes(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...walkDirectory(fullPath, excludes));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Build an indented file tree string from a directory.
 * Capped at MAX_TREE_ENTRIES to avoid overwhelming context.
 */
function buildFileTree(projectPath: string): string {
  const srcDir = path.join(projectPath, 'src');
  const baseDir = fs.existsSync(srcDir) ? srcDir : projectPath;
  const allFiles = walkDirectory(baseDir, EXCLUDED_DIRS);

  const lines: string[] = [];
  const baseParts = normalizePath(baseDir).split('/').length;

  for (const filePath of allFiles) {
    if (lines.length >= MAX_TREE_ENTRIES) break;

    const normalized = normalizePath(filePath);
    const parts = normalized.split('/');
    const relativeParts = parts.slice(baseParts);
    const indent = '  '.repeat(Math.max(0, relativeParts.length - 1));
    lines.push(`${indent}${relativeParts[relativeParts.length - 1]}`);
  }

  return lines.join('\n');
}

/**
 * Read first N lines of a file, returning content string.
 * Returns placeholder on error.
 */
function readFileContent(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    return lines.slice(0, MAX_LINES_PER_FILE).join('\n');
  } catch {
    return '// [file not readable]';
  }
}

/**
 * Discover relevant files for goal analysis.
 *
 * Strategy:
 * 1. Context-first: If contextId is provided, look up the context's file_paths from DB
 * 2. Keyword fallback: Extract keywords from goal text, match against src/ files
 *
 * Returns discovered file contents (capped at MAX_FILES) and a file tree string.
 */
export function discoverRelevantFiles(
  projectId: string,
  projectPath: string,
  contextId: string | null,
  goalText: string
): { files: DiscoveredFile[]; fileTree: string } {
  let filePaths: string[] = [];

  // Strategy 1: Context-first lookup
  if (contextId) {
    try {
      // Dynamic import to avoid circular dependency issues at module load time
      // contextDb.getContextById returns a DbContext with file_paths as JSON string
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { contextDb } = require('@/app/db');
      const context = contextDb.getContextById(contextId);
      if (context && context.file_paths) {
        const parsed = typeof context.file_paths === 'string'
          ? JSON.parse(context.file_paths)
          : context.file_paths;
        if (Array.isArray(parsed) && parsed.length > 0) {
          filePaths = parsed.map((p: string) => {
            // Resolve relative paths against project path
            const resolved = path.isAbsolute(p) ? p : path.join(projectPath, p);
            return normalizePath(resolved);
          });
        }
      }
    } catch {
      // Fall through to keyword fallback
    }
  }

  // Strategy 2: Keyword fallback
  if (filePaths.length === 0) {
    const keywords = extractKeywords(goalText);
    const srcDir = path.join(projectPath, 'src');
    const searchDir = fs.existsSync(srcDir) ? srcDir : projectPath;
    const allFiles = walkDirectory(searchDir, EXCLUDED_DIRS);

    filePaths = allFiles
      .map(f => normalizePath(f))
      .filter(f => {
        const lower = f.toLowerCase();
        return keywords.some(kw => lower.includes(kw));
      });
  }

  // Cap at MAX_FILES and read contents
  const cappedPaths = filePaths.slice(0, MAX_FILES);
  const files: DiscoveredFile[] = cappedPaths.map(p => ({
    path: normalizePath(p),
    content: readFileContent(p),
  }));

  const fileTree = buildFileTree(projectPath);

  return { files, fileTree };
}
