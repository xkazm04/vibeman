/**
 * Context API Operations
 * Handles all API calls related to context file management
 */

import { Context } from '../../../../stores/contextStore';
import { ContextFileGenerator } from '../../../../services/contextFileGenerator';

export interface GenerateContextOptions {
  context: Context;
  onProgress?: (status: string) => void;
  signal?: AbortSignal;
}

export interface BackgroundGenerationOptions {
  contextId: string;
  contextName: string;
  filePaths: string[];
  projectPath: string;
  projectId: string;
}

export interface SaveContextFileOptions {
  filePath: string;
  content: string;
  contextName: string;
}

/**
 * Load context file content from the server
 */
export async function loadContextFile(contextId: string): Promise<string> {
  const response = await fetch(`/api/context-files/${contextId}`);
  
  if (!response.ok) {
    throw new Error('Failed to load context file');
  }
  
  return await response.text();
}

/**
 * Generate context file using LLM
 */
export async function generateContextFile(options: GenerateContextOptions): Promise<string> {
  const { context, onProgress, signal } = options;
  
  if (context.filePaths.length === 0) {
    throw new Error('No files in context to analyze');
  }
  
  return await ContextFileGenerator.generateContextFile({
    context,
    onProgress,
    signal
  });
}

/**
 * Start background context file generation
 */
export async function generateContextBackground(options: BackgroundGenerationOptions): Promise<void> {
  const { contextId, contextName, filePaths, projectPath, projectId } = options;
  
  if (filePaths.length === 0) {
    throw new Error('No files in context to analyze');
  }
  
  const response = await fetch('/api/kiro/generate-context-background', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contextId,
      contextName,
      filePaths,
      projectPath,
      projectId
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to start background generation');
  }
}

/**
 * Save context file to disk
 */
export async function saveContextFile(
  folderPath: string,
  fileName: string,
  content: string,
  projectPath: string
): Promise<void> {
  const fullProjectPath = `${projectPath}/${folderPath}/${fileName}`;

  const response = await fetch('/api/disk/save-context-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath: fullProjectPath,
      content,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to save context file');
  }
}

/**
 * Generate context file using background task API
 */
export async function generateContextWithPrompt(
  contextName: string,
  description: string,
  filePaths: string[],
  groupId: string,
  projectId: string,
  projectPath: string,
  prompt: string,
  model: string = 'llama3.1:8b'
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/kiro/generate-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contextName,
      description,
      filePaths,
      groupId,
      projectId,
      projectPath,
      generateFile: true,
      prompt,
      model
    }),
  });

  return await response.json();
}
