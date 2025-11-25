/**
 * LangGraph Tools
 * Available tools and configuration for the LangGraph pipeline
 * Organized by functional categories matching internal API capabilities
 */

import { ToolDefinition } from './langTypes';

// Import and re-export tool categories from modular files
export { READ_ONLY_TOOLS } from '@/app/features/Annette/tools/toolsReadOnly';
export { TASK_BACKLOG_TOOLS } from '@/app/features/Annette/tools/toolsTaskBacklog';
export { EVENT_LISTENER_TOOLS } from '@/app/features/Annette/tools/EventListenerTool';
export { IMPLEMENTATION_LOG_TOOLS } from '@/app/features/Annette/tools/ImplementationLogTool';
export { GOAL_EVALUATOR_TOOLS } from '@/app/features/Annette/tools/GoalEvaluatorTool';

// Re-import for internal use
import { READ_ONLY_TOOLS } from '@/app/features/Annette/tools/toolsReadOnly';
import { TASK_BACKLOG_TOOLS } from '@/app/features/Annette/tools/toolsTaskBacklog';
import { FILE_OPERATIONS_TOOLS } from '@/app/features/Annette/tools/toolsFileOperations';
import { EVENT_LISTENER_TOOLS } from '@/app/features/Annette/tools/EventListenerTool';
import { IMPLEMENTATION_LOG_TOOLS } from '@/app/features/Annette/tools/ImplementationLogTool';
import { GOAL_EVALUATOR_TOOLS } from '@/app/features/Annette/tools/GoalEvaluatorTool';

// ============= ALL TOOLS COMBINED =============
// Master list of all available tools

export const AVAILABLE_TOOLS: ToolDefinition[] = [
  ...READ_ONLY_TOOLS,
  ...TASK_BACKLOG_TOOLS,
  ...FILE_OPERATIONS_TOOLS,
  ...EVENT_LISTENER_TOOLS,
  ...IMPLEMENTATION_LOG_TOOLS,
  ...GOAL_EVALUATOR_TOOLS
];

// Helper function to get tools by category
export function getToolsByCategory(category: string): ToolDefinition[] {
  switch (category.toLowerCase()) {
    case 'read-only':
      return READ_ONLY_TOOLS;
    case 'task-backlog':
      return TASK_BACKLOG_TOOLS;
    case 'file-operations':
      return FILE_OPERATIONS_TOOLS;
    default:
      return AVAILABLE_TOOLS;
  }
}

// Helper function to find tool by name
export function getToolByName(name: string): ToolDefinition | undefined {
  return AVAILABLE_TOOLS.find(tool => tool.name === name);
}

// Helper function to get destructive operations (require confirmation)
export function getDestructiveTools(): ToolDefinition[] {
  return AVAILABLE_TOOLS.filter(tool =>
    tool.description.includes('DESTRUCTIVE') ||
    tool.description.includes('REQUIRES') ||
    tool.name.includes('delete') ||
    tool.name.includes('remove')
  );
}
