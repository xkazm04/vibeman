import { SupportedProvider } from '../llm';
import { parseAIJsonResponse } from '../aiJsonParser';
import { safeResponseJson, safeGet } from '@/lib/apiResponseGuard';

export type AIReviewMode = 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'file-scanner';

export interface AIReviewRequest {
  projectId: string;
  projectPath: string;
  projectName: string;
  mode: AIReviewMode;
  provider: SupportedProvider;
}

export interface BackgroundTaskRequest {
  projectId: string;
  projectPath: string;
  projectName: string;
  taskType: AIReviewMode;
  priority?: number;
}

/**
 * Helper to extract data from AI response with fallback JSON parsing
 */
function extractDataWithFallback<T>(
  result: unknown,
  dataKey: string,
  errorMessage: string
): T {
  const value = safeGet(result, dataKey, null);
  if (value !== null) {
    return value as T;
  }
  const rawResponse = safeGet(result, 'rawResponse', null);
  if (rawResponse) {
    try {
      return parseAIJsonResponse(rawResponse as string) as T;
    } catch (parseError) {
      throw new Error(errorMessage);
    }
  }
  throw new Error(`No ${dataKey} returned from API`);
}

/**
 * Call the AI project review API endpoint
 */
export async function callAIReviewAPI(request: AIReviewRequest): Promise<any> {
  const response = await fetch('/api/kiro/ai-project-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const result = await safeResponseJson<Record<string, unknown>>(response, `AI review (${request.mode})`);

  if (!safeGet(result, 'success', false)) {
    throw new Error(safeGet(result, 'error', `Failed to generate ${request.mode}`) as string);
  }

  return result;
}

/**
 * Generic helper to call AI review API with common project parameters
 */
async function callReviewWithMode(
  projectId: string,
  projectPath: string,
  projectName: string,
  provider: SupportedProvider,
  mode: AIReviewMode
) {
  return callAIReviewAPI({
    projectId,
    projectPath,
    projectName,
    mode,
    provider,
  });
}

/**
 * Generate project documentation
 */
export async function generateDocs(
  projectId: string,
  projectPath: string,
  projectName: string,
  provider: SupportedProvider
): Promise<string> {
  const result = await callReviewWithMode(projectId, projectPath, projectName, provider, 'docs');
  return safeGet(result, 'analysis', '') as string;
}

/**
 * Generate tasks with JSON parsing fallback
 */
export async function generateTasks(
  projectId: string,
  projectPath: string,
  projectName: string,
  provider: SupportedProvider
): Promise<any[]> {
  const result = await callReviewWithMode(projectId, projectPath, projectName, provider, 'tasks');
  return extractDataWithFallback<any[]>(result, 'tasks', 'Failed to parse tasks from AI response');
}

/**
 * Generate goals with JSON parsing fallback
 */
export async function generateGoals(
  projectId: string,
  projectPath: string,
  projectName: string,
  provider: SupportedProvider
): Promise<any[]> {
  const result = await callReviewWithMode(projectId, projectPath, projectName, provider, 'goals');
  return extractDataWithFallback<any[]>(result, 'goals', 'Failed to parse goals from AI response');
}

/**
 * Generate context files
 */
export async function generateContexts(
  projectId: string,
  projectPath: string,
  projectName: string,
  provider: SupportedProvider
): Promise<Array<{ filename: string; content: string }>> {
  const result = await callReviewWithMode(projectId, projectPath, projectName, provider, 'context');

  const contexts = safeGet<Array<{ filename: string; content: string }> | null>(result, 'contexts', null);
  if (contexts) {
    return contexts;
  }

  throw new Error('No context files were generated');
}

/**
 * Generate code optimization tasks with JSON parsing fallback
 */
export async function generateCodeTasks(
  projectId: string,
  projectPath: string,
  projectName: string,
  provider: SupportedProvider
): Promise<any[]> {
  const result = await callReviewWithMode(projectId, projectPath, projectName, provider, 'code');
  return extractDataWithFallback<any[]>(result, 'tasks', 'Failed to parse code tasks from AI response');
}
