/**
 * API functions for context generation
 */

export interface ContextGenerationRequest {
  contextName: string;
  description?: string;
  filePaths: string[];
  groupId?: string;
  projectId: string;
  projectPath: string;
  generateFile: boolean;
  prompt: string;
  model?: string;
}

export interface ContextDescriptionRequest {
  filePaths: string[];
  projectPath: string;
  provider?: string;
  model?: string;
}

/**
 * Common headers for JSON requests
 */
const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Helper to make POST request
 */
async function postRequest<T>(url: string, data: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Request to ${url} failed`);
  }

  return response.json();
}

/**
 * Helper to make PATCH request
 */
async function patchRequest<T>(url: string, data: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Request to ${url} failed`);
  }

  return response.json();
}

/**
 * Generate context documentation file in background
 */
export async function generateContextBackground(
  request: ContextGenerationRequest
): Promise<{ success: boolean; error?: string }> {
  const result = await postRequest<{ success: boolean; error?: string }>(
    '/api/kiro/generate-context',
    request
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to generate context');
  }

  return result;
}

/**
 * Generate context description from files using LLM
 */
export async function generateContextDescription(
  request: ContextDescriptionRequest
): Promise<{ description: string; fileStructure: string }> {
  return postRequest('/api/contexts/generate-description', request);
}

/**
 * Create a new context
 */
export async function createContext(data: {
  projectId: string;
  groupId: string | null;
  name: string;
  description: string;
  filePaths: string[];
}): Promise<void> {
  await postRequest('/api/contexts', data);
}

/**
 * Update an existing context
 */
export async function updateContext(
  contextId: string,
  updates: {
    name?: string;
    description?: string;
    filePaths?: string[];
    groupId?: string;
  }
): Promise<void> {
  await patchRequest(`/api/contexts/${contextId}`, updates);
}

export interface RegenerateContextResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
    description?: string;
    filePaths: string[];
  };
  stats?: {
    filesAnalyzed: number;
    totalFiles: number;
    skippedFiles: number;
  };
}

/**
 * Regenerate a single context's description from its current file list.
 * Re-reads the context's files and runs the LLM to produce an updated description.
 */
export async function regenerateContext(
  contextId: string,
  options?: { provider?: string; model?: string }
): Promise<RegenerateContextResult> {
  return postRequest('/api/context-generation/regenerate', {
    contextId,
    ...options,
  });
}
