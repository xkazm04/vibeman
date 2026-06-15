/**
 * Context API Operations
 * Handles all API calls related to context file management
 */

import type { ContextAuditReport } from '@/lib/contexts/audit';

/** Response shape of GET /api/contexts/audit. */
export interface ContextAuditResponse extends ContextAuditReport {
  success: true;
  projectId: string;
}

/**
 * Fetch the advisory Context Balance Audit for a project.
 * GET /api/contexts/audit?projectId=…
 */
export async function auditProject(projectId: string): Promise<ContextAuditResponse> {
  const response = await fetch(
    `/api/contexts/audit?projectId=${encodeURIComponent(projectId)}`
  );
  const result: ContextAuditResponse | { success: false; error?: string } =
    await response.json();

  if (!result.success) {
    throw new Error(
      ('error' in result && result.error) || 'Failed to run context audit'
    );
  }

  return result;
}

/**
 * Save context file to disk
 */
export async function saveContextFile(
  folderPath: string,
  fileName: string,
  content: string,
  projectPath: string
): Promise<void> {
  const fullProjectPath = `${projectPath}/${folderPath}/${fileName}`;

  const response = await fetch('/api/disk/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'write',
      filePath: fullProjectPath,
      content,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to save context file');
  }
}
