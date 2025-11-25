/**
 * File Operations Tools
 * Operations for file and folder management
 */

import { ToolDefinition } from '@/lib/langgraph/langTypes';

export const FILE_OPERATIONS_TOOLS: ToolDefinition[] = [
  {
    name: 'read_file_content',
    description: 'Reads content of a specific file. Use when user asks to "show me the file", "read this file", or needs file contents.',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the file'
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'search_files',
    description: 'Searches for files by name or pattern. Use when user asks to "find files", "search for", or needs to locate files matching a pattern.',
    parameters: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Root path to search from'
        },
        pattern: {
          type: 'string',
          description: 'Search pattern (glob or regex)'
        },
        includeContent: {
          type: 'boolean',
          description: 'Include file contents in results (optional, default: false)'
        }
      },
      required: ['projectPath', 'pattern']
    }
  }
];
