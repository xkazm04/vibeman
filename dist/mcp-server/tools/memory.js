"use strict";
/**
 * Memory Tool
 *
 * Provides bidirectional access to collective memory during execution.
 * Instead of front-loading all memory into the prompt, Claude Code can
 * query relevant knowledge mid-execution when it encounters a specific
 * problem or needs context about a file/pattern.
 *
 * Uses the existing /api/collective-memory endpoint with action=relevant.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMemoryTool = registerMemoryTool;
const zod_1 = require("zod");
function registerMemoryTool(server, config, client) {
    server.registerTool('get_memory', {
        title: 'Get Collective Memory',
        description: 'Query the collective memory system for relevant knowledge about files, patterns, or problems. ' +
            'Use this when you encounter an unfamiliar pattern, need context about a file area, or want to ' +
            'check if a similar problem was solved before. Returns proven insights from past task executions.',
        inputSchema: zod_1.z.object({
            query: zod_1.z
                .string()
                .describe('What you want to know about. Can be a file path, error message, pattern name, or description of the problem.'),
            filePatterns: zod_1.z
                .string()
                .optional()
                .describe('JSON array of file patterns to match against (e.g., \'["src/app/features/TaskRunner","*.tsx"]\')'),
            limit: zod_1.z
                .number()
                .optional()
                .describe('Maximum number of memories to return (default: 5)'),
        }),
        annotations: { readOnlyHint: true },
    }, async ({ query, filePatterns, limit }) => {
        if (!config.projectId) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No projectId configured. Cannot query collective memory.',
                    },
                ],
                isError: true,
            };
        }
        const params = {
            projectId: config.projectId,
            action: 'relevant',
            requirementName: query,
            limit: String(limit ?? 5),
        };
        if (filePatterns) {
            params.filePatterns = filePatterns;
        }
        const result = await client.get('/api/collective-memory', params);
        if (!result.success || !result.data) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to query memory: ${result.error || 'Unknown error'}`,
                    },
                ],
                isError: true,
            };
        }
        const memories = result.data.memories || [];
        if (memories.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `No relevant memories found for query: "${query}"`,
                    },
                ],
            };
        }
        // Categorize memories for structured output
        const warnings = memories.filter((m) => m.memory_type === 'error_fix' ||
            m.memory_type === 'conflict_resolution');
        const patterns = memories.filter((m) => m.memory_type === 'pattern' || m.memory_type === 'optimization');
        const approaches = memories.filter((m) => !['error_fix', 'conflict_resolution', 'pattern', 'optimization'].includes(m.memory_type));
        const sections = [];
        if (warnings.length > 0) {
            const items = warnings
                .map((m) => `- [${Math.round(m.effectiveness_score * 100)}% effective] **${m.title}**: ${m.description.slice(0, 200)}`)
                .join('\n');
            sections.push(`**Warnings & Known Issues:**\n${items}`);
        }
        if (patterns.length > 0) {
            const items = patterns
                .map((m) => `- [${Math.round(m.effectiveness_score * 100)}% effective] **${m.title}**: ${m.description.slice(0, 200)}`)
                .join('\n');
            sections.push(`**Proven Patterns:**\n${items}`);
        }
        if (approaches.length > 0) {
            const items = approaches
                .map((m) => `- [${Math.round(m.effectiveness_score * 100)}% effective] **${m.title}**: ${m.description.slice(0, 200)}`)
                .join('\n');
            sections.push(`**Successful Approaches:**\n${items}`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${memories.length} relevant memories:\n\n${sections.join('\n\n')}`,
                },
            ],
        };
    });
}
//# sourceMappingURL=memory.js.map