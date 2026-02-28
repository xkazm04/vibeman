/**
 * Annette Tool Registry
 * Dispatches tool execution and generates Anthropic tool_use definitions.
 *
 * All tool metadata lives in toolDefinitions.ts (single source of truth).
 * This file handles lazy module loading and typed dispatch via the TOOL_TO_CATEGORY map.
 */

import { logger } from '@/lib/logger';
import { TOOL_DEFINITIONS, TOOL_TO_CATEGORY, type ToolCategory } from './toolDefinitions';

// ── Lazy tool module loaders ─────────────────────────────────────────

type ToolExecutor = (
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string,
) => Promise<string>;

const toolModules: Record<ToolCategory, () => Promise<ToolExecutor>> = {
  brain:      () => import('./tools/brain').then(m => m.executeBrainTools),
  directions: () => import('./tools/directions').then(m => m.executeDirectionTools),
  ideas:      () => import('./tools/ideas').then(m => m.executeIdeaTools),
  goals:      () => import('./tools/goals').then(m => m.executeGoalTools),
  contexts:   () => import('./tools/contexts').then(m => m.executeContextTools),
  tasks:      () => import('./tools/tasks').then(m => m.executeTaskTools),
  projects:   () => import('./tools/projects').then(m => m.executeProjectTools),
  standup:    () => import('./tools/standup').then(m => m.executeStandupTools),
  analysis:   () => import('./tools/analysis').then(m => m.executeAnalysisTools),
};

const resolvedModules = new Map<ToolCategory, ToolExecutor>();

async function getToolExecutor(category: ToolCategory): Promise<ToolExecutor> {
  let executor = resolvedModules.get(category);
  if (!executor) {
    executor = await toolModules[category]();
    resolvedModules.set(category, executor);
  }
  return executor;
}

// ── Public types ─────────────────────────────────────────────────────

/** Anthropic tool_use format (sent to the API) */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// ── Execution ────────────────────────────────────────────────────────

/**
 * Execute a tool call and return the result.
 * Uses the TOOL_TO_CATEGORY map for O(1) dispatch — no string prefix matching.
 */
export async function executeTool(
  toolCall: ToolCall,
  projectId: string,
  projectPath?: string
): Promise<ToolResult> {
  const { id, name, input } = toolCall;

  try {
    const category = TOOL_TO_CATEGORY[name];
    if (!category) {
      return { tool_use_id: id, content: `Unknown tool: ${name}`, is_error: true };
    }

    const execute = await getToolExecutor(category);
    const result = await execute(name, input, projectId, projectPath);
    return { tool_use_id: id, content: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
    logger.error('Annette tool execution failed', { tool: name, error });
    return { tool_use_id: id, content: `Error: ${errorMessage}`, is_error: true };
  }
}

// ── Definitions ──────────────────────────────────────────────────────

/**
 * Get all tool definitions for the Anthropic API.
 * Derived from the unified TOOL_DEFINITIONS — no separate maintenance needed.
 */
export function getToolDefinitions(): ToolDefinition[] {
  return TOOL_DEFINITIONS.map(def => ({
    name: def.name,
    description: def.description,
    input_schema: def.inputSchema,
  }));
}
