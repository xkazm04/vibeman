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
  taskId?: string;
  logFilePath?: string;
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
 * Execute a requirement (async mode - non-blocking)
 */
export async function executeRequirementAsync(
  projectPath: string,
  requirementName: string,
  projectId?: string
): Promise<{ success: boolean; taskId: string }> {
  try {
    const response = await fetch('/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        action: 'execute-requirement',
        requirementName,
        projectId,
        async: true,
      }),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();      throw new Error(`Server returned non-JSON response (${response.status}). This may be a temporary Next.js build error - will retry.`);
    }

    const data = await response.json();

    if (!response.ok) {      throw new Error(data.error || 'Failed to queue execution');
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
    const response = await fetch('/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: '', // Not needed for task status
        action: 'get-task-status',
        taskId,
      }),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();      throw new Error(`Server returned non-JSON response (${response.status})`);
    }

    const data = await response.json();

    if (!response.ok) {      throw new Error(data.error || 'Failed to get task status');
    }    return data.task;
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
  const response = await fetch('/api/claude-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      action: 'list-tasks',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to list tasks');
  }

  return data.tasks || [];
}

/**
 * Execute a requirement (sync mode - blocking, legacy)
 */
export async function executeRequirement(
  projectPath: string,
  requirementName: string,
  projectId?: string
): Promise<{ success: boolean; output?: string; error?: string; sessionLimitReached?: boolean; contextUpdates?: any[]; logFilePath?: string }> {
  const response = await fetch('/api/claude-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      action: 'execute-requirement',
      requirementName,
      projectId,
      async: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Execution failed') as Error & { sessionLimitReached?: boolean };
    error.sessionLimitReached = data.sessionLimitReached || false;
    throw error;
  }

  // Log context update results if available
  if (data.contextUpdates && data.contextUpdates.length > 0) {  }

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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate requirement for goal');
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
  const response = await fetch('/api/claude-code', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      action: 'update-requirement',
      requirementName,
      content,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to update requirement');
  }

  return true;
}

/**
 * Check if context scan requirement exists
 */
export async function hasContextScanRequirement(projectPath: string): Promise<boolean> {
  try {
    const requirements = await loadRequirements(projectPath);
    return requirements.includes('scan-contexts');
  } catch (err) {    return false;
  }
}
