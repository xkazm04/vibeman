/**
 * Context API Operations
 * Handles all API calls related to context file management
 */

import type { ContextAuditReport } from '@/lib/contexts/audit';
import { toast } from '@/stores/messageStore';

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

/** Result of a manual context-map export to disk. */
export interface ExportContextMapResult {
  success: boolean;
  exportedTo?: string;
  /** True when the map was built but the file could not be written (HTTP 207). */
  diskWriteFailed?: boolean;
  error?: string;
}

/**
 * Export a project's context-map.json to disk and surface the outcome to the
 * user via the shared toast channel.
 *
 * The export endpoint returns HTTP 207 when it builds the map but cannot write
 * the file — previously the UI swallowed that into a console.error, so a failed
 * write was invisible. This helper turns every terminal state (ok / disk-write
 * failure / hard error) into a toast, and returns a structured result so a
 * caller can also react. Use this instead of a raw `fetch` at the call site.
 */
export async function exportContextMapToFile(projectId: string): Promise<ExportContextMapResult> {
  try {
    const response = await fetch(
      `/api/contexts/export?projectId=${encodeURIComponent(projectId)}&write=true`
    );
    const result: {
      success: boolean;
      exportedTo?: string;
      error?: string;
      warning?: string;
    } = await response.json();

    if (result.success) {
      toast.success('Context map exported', result.exportedTo || 'Saved to project root');
      return { success: true, exportedTo: result.exportedTo };
    }

    // HTTP 207: the map was built but the file write to disk failed.
    if (response.status === 207) {
      toast.error(
        'Context map not saved',
        result.warning || result.error || 'The file could not be written to disk.'
      );
      return { success: false, diskWriteFailed: true, error: result.error };
    }

    toast.error('Context map export failed', result.error || 'Unknown error');
    return { success: false, error: result.error };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    toast.error('Context map export failed', message);
    return { success: false, error: message };
  }
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
