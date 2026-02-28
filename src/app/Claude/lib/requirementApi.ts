/**
 * API layer for Claude Code requirements
 */
import { safeResponseJson, safeGet } from '@/lib/apiResponseGuard';

export interface Requirement {
  name: string;
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'session-limit';
  output?: string;
  error?: string;
  startTime?: Date;
  sessionLimitReached?: boolean;
  taskId?: string;
  logFilePath?: string;
}

/**
 * Simple cache for requirement lists to prevent rapid re-fetching.
 * Key: projectPath, Value: { data, expiry }
 */
const requirementCache = new Map<string, { data: string[]; expiry: number }>();
const REQUIREMENT_CACHE_TTL = 30_000; // 30 seconds

// Dedup in-flight requests
const inFlightRequests = new Map<string, Promise<string[]>>();

/**
 * Load requirements from API (single project)
 * Includes 30-second cache and in-flight dedup
 */
export async function loadRequirements(projectPath: string): Promise<string[]> {
  // Check cache first
  const cached = requirementCache.get(projectPath);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  // Dedup concurrent requests for the same path
  const existing = inFlightRequests.get(projectPath);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(
        `/api/claude-code/requirements?projectPath=${encodeURIComponent(projectPath)}`
      );

      if (response.ok) {
        const data = await safeResponseJson(response, 'loadRequirements');
        const requirements = safeGet<string[]>(data, 'requirements', []);
        requirementCache.set(projectPath, {
          data: requirements,
          expiry: Date.now() + REQUIREMENT_CACHE_TTL,
        });
        return requirements;
      }

      throw new Error('Failed to load requirements');
    } finally {
      inFlightRequests.delete(projectPath);
    }
  })();

  inFlightRequests.set(projectPath, promise);
  return promise;
}

/**
 * Invalidate the requirement cache for a specific project or all projects.
 * Call after mutations (delete, save, generate) to force fresh data on next load.
 */
export function invalidateRequirementCache(projectPath?: string): void {
  if (projectPath) {
    requirementCache.delete(projectPath);
  } else {
    requirementCache.clear();
  }
}

/**
 * Load requirements for multiple projects in a single batch request
 * Returns a map of projectId -> requirement names
 */
export async function loadRequirementsBatch(
  projects: Array<{ id: string; path: string }>
): Promise<Record<string, string[]>> {
  if (projects.length === 0) {
    return {};
  }

  const response = await fetch('/api/claude-code/batch-requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPaths: projects.map(p => ({ id: p.id, path: p.path })),
    }),
  });

  if (response.ok) {
    const data = await safeResponseJson(response, 'loadRequirementsBatch');
    return safeGet<Record<string, string[]>>(data, 'requirements', {});
  }

  throw new Error('Failed to load requirements batch');
}

/**
 * Git configuration for requirement execution
 */
export interface GitExecutionConfig {
  enabled: boolean;
  commands: string[];
  commitMessage: string;
}

/**
 * Execute a requirement (async mode - non-blocking)
 */
export async function executeRequirementAsync(
  projectPath: string,
  requirementName: string,
  projectId?: string,
  gitConfig?: GitExecutionConfig
): Promise<{ success: boolean; taskId: string }> {
  try {
    const response = await fetch('/api/claude-code/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        requirementName,
        projectId,
        async: true,
        gitConfig,
      }),
    });

    const data = await safeResponseJson<{ success: boolean; taskId: string; error?: string }>(response, 'executeRequirementAsync');

    if (!response.ok) {      throw new Error(safeGet(data, 'error', 'Failed to queue execution') as string);
    }    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {      throw new Error('Server error - received invalid response format. This may be a temporary Next.js build error - will retry.');
    }
    throw error;
  }
}

/**
 * Get execution task status
 */
export async function getTaskStatus(taskId: string): Promise<any> {
  try {
    const response = await fetch(`/api/claude-code/tasks/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await safeResponseJson<Record<string, unknown>>(response, 'getTaskStatus');

    if (!response.ok) {      throw new Error(safeGet(data, 'error', 'Failed to get task status') as string);
    }    return safeGet(data, 'task', data);
  } catch (error) {
    if (error instanceof SyntaxError) {      throw new Error('Server error - received invalid response format');
    }
    throw error;
  }
}

/**
 * List all execution tasks for a project
 */
export async function listExecutionTasks(projectPath: string): Promise<any[]> {
  const url = projectPath
    ? `/api/claude-code/tasks?projectPath=${encodeURIComponent(projectPath)}`
    : '/api/claude-code/tasks';

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await safeResponseJson<Record<string, unknown>>(response, 'listExecutionTasks');

  if (!response.ok) {
    throw new Error(safeGet(data, 'error', 'Failed to list tasks') as string);
  }

  return safeGet<any[]>(data, 'tasks', []);
}

/**
 * Execute a requirement (sync mode - blocking, legacy)
 */
export async function executeRequirement(
  projectPath: string,
  requirementName: string,
  projectId?: string
): Promise<{ success: boolean; output?: string; error?: string; sessionLimitReached?: boolean; contextUpdates?: any[]; logFilePath?: string }> {
  const response = await fetch('/api/claude-code/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      requirementName,
      projectId,
      async: false,
    }),
  });

  const data = await safeResponseJson<Record<string, unknown>>(response, 'executeRequirement');

  if (!response.ok) {
    const error = new Error(safeGet(data, 'error', 'Execution failed') as string) as Error & { sessionLimitReached?: boolean };
    error.sessionLimitReached = safeGet(data, 'sessionLimitReached', false) as boolean;
    throw error;
  }

  // Log context update results if available
  const contextUpdates = safeGet<any[]>(data, 'contextUpdates', []);

  return data as { success: boolean; output?: string; error?: string; sessionLimitReached?: boolean; contextUpdates?: any[]; logFilePath?: string };
}

/**
 * Delete a requirement
 */
export async function deleteRequirement(
  projectPath: string,
  requirementName: string
): Promise<boolean> {
  const response = await fetch('/api/claude-code', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath, requirementName }),
  });

  if (response.ok) {
    requirementCache.delete(projectPath);
    return true;
  }
  return false;
}

/**
 * Generate requirements from goals
 */
export async function generateRequirements(
  projectPath: string,
  projectId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const response = await fetch('/api/claude-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      action: 'generate-requirements',
      projectId,
    }),
  });

  const data = await safeResponseJson<{ success: boolean; count: number; error?: string }>(response, 'generateRequirements');

  if (!response.ok) {
    throw new Error(safeGet(data, 'error', 'Failed to generate requirements') as string);
  }

  return data;
}

/**
 * Read requirement content
 */
export async function readRequirement(
  projectPath: string,
  requirementName: string
): Promise<string> {
  const response = await fetch(
    `/api/claude-code/requirements/${encodeURIComponent(requirementName)}?projectPath=${encodeURIComponent(projectPath)}`
  );

  if (response.ok) {
    const data = await safeResponseJson(response, 'readRequirement');
    return safeGet(data, 'content', '') as string;
  }

  throw new Error('Failed to read requirement');
}

/**
 * Generate a requirement for a single specific goal (async, non-blocking)
 * This function starts the generation process in the background and returns immediately
 */
export async function generateRequirementForGoal(
  projectPath: string,
  projectId: string,
  goalId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch('/api/claude-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      action: 'generate-requirement-for-goal',
      projectId,
      goalId,
    }),
  });

  const data = await safeResponseJson<{ success: boolean; message?: string; error?: string }>(response, 'generateRequirementForGoal');

  if (!response.ok) {
    throw new Error(safeGet(data, 'error', 'Failed to generate requirement for goal') as string);
  }

  return data;
}

/**
 * Update requirement content
 */
export async function updateRequirement(
  projectPath: string,
  requirementName: string,
  content: string
): Promise<boolean> {
  const response = await fetch(`/api/claude-code/requirements/${encodeURIComponent(requirementName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      content,
    }),
  });

  if (!response.ok) {
    const data = await safeResponseJson(response, 'updateRequirement');
    throw new Error(safeGet(data, 'error', 'Failed to update requirement') as string);
  }

  return true;
}

/**
 * Save (create or update) a requirement file
 */
export async function saveRequirement(
  projectPath: string,
  requirementName: string,
  content: string
): Promise<boolean> {
  const response = await fetch(`/api/claude-code/requirements/${encodeURIComponent(requirementName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      content,
    }),
  });

  if (!response.ok) {
    const data = await safeResponseJson(response, 'saveRequirement');
    throw new Error(safeGet(data, 'error', 'Failed to save requirement') as string);
  }

  requirementCache.delete(projectPath);
  return true;
}

/**
 * Check if context scan requirement exists
 */
export async function hasContextScanRequirement(projectPath: string): Promise<boolean> {
  try {
    const requirements = await loadRequirements(projectPath);
    return requirements.includes('scan-contexts');
  } catch (err) {
    console.warn('[requirementApi] hasContextScanRequirement check failed:', err instanceof Error ? err.message : err);
    return false;
  }
}
