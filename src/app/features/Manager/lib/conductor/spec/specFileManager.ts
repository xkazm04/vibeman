/**
 * Spec File Manager — Filesystem operations for spec files
 *
 * Handles creation, writing, and cleanup of spec markdown files
 * in the .conductor/runs/{runId}/specs/ directory.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export const specFileManager = {
  /**
   * Create the specs directory for a run, returning its absolute path.
   * Uses process.cwd() as base (project root).
   */
  async ensureSpecDir(runId: string): Promise<string> {
    const specDir = path.join(process.cwd(), '.conductor', 'runs', runId, 'specs');
    await fs.mkdir(specDir, { recursive: true });
    return specDir;
  },

  /**
   * Write a spec markdown file to the specs directory.
   * Returns the full file path.
   */
  async writeSpec(specDir: string, filename: string, content: string): Promise<string> {
    const filePath = path.join(specDir, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  },

  /**
   * Remove the specs directory and all contents for a run.
   * Used for cleanup after successful run completion.
   * Silently succeeds if directory doesn't exist.
   */
  async deleteSpecDir(runId: string): Promise<void> {
    const specDir = path.join(process.cwd(), '.conductor', 'runs', runId, 'specs');
    try {
      await fs.rm(specDir, { recursive: true, force: true });
    } catch {
      // Silently succeed if directory doesn't exist
    }
  },

  /**
   * Format a spec filename with zero-padded sequence number and slug.
   * Example: formatFilename(1, "fix-auth-middleware") => "001-fix-auth-middleware.md"
   */
  formatFilename(sequenceNumber: number, slug: string): string {
    const padded = String(sequenceNumber).padStart(3, '0');
    return `${padded}-${slug}.md`;
  },
};
