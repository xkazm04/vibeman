import { ToolDefinition } from '@/lib/langgraph/langTypes';
import { implementationLogQueryHelpers } from '../lib/knowledgeQuery';

export const IMPLEMENTATION_LOG_TOOLS: ToolDefinition[] = [
    {
        name: 'get_untested_implementation_logs',
        description: 'Get implementation logs that have not been tested yet. Use this to find work that needs review.',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Number of logs to retrieve (default: 10)'
                }
            },
            required: []
        },
        execute: async ({ projectId, limit = 10 }: { projectId: string; limit?: number }) => {
            return implementationLogQueryHelpers.getUntestedLogs(projectId, limit);
        }
    },
    {
        name: 'get_implementation_log_details',
        description: 'Get details of a specific implementation log.',
        parameters: {
            type: 'object',
            properties: {
                logId: {
                    type: 'string',
                    description: 'ID of the implementation log'
                }
            },
            required: ['logId']
        },
        execute: async ({ logId }: { logId: string }) => {
            return implementationLogQueryHelpers.getLogDetails(logId);
        }
    }
];
