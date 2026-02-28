import type { GitOperationResponse } from '@/app/api/git/commit-and-push/route';

/**
 * Execute git operations for a project
 */
export async function executeGitOperations(
  projectId: string,
  commands: string[],
  commitMessage: string
): Promise<GitOperationResponse> {
  const response = await fetch('/api/git/commit-and-push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      commands,
      commitMessage,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Git operation failed');
  }

  return data;
}

/**
 * Generate commit message from template.
 * Single-pass replacement for all {key} placeholders.
 */
export function generateCommitMessage(
  template: string,
  requirementName: string,
  projectName: string
): string {
  const values: Record<string, string> = { requirementName, projectName };
  return template.replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? _match);
}
