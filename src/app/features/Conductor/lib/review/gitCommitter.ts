/**
 * Git Committer
 *
 * Stages specific files and creates a conventional commit after
 * successful build validation and LLM review. Uses execSync
 * matching the buildValidator.ts pattern.
 */

import { execFileSync, execSync } from 'child_process';
import type { BuildResult } from '../execution/buildValidator';
import type { ReviewStageResult } from './reviewTypes';

// ============================================================================
// Commit Gate
// ============================================================================

/**
 * Check if auto-commit is allowed.
 *
 * Returns true only if:
 * - Build passed (or was skipped)
 * - LLM review passed overall
 */
export function canCommit(
  buildResult: BuildResult,
  reviewResult: ReviewStageResult
): boolean {
  const buildOk = buildResult.passed === true || buildResult.skipped === true;
  const reviewOk = reviewResult.overallPassed === true;
  return buildOk && reviewOk;
}

// ============================================================================
// Commit Execution
// ============================================================================

/**
 * Stage specific files and create a conventional commit.
 *
 * - Stages only the listed files (not git add -A)
 * - Creates a conventional commit with goal title and stats
 * - Returns the commit SHA on success, null on failure
 */
export function commitChanges(
  projectPath: string,
  goalTitle: string,
  specsExecuted: number,
  filesChanged: string[]
): { sha: string } | null {
  try {
    // Stage only specific changed files
    for (const file of filesChanged) {
      const normalized = file.replace(/\\/g, '/');
      execFileSync('git', ['add', normalized], {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 10000,
      });
    }

    // Build conventional commit message — safe from injection via execFileSync argv
    const message = `feat(conductor): ${goalTitle} - ${specsExecuted} specs executed, ${filesChanged.length} files changed`;

    execFileSync('git', ['commit', '-m', message], {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
    });

    // Get commit SHA
    const sha = execSync('git rev-parse HEAD', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    return { sha };
  } catch (error) {
    console.error('[review] Auto-commit failed:', error);
    return null;
  }
}

// ============================================================================
// Incremental Per-Task Commit
// ============================================================================

/**
 * Stage and commit files from a single successful spec execution.
 * Used for incremental commits during execute stage.
 */
export function commitPerTask(
  projectPath: string,
  specTitle: string,
  filesChanged: string[]
): { sha: string } | null {
  if (filesChanged.length === 0) return null;

  try {
    for (const file of filesChanged) {
      const normalized = file.replace(/\\/g, '/');
      try {
        execFileSync('git', ['add', normalized], {
          cwd: projectPath,
          encoding: 'utf-8',
          timeout: 10000,
        });
      } catch {
        // File may have been deleted or not exist, skip it
      }
    }

    // Check if there are staged changes
    const staged = execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 5000,
    }).toString().trim();

    if (!staged) return null;

    const message = `feat(conductor): ${specTitle.slice(0, 72)}`;

    execFileSync('git', ['commit', '-m', message], {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
    });

    const sha = execSync('git rev-parse HEAD', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    return { sha };
  } catch (error) {
    console.error('[execute] Incremental commit failed:', error);
    return null;
  }
}
