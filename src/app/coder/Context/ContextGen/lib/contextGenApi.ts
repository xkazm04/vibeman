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
}

/**
 * Generate context documentation file in background
 */
export async function generateContextBackground(
  request: ContextGenerationRequest
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/kiro/generate-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const result = await response.json();

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
  const response = await fetch('/api/contexts/generate-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate description');
  }

  return response.json();
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
  const response = await fetch('/api/contexts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create context');
  }
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
  const response = await fetch(`/api/contexts/${contextId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update context');
  }
}
