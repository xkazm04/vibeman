/**
 * LangGraph Tools
 * Available tools and configuration for the LangGraph pipeline
 * Organized by functional categories matching internal API capabilities
 */

import { ToolDefinition } from './langTypes';

// Import and re-export tool categories from modular files
export { READ_ONLY_TOOLS } from './tools/toolsReadOnly';
export { PROJECT_MANAGEMENT_TOOLS } from './tools/toolsProjectManagement';
export { CONTEXT_DOCUMENTATION_TOOLS } from './tools/toolsContextDocumentation';
export { TASK_BACKLOG_TOOLS } from './tools/toolsTaskBacklog';
export { BACKGROUND_PROCESSING_TOOLS } from './tools/toolsBackgroundProcessing';
export { FILE_OPERATIONS_TOOLS } from './tools/toolsFileOperations';
export { AI_ASSISTED_TOOLS } from './tools/toolsAIAssisted';
export { MONITORING_TOOLS } from './tools/toolsMonitoring';

// Re-import for internal use
import { READ_ONLY_TOOLS } from './tools/toolsReadOnly';
import { PROJECT_MANAGEMENT_TOOLS } from './tools/toolsProjectManagement';
import { CONTEXT_DOCUMENTATION_TOOLS } from './tools/toolsContextDocumentation';
import { TASK_BACKLOG_TOOLS } from './tools/toolsTaskBacklog';
import { BACKGROUND_PROCESSING_TOOLS } from './tools/toolsBackgroundProcessing';
import { FILE_OPERATIONS_TOOLS } from './tools/toolsFileOperations';
import { AI_ASSISTED_TOOLS } from './tools/toolsAIAssisted';
import { MONITORING_TOOLS } from './tools/toolsMonitoring';

// ============= ALL TOOLS COMBINED =============
// Master list of all available tools

export const AVAILABLE_TOOLS: ToolDefinition[] = [
  ...READ_ONLY_TOOLS,
  ...PROJECT_MANAGEMENT_TOOLS,
  ...CONTEXT_DOCUMENTATION_TOOLS,
  ...TASK_BACKLOG_TOOLS,
  ...BACKGROUND_PROCESSING_TOOLS,
  ...FILE_OPERATIONS_TOOLS,
  ...AI_ASSISTED_TOOLS,
  ...MONITORING_TOOLS
];

// Helper function to get tools by category
export function getToolsByCategory(category: string): ToolDefinition[] {
  switch (category.toLowerCase()) {
    case 'read-only':
      return READ_ONLY_TOOLS;
    case 'project-management':
      return PROJECT_MANAGEMENT_TOOLS;
    case 'context-documentation':
      return CONTEXT_DOCUMENTATION_TOOLS;
    case 'task-backlog':
      return TASK_BACKLOG_TOOLS;
    case 'background-processing':
      return BACKGROUND_PROCESSING_TOOLS;
    case 'file-operations':
      return FILE_OPERATIONS_TOOLS;
    case 'ai-assisted':
      return AI_ASSISTED_TOOLS;
    case 'monitoring':
      return MONITORING_TOOLS;
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
