"use strict";
/**
 * Implementation Log Tool
 * Logs implementation work to Vibeman database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerImplementationLogTool = registerImplementationLogTool;
const zod_1 = require("zod");
function registerImplementationLogTool(server, config, client) {
    server.registerTool('log_implementation', {
        title: 'Log Implementation',
        description: 'Log implementation work to Vibeman database. Call this after completing any implementation task to record what was done.',
        inputSchema: zod_1.z.object({
            requirementName: zod_1.z
                .string()
                .describe('Requirement filename WITHOUT the .md extension (e.g., "implement-dark-mode")'),
            title: zod_1.z
                .string()
                .describe('Brief 2-6 word summary of what was implemented (e.g., "Dark Mode Implementation")'),
            overview: zod_1.z
                .string()
                .describe('1-2 paragraphs describing what was implemented and how'),
            overviewBullets: zod_1.z
                .string()
                .optional()
                .describe('Key implementation points separated by newlines (e.g., "Created ThemeProvider\\nUpdated components\\nAdded toggle")'),
        }),
        annotations: { readOnlyHint: false },
    }, async ({ requirementName, title, overview, overviewBullets }) => {
        if (!config.projectId) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Warning: No projectId configured. Log was not created.\nThis is non-blocking - continue with task completion.',
                    },
                ],
                isError: true,
            };
        }
        const result = await client.post('/api/implementation-log', {
            projectId: config.projectId,
            contextId: config.contextId || null,
            requirementName,
            title,
            overview,
            overviewBullets: overviewBullets || null,
        });
        if (!result.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to log implementation: ${result.error}\nThis is non-blocking - continue with task completion.`,
                    },
                ],
                isError: true,
            };
        }
        const logData = result.data;
        return {
            content: [
                {
                    type: 'text',
                    text: `Implementation logged successfully.\nLog ID: ${logData?.log?.id || 'unknown'}\nTitle: ${title}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=implementation-log.js.map