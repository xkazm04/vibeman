/**
 * Background Processing Tools
 * Operations for background task management
 */

import { ToolDefinition } from '../langTypes';

export const BACKGROUND_PROCESSING_TOOLS: ToolDefinition[] = [
  {
    name: 'queue_background_task',
    description: 'Queues a task for background processing. Use when user wants to run a long operation in the background, process files asynchronously, or queue batch work.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Target project'
        },
        taskType: {
          type: 'string',
          description: 'Type of task: context_generation, file_analysis, etc.'
        },
        taskData: {
          type: 'object',
          description: 'Task-specific data and parameters'
        },
        priority: {
          type: 'string',
          description: 'Priority: low, normal, high (optional, default: normal)'
        }
      },
      required: ['projectId', 'taskType', 'taskData']
    }
  },
  {
    name: 'cancel_background_task',
    description: 'Cancels a pending or processing background task. Use when user wants to stop a running task or remove a queued task.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task to cancel'
        }
      },
      required: ['taskId']
    }
  },
  {
    name: 'retry_failed_task',
    description: 'Retries a failed background task. Use when user wants to retry a failed operation.',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Failed task to retry'
        }
      },
      required: ['taskId']
    }
  }
];
