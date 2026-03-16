/**
 * Worktree Manager — Git worktree lifecycle for parallel dispatch
 *
 * Creates isolated git worktrees per task, merges branches back after
 * completion, and handles cleanup on abort/crash.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// Types
// ============================================================================

export interface WorktreeInfo {
  taskId: string;
  worktreePath: string;
  branchName: string;
  createdAt: number;
  status: 'active' | 'merged' | 'conflict' | 'cleaned';
}

export interface WorktreeCreateResult {
  success: boolean;
  worktreePath: string;
  branchName: string;
  error?: string;
}

export interface WorktreeMergeResult {
  taskId: string;
  success: boolean;
  commitSha?: string;
  conflictFiles?: string[];
  error?: string;
}

export interface WorktreeCleanupResult {
  cleaned: number;
  errors: string[];
}

// ============================================================================
// Constants
// ============================================================================

const WORKTREE_DIR = '.conductor-worktrees';

// ============================================================================
// Worktree Lifecycle
// ============================================================================

/**
 * Create a git worktree for a specific task.
 * Branch: conductor/{runId-short}/{taskId-short}
 * Path:   {projectPath}/.conductor-worktrees/{taskId-short}
 */
export function createWorktree(
  projectPath: string,
  runId: string,
  taskId: string
): WorktreeCreateResult {
  const shortRun = runId.slice(0, 8);
  const shortTask = taskId.slice(0, 8);
  const branchName = `conductor/${shortRun}/${shortTask}`;
  const worktreeDir = path.join(projectPath, WORKTREE_DIR);
  const worktreePath = path.join(worktreeDir, shortTask);

  try {
    // Ensure worktree directory exists
    if (!fs.existsSync(worktreeDir)) {
      fs.mkdirSync(worktreeDir, { recursive: true });
    }

    // Add .conductor-worktrees to .gitignore if not present
    ensureGitignore(projectPath);

    // Remove stale worktree at this path if it exists
    if (fs.existsSync(worktreePath)) {
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd: projectPath,
          stdio: 'pipe',
          timeout: 30000,
        });
      } catch {
        // Force remove directory if git worktree remove fails
        fs.rmSync(worktreePath, { recursive: true, force: true });
      }
    }

    // Delete branch if it already exists (from a previous failed run)
    try {
      execSync(`git branch -D "${branchName}"`, {
        cwd: projectPath,
        stdio: 'pipe',
        timeout: 10000,
      });
    } catch {
      // Branch doesn't exist, that's fine
    }

    // Create worktree with new branch from HEAD
    execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, {
      cwd: projectPath,
      stdio: 'pipe',
      timeout: 60000,
    });

    return { success: true, worktreePath, branchName };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, worktreePath: '', branchName: '', error: message };
  }
}

/**
 * Merge a task's worktree branch back into the current branch.
 * On conflict: aborts merge and returns conflictFiles.
 */
export function mergeWorktreeBranch(
  projectPath: string,
  branchName: string,
  taskTitle: string,
  taskId: string = ''
): WorktreeMergeResult {
  try {
    // Check if branch has commits ahead of HEAD
    const ahead = execSync(`git log HEAD.."${branchName}" --oneline`, {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();

    if (!ahead) {
      return { taskId, success: true };
    }

    // Sanitize task title for commit message
    const safeTitle = taskTitle.replace(/["`$\\]/g, '').slice(0, 72);

    // Merge with no-ff to preserve branch history
    execSync(
      `git merge --no-ff "${branchName}" -m "feat(conductor): ${safeTitle}"`,
      {
        cwd: projectPath,
        stdio: 'pipe',
        timeout: 30000,
      }
    );

    // Get merge commit SHA
    const sha = execSync('git rev-parse HEAD', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    return { taskId, success: true, commitSha: sha };
  } catch (err) {
    // Check for merge conflict
    try {
      const conflictOutput = execSync('git diff --name-only --diff-filter=U', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      if (conflictOutput) {
        // Abort the failed merge
        try {
          execSync('git merge --abort', {
            cwd: projectPath,
            stdio: 'pipe',
            timeout: 10000,
          });
        } catch {
          // merge --abort can fail if no merge in progress
        }

        return {
          taskId,
          success: false,
          conflictFiles: conflictOutput.split('\n').filter(Boolean),
          error: `Merge conflict on: ${conflictOutput.replace(/\n/g, ', ')}`,
        };
      }
    } catch {
      // Couldn't check conflicts
    }

    // Attempt to abort any partial merge
    try {
      execSync('git merge --abort', { cwd: projectPath, stdio: 'pipe', timeout: 10000 });
    } catch { /* no merge in progress */ }

    const message = err instanceof Error ? err.message : String(err);
    return { taskId, success: false, error: message };
  }
}

/**
 * Remove a single worktree and its branch.
 */
export function removeWorktree(
  projectPath: string,
  worktreePath: string,
  branchName: string
): { success: boolean; error?: string } {
  try {
    // Remove worktree
    if (worktreePath && fs.existsSync(worktreePath)) {
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd: projectPath,
          stdio: 'pipe',
          timeout: 30000,
        });
      } catch {
        // Force remove directory if git command fails
        fs.rmSync(worktreePath, { recursive: true, force: true });
      }
    }

    // Prune worktree references
    try {
      execSync('git worktree prune', {
        cwd: projectPath,
        stdio: 'pipe',
        timeout: 10000,
      });
    } catch { /* non-critical */ }

    // Delete branch
    if (branchName) {
      try {
        execSync(`git branch -D "${branchName}"`, {
          cwd: projectPath,
          stdio: 'pipe',
          timeout: 10000,
        });
      } catch { /* branch may already be deleted */ }
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Clean up ALL conductor worktrees for a given run.
 */
export function cleanupRunWorktrees(
  projectPath: string,
  _runId: string
): WorktreeCleanupResult {
  const errors: string[] = [];
  let cleaned = 0;
  const worktreeDir = path.join(projectPath, WORKTREE_DIR);

  if (!fs.existsSync(worktreeDir)) {
    return { cleaned: 0, errors: [] };
  }

  try {
    const entries = fs.readdirSync(worktreeDir);

    for (const entry of entries) {
      const entryPath = path.join(worktreeDir, entry);
      const stat = fs.statSync(entryPath);
      if (!stat.isDirectory()) continue;

      // Find matching branch name
      const branchName = findBranchForWorktree(projectPath, entryPath);

      const result = removeWorktree(projectPath, entryPath, branchName || '');
      if (result.success) {
        cleaned++;
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    // Remove the worktree directory if empty
    try {
      const remaining = fs.readdirSync(worktreeDir);
      if (remaining.length === 0) {
        fs.rmdirSync(worktreeDir);
      }
    } catch { /* non-critical */ }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return { cleaned, errors };
}

/**
 * Emergency cleanup: remove all conductor worktrees regardless of run.
 */
export function cleanupOrphanedWorktrees(
  projectPath: string
): WorktreeCleanupResult {
  // Clean up directory-based worktrees
  const dirResult = cleanupRunWorktrees(projectPath, '');

  // Also clean up any conductor/* branches
  let branchesCleaned = 0;
  const branchErrors: string[] = [];

  try {
    const branches = execSync('git branch --list "conductor/*"', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();

    if (branches) {
      for (const branch of branches.split('\n')) {
        const name = branch.trim().replace(/^\* /, '');
        if (!name) continue;
        try {
          execSync(`git branch -D "${name}"`, {
            cwd: projectPath,
            stdio: 'pipe',
            timeout: 10000,
          });
          branchesCleaned++;
        } catch (err) {
          branchErrors.push(err instanceof Error ? err.message : String(err));
        }
      }
    }
  } catch { /* no conductor branches */ }

  // Prune worktree references
  try {
    execSync('git worktree prune', { cwd: projectPath, stdio: 'pipe', timeout: 10000 });
  } catch { /* non-critical */ }

  return {
    cleaned: dirResult.cleaned + branchesCleaned,
    errors: [...dirResult.errors, ...branchErrors],
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Find the branch name associated with a worktree path.
 */
function findBranchForWorktree(projectPath: string, worktreePath: string): string | null {
  try {
    const output = execSync('git worktree list --porcelain', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 10000,
    });

    const normalizedPath = worktreePath.replace(/\\/g, '/');
    const lines = output.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('worktree ')) {
        const wtPath = line.replace('worktree ', '').replace(/\\/g, '/');
        if (wtPath === normalizedPath) {
          // Look for branch line in this block
          for (let j = i + 1; j < lines.length && lines[j] !== ''; j++) {
            if (lines[j].startsWith('branch ')) {
              const fullRef = lines[j].replace('branch ', '');
              return fullRef.replace('refs/heads/', '');
            }
          }
        }
      }
    }
  } catch { /* failed to list worktrees */ }

  return null;
}

/**
 * Ensure .conductor-worktrees is in .gitignore
 */
function ensureGitignore(projectPath: string): void {
  const gitignorePath = path.join(projectPath, '.gitignore');

  try {
    let content = '';
    if (fs.existsSync(gitignorePath)) {
      content = fs.readFileSync(gitignorePath, 'utf-8');
    }

    if (!content.includes(WORKTREE_DIR)) {
      const newline = content.endsWith('\n') || content === '' ? '' : '\n';
      fs.appendFileSync(gitignorePath, `${newline}${WORKTREE_DIR}/\n`);
    }
  } catch {
    // Non-critical — .gitignore update is best-effort
  }
}
