import { exec } from 'child_process';
import { promisify } from 'util';
import { GitStatus } from '@/types';

const execAsync = promisify(exec);

export class GitManager {
  /**
   * Check if a directory is a git repository
   */
  static async isGitRepo(path: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: path });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  static async getCurrentBranch(path: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: path });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error}`);
    }
  }

  /**
   * Fetch latest changes from remote
   */
  static async fetch(path: string): Promise<void> {
    try {
      await execAsync('git fetch', { cwd: path });
    } catch (error) {
      throw new Error(`Failed to fetch: ${error}`);
    }
  }

  /**
   * Get git status including ahead/behind commits
   */
  static async getStatus(path: string, remoteBranch?: string): Promise<GitStatus> {
    try {
      // Get current branch
      const currentBranch = await this.getCurrentBranch(path);
      
      // Fetch latest
      await this.fetch(path);
      
      // Check for uncommitted changes
      const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd: path });
      const hasChanges = statusOut.trim().length > 0;
      
      // Get ahead/behind info
      const remote = remoteBranch || `origin/${currentBranch}`;
      let ahead = 0;
      let behind = 0;
      
      try {
        const { stdout: aheadOut } = await execAsync(
          `git rev-list --count HEAD ^${remote}`,
          { cwd: path }
        );
        ahead = parseInt(aheadOut.trim()) || 0;
        
        const { stdout: behindOut } = await execAsync(
          `git rev-list --count ${remote} ^HEAD`,
          { cwd: path }
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
  static async pull(path: string, branch?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check for uncommitted changes
      const status = await this.getStatus(path);
      if (status.hasChanges) {
        return {
          success: false,
          message: 'Cannot pull: You have uncommitted changes. Please commit or stash them first.'
        };
      }
      
      // Pull from remote
      const pullCommand = branch ? `git pull origin ${branch}` : 'git pull';
      const { stdout, stderr } = await execAsync(pullCommand, { cwd: path });
      
      // Check if already up to date
      if (stdout.includes('Already up to date')) {
        return {
          success: true,
          message: 'Already up to date'
        };
      }
      
      // Parse the output for meaningful info
      const lines = stdout.split('\n').filter(l => l.trim());
      let message = 'Pull successful';
      
      // Look for file changes
      const fileChanges = lines.find(l => l.includes('changed,'));
      if (fileChanges) {
        message = `Pull successful: ${fileChanges}`;
      }
      
      return {
        success: true,
        message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle common git errors
      if (errorMessage.includes('merge')) {
        return {
          success: false,
          message: 'Pull failed: Merge conflicts detected. Please resolve conflicts manually.'
        };
      }
      
      if (errorMessage.includes('not a git repository')) {
        return {
          success: false,
          message: 'This is not a git repository. Initialize git first.'
        };
      }
      
      return {
        success: false,
        message: `Pull failed: ${errorMessage}`
      };
    }
  }

  /**
   * Switch to a different branch
   */
  static async switchBranch(path: string, branch: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check for uncommitted changes
      const status = await this.getStatus(path);
      if (status.hasChanges) {
        return {
          success: false,
          message: 'Cannot switch branches: You have uncommitted changes.'
        };
      }
      
      // Try to switch branch
      await execAsync(`git checkout ${branch}`, { cwd: path });
      
      return {
        success: true,
        message: `Switched to branch ${branch}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('did not match any file')) {
        // Branch doesn't exist locally, try to create it from remote
        try {
          await execAsync(`git checkout -b ${branch} origin/${branch}`, { cwd: path });
          return {
            success: true,
            message: `Created and switched to branch ${branch}`
          };
        } catch {
          return {
            success: false,
            message: `Branch ${branch} does not exist`
          };
        }
      }
      
      return {
        success: false,
        message: `Failed to switch branch: ${errorMessage}`
      };
    }
  }

  /**
   * Clone a repository
   */
  static async clone(repository: string, targetPath: string, branch?: string): Promise<{ success: boolean; message: string }> {
    try {
      const cloneCommand = branch
        ? `git clone -b ${branch} ${repository} .`
        : `git clone ${repository} .`;

      await execAsync(cloneCommand, { cwd: targetPath });

      return {
        success: true,
        message: `Successfully cloned ${repository}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clone: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
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
      const sinceArg = options?.since ? `--since="${options.since}"` : '';

      const { stdout } = await execAsync(
        `git log --pretty=format:"__COMMIT__%H||%s||%ai" --name-only ${sinceArg} -n ${limit}`,
        { cwd: repoPath, maxBuffer: 1024 * 1024 }
      );

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
      const { stdout } = await execAsync('git remote get-url origin', { cwd: repoPath });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }
}