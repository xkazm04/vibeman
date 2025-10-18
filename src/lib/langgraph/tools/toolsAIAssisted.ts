/**
 * AI-Assisted Operations Tools
 * Operations that use LLM for intelligent processing
 */

import { ToolDefinition } from '../langTypes';

export const AI_ASSISTED_TOOLS: ToolDefinition[] = [
  {
    name: 'analyze_code_quality',
    description: 'AI-powered code quality analysis. Use when user asks to "analyze code", "check code quality", or wants intelligent code review.',
    parameters: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files to analyze'
        },
        focus: {
          type: 'string',
          description: 'Focus area: security, performance, maintainability, all (optional)'
        }
      },
      required: ['files']
    }
  },
  {
    name: 'generate_documentation',
    description: 'AI-powered documentation generation. Use when user asks to "generate docs", "document this code", or wants automatic documentation.',
    parameters: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files to document'
        },
        format: {
          type: 'string',
          description: 'Output format: markdown, jsdoc, inline (optional)'
        }
      },
      required: ['files']
    }
  },
  {
    name: 'suggest_improvements',
    description: 'AI-powered code improvement suggestions. Use when user asks for "suggestions", "how to improve", or wants optimization ideas.',
    parameters: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files to analyze for improvements'
        },
        context: {
          type: 'string',
          description: 'Additional context or specific concerns (optional)'
        }
      },
      required: ['files']
    }
  }
];
