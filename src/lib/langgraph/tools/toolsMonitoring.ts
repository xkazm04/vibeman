/**
 * Monitoring Tools
 * Operations for voicebot monitoring and evaluation
 */

import { ToolDefinition } from '../langTypes';

export const MONITORING_TOOLS: ToolDefinition[] = [
  {
    name: 'get_monitor_calls',
    description: 'Retrieves voicebot call monitoring data. Use when user asks about call history, monitoring data, or wants to see tracked conversations.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: active, completed, failed, abandoned (optional)'
        },
        startDate: {
          type: 'string',
          description: 'Filter by start date (ISO format, optional)'
        },
        endDate: {
          type: 'string',
          description: 'Filter by end date (ISO format, optional)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_monitor_statistics',
    description: 'Fetches voicebot call statistics. Use when user asks about call metrics, success rates, average duration, or monitoring statistics.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'evaluate_call_messages',
    description: 'Runs LLM evaluation on voicebot messages. Use when user asks to "evaluate this call", "analyze conversation quality", or wants AI-powered message assessment.',
    parameters: {
      type: 'object',
      properties: {
        callId: {
          type: 'string',
          description: 'Call ID to evaluate'
        }
      },
      required: ['callId']
    }
  },
  {
    name: 'get_message_patterns',
    description: 'Retrieves detected conversation patterns. Use when user asks about conversation patterns, common flows, or pattern analysis.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];
