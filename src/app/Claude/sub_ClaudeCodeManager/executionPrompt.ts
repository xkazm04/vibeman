/**
 * Execution prompts for Claude Code
 * Provides instructions for executing requirements with proper logging and documentation
 *
 * NOTE: This file now delegates to the centralized execution wrapper
 * to ensure consistency across all requirement types (ideas, manager plans, manual requirements)
 */

import { wrapRequirementForExecution, ExecutionWrapperConfig } from '@/lib/prompts/requirement_file';
import { getTaskKnowledge } from '@/lib/collective-memory/taskCompletionHook';

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
  taskId?: string; // Task ID for collective memory application tracking
}

export interface ExecutionPromptResult {
  prompt: string;
  /** Application IDs for injected collective memories (resolve after task completes) */
  memoryApplicationIds: string[];
}

/**
 * Build the full execution prompt with enhanced instructions.
 *
 * This function wraps the requirement content with execution instructions
 * using the centralized execution wrapper for consistency.
 * Injects relevant collective memory knowledge from past sessions and
 * creates application records for feedback loop tracking.
 */
export function buildExecutionPrompt(config: ExecutionPromptConfig): ExecutionPromptResult {
  let enhancedContent = config.requirementContent;
  let memoryApplicationIds: string[] = [];

  // Inject collective memory knowledge if we have a project ID
  if (config.projectId) {
    try {
      const { promptSection, applicationIds } = getTaskKnowledge({
        projectId: config.projectId,
        requirementName: config.requirementContent.slice(0, 200),
        taskId: config.taskId,
      });
      if (promptSection) {
        enhancedContent = `${config.requirementContent}\n${promptSection}`;
      }
      memoryApplicationIds = applicationIds;
    } catch {
      // Collective memory injection must never break execution
    }
  }

  // Map to wrapper config (omit deprecated dbPath)
  // vibemanBaseUrl defaults to http://localhost:3000 via rule variable defaults,
  // ensuring CLI in other projects always calls the correct Vibeman server
  const wrapperConfig: ExecutionWrapperConfig = {
    requirementContent: enhancedContent,
    projectPath: config.projectPath,
    projectId: config.projectId,
    contextId: config.contextId,
    projectPort: config.projectPort,
    runScript: config.runScript,
    gitEnabled: config.gitEnabled,
    gitCommands: config.gitCommands,
    gitCommitMessage: config.gitCommitMessage,
  };

  return {
    prompt: wrapRequirementForExecution(wrapperConfig),
    memoryApplicationIds,
  };
}
