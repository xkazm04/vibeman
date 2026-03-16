/**
 * File Verifier
 *
 * Post-execution verification that CLI sessions actually modified the files
 * they claimed to affect. Detects "silent failures" where a CLI session exits
 * cleanly (exit code 0) but did not create, modify, or delete expected files.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AffectedFiles } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface FileSnapshot {
  path: string;
  exists: boolean;
  mtimeMs: number;
}

export interface VerificationResult {
  passed: boolean;
  reason?: string;
}

// ============================================================================
// Snapshot
// ============================================================================

/**
 * Take a snapshot of file existence and modification times.
 * Returns one FileSnapshot per path. Missing files get exists=false, mtimeMs=0.
 */
export function snapshotFiles(projectPath: string, paths: string[]): FileSnapshot[] {
  return paths.map((filePath) => {
    const fullPath = path.join(projectPath, filePath);
    try {
      const stat = fs.statSync(fullPath);
      return { path: filePath, exists: true, mtimeMs: stat.mtimeMs };
    } catch {
      return { path: filePath, exists: false, mtimeMs: 0 };
    }
  });
}

// ============================================================================
// Verification
// ============================================================================

/**
 * Verify that execution actually modified the claimed files.
 *
 * Checks:
 * - All `create` files must exist after execution
 * - All `delete` files must NOT exist after execution
 * - At least one `modify` file must have a different mtime than before
 */
export function verifyExecution(
  projectPath: string,
  affectedFiles: AffectedFiles,
  beforeSnapshots: FileSnapshot[]
): VerificationResult {
  // Build lookup for before snapshots
  const beforeMap = new Map<string, FileSnapshot>();
  for (const snap of beforeSnapshots) {
    beforeMap.set(snap.path, snap);
  }

  // Check create: all must exist
  for (const filePath of affectedFiles.create) {
    const fullPath = path.join(projectPath, filePath);
    if (!fs.existsSync(fullPath)) {
      return { passed: false, reason: `Expected created file does not exist: ${filePath}` };
    }
  }

  // Check delete: none should exist
  for (const filePath of affectedFiles.delete) {
    const fullPath = path.join(projectPath, filePath);
    if (fs.existsSync(fullPath)) {
      return { passed: false, reason: `Expected deleted file still exists: ${filePath}` };
    }
  }

  // Check modify: at least one must have changed mtime
  if (affectedFiles.modify.length > 0) {
    let anyChanged = false;
    for (const filePath of affectedFiles.modify) {
      const fullPath = path.join(projectPath, filePath);
      const before = beforeMap.get(filePath);
      try {
        const stat = fs.statSync(fullPath);
        if (!before || stat.mtimeMs !== before.mtimeMs) {
          anyChanged = true;
          break;
        }
      } catch {
        // File doesn't exist -- could be a problem but not our check here
        // The modify check is about "at least one changed"
      }
    }
    if (!anyChanged) {
      return {
        passed: false,
        reason: `No modify files changed: expected at least one of [${affectedFiles.modify.join(', ')}] to be modified`,
      };
    }
  }

  return { passed: true };
}
