/**
 * Shared Task Cleanup Utilities
 *
 * Post-execution cleanup cascade shared by CLI execution manager and Conductor pipeline.
 * Ensures both paths handle requirement file deletion, idea status updates,
 * and implementation logging identically.
 *
 * Sequential cascade order:
 *   1. Update idea status to 'implemented'
 *   2. Ensure implementation log exists (fallback if MCP tool skipped)
 *   3. Delete requirement file last (after all lookups complete)
 *
 * The requirement file must stay on disk until status/log updates finish,
 * since downstream endpoints reference the idea by name.
 */

/**
 * Options for task cleanup. Server-side callers (e.g. Conductor) must provide
 * baseUrl since relative fetch paths won't resolve without a browser.
 */
export interface TaskCleanupOptions {
  projectPath: string;
  requirementName: string;
  projectId?: string;
  contextId?: string | null;
  /** Absolute base URL for API calls (required server-side, optional client-side) */
  baseUrl?: string;
}

function resolveUrl(path: string, baseUrl?: string): string {
  return baseUrl ? `${baseUrl}${path}` : path;
}

/**
 * Delete a requirement file after successful completion.
 */
export async function deleteRequirementFile(
  projectPath: string,
  requirementName: string,
  baseUrl?: string
): Promise<boolean> {
  try {
    const response = await fetch(resolveUrl('/api/claude-code/requirement', baseUrl), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, requirementName }),
    });
    return response.ok;
  } catch (error) {
    console.error('[taskCleanup] Failed to delete requirement:', error);
    return false;
  }
}

/**
 * Update idea status to 'implemented'.
 */
export async function updateIdeaImplementationStatus(
  requirementName: string,
  baseUrl?: string
): Promise<void> {
  try {
    await fetch(resolveUrl('/api/ideas/update-implementation-status', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementName }),
    });
  } catch {
    // Non-critical - silently ignore
  }
}

/**
 * Ensure an implementation log exists for a completed task.
 * Checks existing logs and creates a fallback if none found.
 * Guarantees a log is always created after execution,
 * even if the CLI agent didn't call the log_implementation MCP tool.
 */
async function ensureImplementationLog(
  projectId: string,
  requirementName: string,
  contextId?: string | null,
  baseUrl?: string
): Promise<void> {
  try {
    const resp = await fetch(
      resolveUrl(`/api/implementation-logs?projectId=${encodeURIComponent(projectId)}&limit=50`, baseUrl)
    );
    if (resp.ok) {
      const { logs } = await resp.json();
      const exists = Array.isArray(logs) && logs.some(
        (log: { requirement_name?: string }) => log.requirement_name === requirementName
      );
      if (exists) return;
    }

    await fetch(resolveUrl('/api/implementation-log', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        requirementName,
        title: `Implementation: ${requirementName}`,
        overview: 'Auto-generated after successful CLI execution (no MCP log_implementation call detected).',
        contextId: contextId || undefined,
      }),
    });
  } catch {
    // Non-critical — best-effort fallback
  }
}

/**
 * Perform post-completion cleanup for a successful task.
 * Sequential cascade: update status → ensure log → delete file.
 *
 * @returns true if requirement was deleted successfully
 */
export async function performTaskCleanup(options: TaskCleanupOptions): Promise<boolean> {
  const { projectPath, requirementName, projectId, contextId, baseUrl } = options;

  // 1. Update idea status (await so it completes before file deletion)
  await updateIdeaImplementationStatus(requirementName, baseUrl);

  // 2. Ensure implementation log exists — creates fallback if MCP tool was skipped
  if (projectId) {
    await ensureImplementationLog(projectId, requirementName, contextId, baseUrl).catch(() => {});
  }

  // 3. Delete requirement file last — after all lookups are done
  return deleteRequirementFile(projectPath, requirementName, baseUrl);
}
