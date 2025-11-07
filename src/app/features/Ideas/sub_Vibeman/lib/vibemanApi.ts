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
 * Generic API caller for Vibeman endpoints
 * Reduces code duplication across all API methods
 */
async function callVibemanApi<T>(
  action: string,
  params: Record<string, unknown>,
  errorMessage: string
): Promise<T> {
  const response = await fetch('/api/ideas/vibeman', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      ...params,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || errorMessage);
  }

  return await response.json();
}

/**
 * Evaluate pending ideas and select the best one to implement
 */
export async function evaluateAndSelectIdea(
  projectId: string,
  projectPath: string
): Promise<IdeaEvaluationResult> {
  return callVibemanApi<IdeaEvaluationResult>(
    'evaluate-and-select',
    { projectId, projectPath },
    'Failed to evaluate ideas'
  );
}

/**
 * Get the first accepted idea (for priority implementation)
 */
export async function getFirstAcceptedIdea(
  projectId: string
): Promise<{ ideaId: string | null; idea?: unknown }> {
  return callVibemanApi<{ ideaId: string | null; idea?: unknown }>(
    'get-first-accepted',
    { projectId },
    'Failed to get accepted idea'
  );
}

/**
 * Implement a selected idea (generate requirement and queue for execution)
 */
export async function implementIdea(
  projectId: string,
  projectPath: string,
  ideaId: string
): Promise<ImplementationResult> {
  return callVibemanApi<ImplementationResult>(
    'implement-idea',
    { projectId, projectPath, ideaId },
    'Failed to implement idea'
  );
}

/**
 * Mark an idea as implemented (after successful execution)
 */
export async function markIdeaAsImplemented(
  ideaId: string
): Promise<{ success: boolean; error?: string }> {
  return callVibemanApi<{ success: boolean; error?: string }>(
    'mark-implemented',
    { ideaId },
    'Failed to mark idea as implemented'
  );
}

/**
 * Get automation status for a project
 */
export async function getAutomationStatus(
  projectId: string
): Promise<VibemanStatusResult> {
  return callVibemanApi<VibemanStatusResult>(
    'get-status',
    { projectId },
    'Failed to get automation status'
  );
}
