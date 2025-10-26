/**
 * Vibeman API Callers
 * Handles all API interactions for the Vibeman automation feature
 */

export interface IdeaEvaluationResult {
  selectedIdeaId: string | null;
  reasoning: string;
  requirementName?: string;
  error?: string;
}

export interface ImplementationResult {
  success: boolean;
  requirementName?: string;
  taskId?: string;
  error?: string;
}

export interface VibemanStatusResult {
  pendingIdeasCount: number;
  acceptedIdeasCount: number;
  implementedIdeasCount: number;
  openGoalsCount: number;
}

/**
 * Evaluate pending ideas and select the best one to implement
 */
export async function evaluateAndSelectIdea(
  projectId: string,
  projectPath: string
): Promise<IdeaEvaluationResult> {
  console.log('[Vibeman API] Evaluating ideas for project:', projectId);

  const response = await fetch('/api/ideas/vibeman', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      projectPath,
      action: 'evaluate-and-select',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[Vibeman API] Evaluate API error:', errorData);
    throw new Error(errorData.error || 'Failed to evaluate ideas');
  }

  const result = await response.json();
  console.log('[Vibeman API] Evaluation result:', result);
  return result;
}

/**
 * Get the first accepted idea (for priority implementation)
 */
export async function getFirstAcceptedIdea(
  projectId: string
): Promise<{ ideaId: string | null; idea?: any }> {
  console.log('[Vibeman API] Fetching accepted ideas for project:', projectId);

  const response = await fetch('/api/ideas/vibeman', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      action: 'get-first-accepted',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[Vibeman API] Get accepted idea error:', errorData);
    throw new Error(errorData.error || 'Failed to get accepted idea');
  }

  const result = await response.json();
  console.log('[Vibeman API] First accepted idea:', result);
  return result;
}

/**
 * Implement a selected idea (generate requirement and queue for execution)
 */
export async function implementIdea(
  projectId: string,
  projectPath: string,
  ideaId: string
): Promise<ImplementationResult> {
  console.log('[Vibeman API] Implementing idea:', ideaId);

  const response = await fetch('/api/ideas/vibeman', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      projectPath,
      action: 'implement-idea',
      ideaId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to implement idea');
  }

  const result = await response.json();
  console.log('[Vibeman API] Implementation result:', result);
  return result;
}

/**
 * Mark an idea as implemented (after successful execution)
 */
export async function markIdeaAsImplemented(
  ideaId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[Vibeman API] Marking idea as implemented:', ideaId);

  const response = await fetch('/api/ideas/vibeman', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'mark-implemented',
      ideaId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to mark idea as implemented');
  }

  const result = await response.json();
  console.log('[Vibeman API] Mark implemented result:', result);
  return result;
}

/**
 * Get automation status for a project
 */
export async function getAutomationStatus(
  projectId: string
): Promise<VibemanStatusResult> {
  console.log('[Vibeman API] Getting automation status for project:', projectId);

  const response = await fetch('/api/ideas/vibeman', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      action: 'get-status',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get automation status');
  }

  const result = await response.json();
  console.log('[Vibeman API] Automation status:', result);
  return result;
}
