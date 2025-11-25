/**
 * Execution prompts for Claude Code
 * Provides instructions for executing requirements with proper logging and documentation
 *
 * NOTE: This file now delegates to the centralized execution wrapper
 * to ensure consistency across all requirement types (ideas, manager plans, manual requirements)
 */

import { wrapRequirementForExecution, ExecutionWrapperConfig } from '@/lib/prompts/requirement_file';

export interface ExecutionPromptConfig {
  requirementContent: string;
  projectPath: string;
  projectId?: string;
  contextId?: string; // Context ID if this requirement is related to a specific context
  projectPort?: number; // Port number for dev server (required for screenshots)
  runScript?: string; // Command to start dev server (e.g., "npm run dev")
  dbPath?: string; // Path to the SQLite database (deprecated - not used by wrapper)
  gitEnabled?: boolean; // Whether git operations are enabled
  gitCommands?: string[]; // List of git commands to execute
  gitCommitMessage?: string; // Commit message template
}

/**
 * Build the full execution prompt with enhanced instructions
 *
 * This function wraps the requirement content with execution instructions
 * using the centralized execution wrapper for consistency.
 */
export function buildExecutionPrompt(config: ExecutionPromptConfig): string {
  // Map to wrapper config (omit deprecated dbPath)
  const wrapperConfig: ExecutionWrapperConfig = {
    requirementContent: config.requirementContent,
    projectPath: config.projectPath,
    projectId: config.projectId,
    contextId: config.contextId,
    projectPort: config.projectPort,
    runScript: config.runScript,
    gitEnabled: config.gitEnabled,
    gitCommands: config.gitCommands,
    gitCommitMessage: config.gitCommitMessage,
  };

  return wrapRequirementForExecution(wrapperConfig);
}
