/**
 * Read-Only Tools
 * Safe operations that only retrieve information
 */

import { ToolDefinition } from '../langTypes';

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
    name: 'get_project_backlog',
    description: 'Retrieves all backlog items and tasks for a specific project. Use when user asks about pending tasks, work items, project status, what work is planned, or backlog contents.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to fetch backlog for'
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
    name: 'get_background_tasks',
    description: 'Views background task queue status and history. Use when user needs to check task progress, see queue status, troubleshoot background operations, or asks "what tasks are running?" or "check task status".',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project (optional)'
        },
        status: {
          type: 'string',
          description: 'Filter by status: pending, processing, completed, failed (optional)'
        },
        limit: {
          type: 'number',
          description: 'Number of tasks to return (default: 100)'
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
  },
  {
    name: 'get_reviewer_pending_files',
    description: 'Lists files awaiting review. Use when user asks "what files need review?", "show pending reviews", or needs to see files that need review attention.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];
