/**
 * Read-Only Tools
 * Safe operations that only retrieve information
 */

import { ToolDefinition } from './types';

export const READ_ONLY_TOOLS: ToolDefinition[] = [
  {
    name: 'get_project_contexts',
    description: 'Retrieves all contexts and context groups for a project from the knowledge base. Use when user asks about documentation structure, code organization, available contexts, or wants to see project documentation bundles.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to fetch contexts for'
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'get_context_detail',
    description: 'Retrieves detailed information about a specific context by ID or name. Use when user asks about a specific context, wants to see files in a context, or needs context details.',
    parameters: {
      type: 'object',
      properties: {
        contextId: {
          type: 'string',
          description: 'The ID of the context to fetch (optional if name is provided)'
        },
        name: {
          type: 'string',
          description: 'The name of the context to fetch (optional if contextId is provided)'
        },
        projectId: {
          type: 'string',
          description: 'The project ID (required when using name instead of contextId)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_all_projects',
    description: 'Lists all registered projects in the system. Use when user asks "what projects are available?", "show me all projects", needs project selection, or wants to see the project list.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_project_ideas',
    description: 'Retrieves all AI-generated ideas for a specific project from the ideas database. Use when user asks about pending ideas, idea count, project ideas, brainstormed features, or suggestions.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to fetch ideas for'
        },
        status: {
          type: 'string',
          description: 'Filter by status: pending, accepted, rejected, implemented (optional)'
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'get_folder_structure',
    description: 'Analyzes and returns project folder structure up to 3 levels deep. Use when user needs to understand project layout, see file organization, navigate the codebase, or asks "what\'s the project structure?" or "show me the files".',
    parameters: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to analyze (optional, defaults to current working directory)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_requirements_status',
    description: 'Checks requirement processing status. Use when user asks about requirement processing status or needs to see if requirements are being processed or completed.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];
