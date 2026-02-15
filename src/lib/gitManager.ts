import { execFile } from 'child_process';
import { promisify } from 'util';
import { GitStatus } from '@/types';
import { validateBranchName } from './command/shellEscape';
import { validateProjectPath, recordExecution, recordFailure } from './command/commandSandbox';

const execFileAsync = promisify(execFile);

/** Max buffer for git output (5MB) */
const GIT_MAX_BUFFER = 5 * 1024 * 1024;
/** Default timeout for git operations (30s) */
const GIT_TIMEOUT = 30_000;

/**
 * Execute a git command safely using execFile (no shell interpolation).
 * All arguments are passed as array elements, never interpolated into strings.
 */
async function gitExec(
  args: string[],
  cwd: string,
  options?: { timeout?: number; maxBuffer?: number }
): Promise<{ stdout: string; stderr: string }> {
  const pathCheck = validateProjectPath(cwd);
  if (!pathCheck.valid) {
    throw new Error(`Invalid git working directory: ${pathCheck.error}`);
  }

  const start = Date.now();
  try {
    const result = await execFileAsync('git', args, {
      cwd: pathCheck.resolved,
      timeout: options?.timeout ?? GIT_TIMEOUT,
      maxBuffer: options?.maxBuffer ?? GIT_MAX_BUFFER,
    });
    recordExecution('git', args, Date.now() - start);
    return {
      stdout: result.stdout?.toString() ?? '',
      stderr: result.stderr?.toString() ?? '',
    };
  } catch (error) {
    recordFailure('git', args, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export class GitManager {
  /**
   * Check if a directory is a git repository
   */
  static async isGitRepo(repoPath: string): Promise<boolean> {
    try {
      await gitExec(['rev-parse', '--git-dir'], repoPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  static async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      const { stdout } = await gitExec(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath);
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error}`);
    }
  }

  /**
   * Fetch latest changes from remote
   */
  static async fetch(repoPath: string): Promise<void> {
    try {
      await gitExec(['fetch'], repoPath);
    } catch (error) {
      throw new Error(`Failed to fetch: ${error}`);
    }
  }

  /**
   * Get git status including ahead/behind commits
   */
  static async getStatus(repoPath: string, remoteBranch?: string): Promise<GitStatus> {
    try {
      // Get current branch
      const currentBranch = await this.getCurrentBranch(repoPath);

      // Fetch latest
      await this.fetch(repoPath);

      // Check for uncommitted changes
      const { stdout: statusOut } = await gitExec(['status', '--porcelain'], repoPath);
      const hasChanges = statusOut.trim().length > 0;

      // Build remote ref safely
      const remote = remoteBranch || `origin/${currentBranch}`;

      // Validate the remote ref to prevent injection
      const remoteCheck = validateBranchName(remote.replace('origin/', ''));
      if (!remoteCheck.valid) {
        return {
          hasChanges,
          ahead: 0,
          behind: 0,
          currentBranch,
          error: `Invalid remote branch name: ${remoteCheck.error}`,
        };
      }

      let ahead = 0;
      let behind = 0;

      try {
        const { stdout: aheadOut } = await gitExec(
          ['rev-list', '--count', 'HEAD', `^${remote}`],
          repoPath
        );
        ahead = parseInt(aheadOut.trim()) || 0;

        const { stdout: behindOut } = await gitExec(
          ['rev-list', '--count', remote, '^HEAD'],
          repoPath
        );
        behind = parseInt(behindOut.trim()) || 0;
      } catch {
        // Remote branch might not exist
      }

      return {
        hasChanges,
        ahead,
        behind,
        currentBranch,
        lastFetch: new Date()
      };
    } catch (error) {
      return {
        hasChanges: false,
        ahead: 0,
        behind: 0,
        currentBranch: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Pull latest changes from remote
   */
  static async pull(repoPath: string, branch?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check for uncommitted changes
      const status = await this.getStatus(repoPath);
      if (status.hasChanges) {
        return {
          success: false,
          message: 'Cannot pull: You have uncommitted changes. Please commit or stash them first.'
        };
      }

      // Build args safely
      const args = ['pull'];
      if (branch) {
        const v = validateBranchName(branch);
        if (!v.valid) {
          return { success: false, message: `Invalid branch name: ${v.error}` };
        }
        args.push('origin', v.sanitized!);
      }

      const { stdout } = await gitExec(args, repoPath, { timeout: 60_000 });

      if (stdout.includes('Already up to date')) {
        return { success: true, message: 'Already up to date' };
      }

      const lines = stdout.split('\n').filter(l => l.trim());
      let message = 'Pull successful';
      const fileChanges = lines.find(l => l.includes('changed,'));
      if (fileChanges) {
        message = `Pull successful: ${fileChanges}`;
      }

      return { success: true, message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('merge')) {
        return { success: false, message: 'Pull failed: Merge conflicts detected. Please resolve conflicts manually.' };
      }
      if (errorMessage.includes('not a git repository')) {
        return { success: false, message: 'This is not a git repository. Initialize git first.' };
      }
      return { success: false, message: `Pull failed: ${errorMessage}` };
    }
  }

  /**
   * Switch to a different branch
   */
  static async switchBranch(repoPath: string, branch: string): Promise<{ success: boolean; message: string }> {
    // Validate branch name before use
    const v = validateBranchName(branch);
    if (!v.valid) {
      return { success: false, message: `Invalid branch name: ${v.error}` };
    }
    const safeBranch = v.sanitized!;

    try {
      const status = await this.getStatus(repoPath);
      if (status.hasChanges) {
        return { success: false, message: 'Cannot switch branches: You have uncommitted changes.' };
      }

      await gitExec(['checkout', safeBranch], repoPath);
      return { success: true, message: `Switched to branch ${safeBranch}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('did not match any file')) {
        try {
          await gitExec(['checkout', '-b', safeBranch, `origin/${safeBranch}`], repoPath);
          return { success: true, message: `Created and switched to branch ${safeBranch}` };
        } catch {
          return { success: false, message: `Branch ${safeBranch} does not exist` };
        }
      }
      return { success: false, message: `Failed to switch branch: ${errorMessage}` };
    }
  }

  /**
   * Clone a repository
   */
  static async clone(repository: string, targetPath: string, branch?: string): Promise<{ success: boolean; message: string }> {
    // Validate repository URL — allow common git URL patterns
    if (!repository || typeof repository !== 'string') {
      return { success: false, message: 'Repository URL is required' };
    }
    if (!/^(https?:\/\/|git@|ssh:\/\/)/.test(repository)) {
      return { success: false, message: 'Repository must be a valid URL (https://, git@, or ssh://)' };
    }

    const pathCheck = validateProjectPath(targetPath);
    if (!pathCheck.valid) {
      return { success: false, message: `Invalid target path: ${pathCheck.error}` };
    }

    try {
      const args = ['clone'];
      if (branch) {
        const v = validateBranchName(branch);
        if (!v.valid) {
          return { success: false, message: `Invalid branch name: ${v.error}` };
        }
        args.push('-b', v.sanitized!);
      }
      args.push(repository, '.');

      await gitExec(args, pathCheck.resolved, { timeout: 120_000 });
      return { success: true, message: `Successfully cloned ${repository}` };
    } catch (error) {
      return { success: false, message: `Failed to clone: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Get recent commits with file changes
   * Used by Brain reflection to correlate decisions with actual code changes
   */
  static async getRecentCommits(
    repoPath: string,
    options?: { since?: string; limit?: number }
  ): Promise<Array<{ sha: string; message: string; date: string; filesChanged: string[] }>> {
    try {
      const limit = options?.limit ?? 30;
      const args = [
        'log',
        `--pretty=format:__COMMIT__%H||%s||%ai`,
        '--name-only',
        `-n`, String(limit),
      ];

      // Validate 'since' parameter to prevent injection
      if (options?.since) {
        // ISO date pattern — safe for git
        if (!/^\d{4}-\d{2}-\d{2}/.test(options.since)) {
          return []; // invalid date format, return empty
        }
        args.push(`--since=${options.since}`);
      }

      const { stdout } = await gitExec(args, repoPath, { maxBuffer: 1024 * 1024 });

      if (!stdout.trim()) return [];

      const commits: Array<{ sha: string; message: string; date: string; filesChanged: string[] }> = [];
      const blocks = stdout.split('__COMMIT__').filter(Boolean);

      for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length === 0) continue;

        const headerLine = lines[0];
        const parts = headerLine.split('||');
        if (parts.length < 3) continue;

        const sha = parts[0].trim();
        const message = parts[1].trim();
        const date = parts[2].trim();
        const filesChanged = lines
          .slice(1)
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('__COMMIT__'));

        commits.push({ sha, message, date, filesChanged });
      }

      return commits;
    } catch {
      return [];
    }
  }

  /**
   * Get the remote URL for a repository (origin)
   */
  static async getRemoteUrl(repoPath: string): Promise<string | null> {
    try {
      const { stdout } = await gitExec(['remote', 'get-url', 'origin'], repoPath);
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }
}
