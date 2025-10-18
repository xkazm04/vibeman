/**
 * Context & Documentation Tools
 * Operations for managing code contexts and documentation bundles
 */

import { ToolDefinition } from '../langTypes';

export const CONTEXT_DOCUMENTATION_TOOLS: ToolDefinition[] = [
  {
    name: 'create_context',
    description: 'Creates a new context bundle grouping related files for documentation. Use when user asks to "create context", "group these files", "make documentation bundle", or wants to organize code documentation.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Target project'
        },
        name: {
          type: 'string',
          description: 'Context name'
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of file paths to include'
        },
        description: {
          type: 'string',
          description: 'Context description (optional)'
        }
      },
      required: ['projectId', 'name', 'files']
    }
  },
  {
    name: 'update_context',
    description: 'Updates an existing context. Use when user asks to "update context", "modify context", change context details, or update the file list in a context.',
    parameters: {
      type: 'object',
      properties: {
        contextId: {
          type: 'string',
          description: 'Context to update'
        },
        updates: {
          type: 'object',
          description: 'Object with fields to update (name, files, description, etc.)'
        }
      },
      required: ['contextId', 'updates']
    }
  },
  {
    name: 'delete_context',
    description: 'Removes a context. REQUIRES user confirmation. Use only when user explicitly requests context deletion.',
    parameters: {
      type: 'object',
      properties: {
        contextId: {
          type: 'string',
          description: 'Context to delete'
        }
      },
      required: ['contextId']
    }
  },
  {
    name: 'generate_context',
    description: 'AI-powered context generation that analyzes files and creates smart documentation bundles. Use when user asks to "generate context", "auto-create documentation", or wants intelligent file grouping.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Target project'
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files to analyze and group'
        },
        instructions: {
          type: 'string',
          description: 'Optional instructions for context generation'
        }
      },
      required: ['projectId', 'files']
    }
  }
];
