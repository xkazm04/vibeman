import { SupportedProvider } from '../llm';
import { parseAIJsonResponse } from '../aiJsonParser';

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
  result: any,
  dataKey: string,
  errorMessage: string
): T {
  if (result[dataKey]) {
    return result[dataKey] as T;
  } else if (result.rawResponse) {
    try {
      return parseAIJsonResponse(result.rawResponse) as T;
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

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || `Failed to generate ${request.mode}`);
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
  return result.analysis;
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

  if (result.contexts) {
    return result.contexts;
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
