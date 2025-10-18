/**
 * Task & Backlog Management Tools
 * Operations for managing tasks and backlog items
 */

import { ToolDefinition } from '../langTypes';

export const TASK_BACKLOG_TOOLS: ToolDefinition[] = [
  {
    name: 'create_backlog_item',
    description: 'Creates a new backlog item/task. Use when user wants to add a task, create a backlog item, or says "add this to backlog".',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Target project'
        },
        title: {
          type: 'string',
          description: 'Task title'
        },
        description: {
          type: 'string',
          description: 'Task description'
        },
        priority: {
          type: 'string',
          description: 'Priority: low, medium, high, critical (optional)'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization (optional)'
        }
      },
      required: ['projectId', 'title']
    }
  },
  {
    name: 'update_backlog_item',
    description: 'Updates an existing backlog item. Use when user wants to modify a task, change priority, update description, or mark task as complete.',
    parameters: {
      type: 'object',
      properties: {
        itemId: {
          type: 'string',
          description: 'Backlog item to update'
        },
        updates: {
          type: 'object',
          description: 'Fields to update (title, description, priority, status, etc.)'
        }
      },
      required: ['itemId', 'updates']
    }
  },
  {
    name: 'delete_backlog_item',
    description: 'Removes a backlog item. REQUIRES user confirmation. Use when user explicitly wants to delete a task.',
    parameters: {
      type: 'object',
      properties: {
        itemId: {
          type: 'string',
          description: 'Backlog item to delete'
        }
      },
      required: ['itemId']
    }
  }
];
