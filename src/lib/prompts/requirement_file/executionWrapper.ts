/**
 * Execution Prompt Wrapper
 * Wraps requirement content with execution instructions for Claude Code
 *
 * This wrapper provides consistent execution instructions across all requirement types:
 * - Ideas from tinder accept
 * - Manager-generated plans
 * - Manual requirements
 *
 * Now uses the modular rules system for generating execution instructions.
 */

import { rulesLoader, type BuiltRules } from '@/lib/rules';

export interface ExecutionWrapperConfig {
  requirementContent: string;
  projectPath: string;
  projectId?: string;
  contextId?: string;
  projectPort?: number;
  runScript?: string;
  gitEnabled?: boolean;
  gitCommands?: string[];
  gitCommitMessage?: string;
  uiVerificationEnabled?: boolean;
  /** Base URL for Vibeman API calls in curl commands (default: http://localhost:3000) */
  vibemanBaseUrl?: string;
}

/**
 * Result of wrapping a requirement, includes built rules metadata
 */
export interface WrapResult {
  /** The full wrapped prompt content */
  content: string;
  /** Metadata about which rules were included */
  builtRules: BuiltRules;
}

/**
 * Wrap requirement content with execution instructions
 * Uses the modular rules system to build instructions
 */
export function wrapRequirementForExecution(config: ExecutionWrapperConfig): string {
  const result = wrapRequirementWithMetadata(config);
  return result.content;
}

/**
 * Wrap requirement content and return both the content and rules metadata
 * Useful for checkpoint tracking which needs to know which rules were included
 */
export function wrapRequirementWithMetadata(config: ExecutionWrapperConfig): WrapResult {
  const { requirementContent } = config;

  // Build rules using the loader
  const builtRules = rulesLoader.buildRules(config);

  const content = `You are an expert software engineer. Execute the following requirement immediately. Do not ask questions, do not wait for confirmation. Read the requirement carefully and implement all changes to the codebase as specified.

REQUIREMENT TO EXECUTE NOW:

${requirementContent}

${builtRules.fullContent}

Begin implementation now.`;

  return {
    content,
    builtRules,
  };
}
