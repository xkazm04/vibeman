/**
 * Claude Ideas Handler
 *
 * Experimental feature: Generate ideas using Claude Code instead of LLM providers
 * This creates requirement files that Claude Code processes asynchronously
 *
 * NOTE: This file is a thin wrapper for backward compatibility.
 * The main implementation is now in claudeIdeasExecutor.ts which uses the
 * standard prompt builder system for consistent prompts.
 */

import { ScanType } from '../../lib/scanTypes';
import { executeClaudeIdeasWithContexts } from './claudeIdeasExecutor';

export interface ClaudeIdeasConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanTypes: ScanType[];
  contextId?: string;
  contextName?: string;
  batchId: string;
}

export interface ClaudeIdeasResult {
  success: boolean;
  tasksCreated: number;
  taskIds: string[];
  errors: string[];
}

/**
 * Execute Claude Ideas generation for multiple scan types
 * Creates Claude Code requirement files and queues them for processing
 *
 * This is a backward-compatible wrapper that delegates to the new executor.
 */
export async function executeClaudeIdeas(config: ClaudeIdeasConfig): Promise<ClaudeIdeasResult> {
  // Convert single context to array for new executor
  const contextIds = config.contextId ? [config.contextId] : [];

  const executorResult = await executeClaudeIdeasWithContexts({
    projectId: config.projectId,
    projectName: config.projectName,
    projectPath: config.projectPath,
    scanTypes: config.scanTypes,
    contextIds,
  });

  // Transform executor result to handler result format
  return {
    success: executorResult.success,
    tasksCreated: executorResult.filesCreated,
    taskIds: executorResult.requirementPaths,
    errors: executorResult.errors
  };
}

/**
 * Execute Claude Ideas for all contexts (batch mode)
 */
export async function executeClaudeIdeasBatch(config: {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanTypes: ScanType[];
  contexts: Array<{ id: string; name: string }>;
  batchId: string;
}): Promise<ClaudeIdeasResult> {
  const contextIds = config.contexts.map(c => c.id);

  // The new executor handles multiple contexts natively
  // and also includes full project analysis when contextIds is empty
  const result = await executeClaudeIdeasWithContexts({
    projectId: config.projectId,
    projectName: config.projectName,
    projectPath: config.projectPath,
    scanTypes: config.scanTypes,
    contextIds,
  });

  // Also run full project analysis (no context) - for backward compatibility
  const projectResult = await executeClaudeIdeasWithContexts({
    projectId: config.projectId,
    projectName: config.projectName,
    projectPath: config.projectPath,
    scanTypes: config.scanTypes,
    contextIds: [], // Empty means full project
  });

  // Transform executor results to handler result format
  return {
    success: result.success || projectResult.success,
    tasksCreated: result.filesCreated + projectResult.filesCreated,
    taskIds: [...result.requirementPaths, ...projectResult.requirementPaths],
    errors: [...result.errors, ...projectResult.errors]
  };
}
