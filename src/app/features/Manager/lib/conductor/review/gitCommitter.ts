/**
 * Git Committer
 *
 * Stages specific files and creates a conventional commit after
 * successful build validation and LLM review. Uses execSync
 * matching the buildValidator.ts pattern.
 */

import { execSync } from 'child_process';
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
      execSync(`git add "${normalized}"`, {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 10000,
      });
    }

    // Build conventional commit message
    const safeTitle = goalTitle.replace(/"/g, '\\"');
    const message = `feat(conductor): ${safeTitle} - ${specsExecuted} specs executed, ${filesChanged.length} files changed`;

    execSync(`git commit -m "${message}"`, {
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
