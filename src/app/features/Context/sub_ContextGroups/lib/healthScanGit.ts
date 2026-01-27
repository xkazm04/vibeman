/**
 * Health Scan Git Operations
 *
 * Handles git commit and push operations after a health scan completes.
 * Auto-commits changes with a descriptive message including the group name
 * and number of issues fixed.
 */

export interface HealthScanGitOptions {
  projectId: string;
  groupName: string;
  issuesFixed: number;
  healthScore: number;
}

export interface GitOperationResult {
  success: boolean;
  commitHash?: string;
  pushed?: boolean;
  error?: string;
}

/**
 * Generate commit message for health scan
 */
export function generateHealthScanCommitMessage(
  groupName: string,
  issuesFixed: number,
  healthScore: number
): string {
  if (issuesFixed === 0) {
    return `chore(health): analyze ${groupName} - no issues found (score: ${healthScore}%)`;
  }

  return `chore(health): fix ${issuesFixed} issues in ${groupName} (score: ${healthScore}%)

Code Health Triage auto-fix:
- Removed unused imports
- Cleaned console statements
- Fixed obvious type annotations

Health Score: ${healthScore}%`;
}

/**
 * Execute git commit and push after health scan
 */
export async function commitHealthScanChanges(
  options: HealthScanGitOptions
): Promise<GitOperationResult> {
  const { projectId, groupName, issuesFixed, healthScore } = options;

  // If no issues were fixed, skip git operations
  if (issuesFixed === 0) {
    return {
      success: true,
      pushed: false,
    };
  }

  const commitMessage = generateHealthScanCommitMessage(groupName, issuesFixed, healthScore);

  try {
    // Call the existing git commit-and-push API
    const response = await fetch('/api/git/commit-and-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        commands: [
          'git add -A',
          'git commit -m "{commitMessage}"',
          'git push origin {branch}',
        ],
        commitMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || error.message || 'Git operation failed',
      };
    }

    const result = await response.json();

    // Extract commit hash from results if available
    let commitHash: string | undefined;
    if (result.results) {
      const commitResult = result.results.find((r: { command: string; output?: string }) =>
        r.command.includes('commit')
      );
      if (commitResult?.output) {
        const hashMatch = commitResult.output.match(/\[[\w-]+\s+([a-f0-9]+)\]/);
        if (hashMatch) {
          commitHash = hashMatch[1];
        }
      }
    }

    return {
      success: true,
      commitHash,
      pushed: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during git operations',
    };
  }
}

/**
 * Check if there are uncommitted changes in the project
 */
export async function hasUncommittedChanges(projectId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/git/status?projectId=${projectId}`);
    if (!response.ok) return false;

    const result = await response.json();
    return result.hasChanges === true;
  } catch {
    return false;
  }
}
