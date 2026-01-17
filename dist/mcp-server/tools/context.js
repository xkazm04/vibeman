"use strict";
/**
 * Context Tools
 * Read and manage Vibeman contexts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerContextTools = registerContextTools;
const zod_1 = require("zod");
function registerContextTools(server, config, client) {
    // Get context details
    server.tool('get_context', 'Get detailed information about a specific context including its files, test scenario, and metadata.', {
        contextId: zod_1.z
            .string()
            .optional()
            .describe('Context ID to fetch. If not provided, uses the configured contextId.'),
    }, async ({ contextId }) => {
        const targetContextId = contextId || config.contextId;
        if (!targetContextId) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No contextId available. Provide a contextId or ensure VIBEMAN_CONTEXT_ID is set.',
                    },
                ],
                isError: true,
            };
        }
        const result = await client.get('/api/contexts/detail', {
            contextId: targetContextId,
            projectId: config.projectId,
        });
        if (!result.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get context: ${result.error}`,
                    },
                ],
                isError: true,
            };
        }
        const contextData = result.data?.data;
        if (!contextData) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Context ${targetContextId} not found.`,
                    },
                ],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Context: ${contextData.name}\n\nID: ${contextData.id}\nProject: ${contextData.project_id}\nDescription: ${contextData.description || '(none)'}\n\nFiles:\n${contextData.file_paths || '(none)'}\n\nTest Scenario:\n${contextData.test_scenario || '(none)'}`,
                },
            ],
        };
    });
    // List contexts for project
    server.tool('list_contexts', 'List all contexts for the current project.', {}, async () => {
        if (!config.projectId) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No projectId configured. Cannot list contexts.',
                    },
                ],
                isError: true,
            };
        }
        const result = await client.get('/api/contexts', {
            projectId: config.projectId,
        });
        if (!result.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to list contexts: ${result.error}`,
                    },
                ],
                isError: true,
            };
        }
        const contexts = result.data?.data?.contexts || [];
        if (contexts.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `No contexts found for project ${config.projectId}.`,
                    },
                ],
            };
        }
        const contextList = contexts
            .map((c) => `- ${c.name} (${c.id})${c.description ? `: ${c.description}` : ''}`)
            .join('\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${contexts.length} contexts:\n\n${contextList}`,
                },
            ],
        };
    });
    // Get current configuration
    server.tool('get_config', 'Get the current Vibeman MCP configuration including projectId, contextId, and other settings.', {}, async () => {
        return {
            content: [
                {
                    type: 'text',
                    text: `Vibeman MCP Configuration:\n\nProject ID: ${config.projectId || '(not set)'}\nContext ID: ${config.contextId || '(not set)'}\nProject Port: ${config.projectPort || '(not set)'}\nRun Script: ${config.runScript || '(not set)'}\nBase URL: ${config.baseUrl}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=context.js.map