/**
 * API layer for Claude Code requirements
 */

export interface Requirement {
  name: string;
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'session-limit';
  output?: string;
  error?: string;
  startTime?: Date;
  sessionLimitReached?: boolean;
}

/**
 * Load requirements from API
 */
export async function loadRequirements(projectPath: string): Promise<string[]> {
  const response = await fetch(
    `/api/claude-code?projectPath=${encodeURIComponent(projectPath)}&action=list-requirements`
  );

  if (response.ok) {
    const data = await response.json();
    return data.requirements || [];
  }

  throw new Error('Failed to load requirements');
}

/**
 * Execute a requirement
 */
export async function executeRequirement(
  projectPath: string,
  requirementName: string,
  projectId?: string
): Promise<{ success: boolean; output?: string; error?: string; sessionLimitReached?: boolean; contextUpdates?: any[] }> {
  const response = await fetch('/api/claude-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      action: 'execute-requirement',
      requirementName,
      projectId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error: any = new Error(data.error || 'Execution failed');
    error.sessionLimitReached = data.sessionLimitReached || false;
    throw error;
  }

  // Log context update results if available
  if (data.contextUpdates && data.contextUpdates.length > 0) {
    console.log('Context auto-updates:', data.contextUpdates);
  }

  return data;
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

  return response.ok;
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate requirements');
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
    `/api/claude-code?projectPath=${encodeURIComponent(projectPath)}&action=read-requirement&name=${encodeURIComponent(requirementName)}`
  );

  if (response.ok) {
    const data = await response.json();
    return data.content || '';
  }

  throw new Error('Failed to read requirement');
}
