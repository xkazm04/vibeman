/**
 * Project Management Tools
 * Operations for managing projects and their configuration
 */

import { ToolDefinition } from '../langTypes';

export const PROJECT_MANAGEMENT_TOOLS: ToolDefinition[] = [
  {
    name: 'create_project',
    description: 'Registers a new project in the system. Use when user wants to add a new project, says "add new project", "register project", or provides project details to add. REQUIRES user confirmation.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Unique project identifier'
        },
        name: {
          type: 'string',
          description: 'Project name'
        },
        description: {
          type: 'string',
          description: 'Project description'
        },
        path: {
          type: 'string',
          description: 'Project path on filesystem'
        },
        git: {
          type: 'object',
          description: 'Git repository configuration (optional)'
        }
      },
      required: ['id', 'name', 'path']
    }
  },
  {
    name: 'update_project',
    description: 'Updates existing project configuration. Use when user asks to "update project settings", "change project config", or modify project details. REQUIRES user confirmation if changing critical settings.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project to update'
        },
        updates: {
          type: 'object',
          description: 'Object with fields to update (name, description, path, etc.)'
        }
      },
      required: ['projectId', 'updates']
    }
  },
  {
    name: 'delete_project',
    description: 'Removes a project from the system. DESTRUCTIVE OPERATION - use with extreme caution. REQUIRES explicit user confirmation. Use only when user explicitly requests project removal and confirms intent.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project to remove'
        }
      },
      required: ['projectId']
    }
  }
];
