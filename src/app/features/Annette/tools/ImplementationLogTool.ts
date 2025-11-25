import { ToolDefinition } from '@/lib/langgraph/langTypes';
import { implementationLogRepository } from '@/app/db/repositories/implementation-log.repository';

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
            const logs = implementationLogRepository.getUntestedLogsByProject(projectId);
            const untestedLogs = logs.slice(0, limit);

            return {
                count: untestedLogs.length,
                logs: untestedLogs
            };
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
            const log = implementationLogRepository.getLogById(logId);
            return { log };
        }
    }
];
