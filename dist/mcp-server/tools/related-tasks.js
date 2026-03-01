"use strict";
/**
 * Related Tasks Tool
 *
 * Queries the status of other tasks running in the same project.
 * Enables cross-task coordination: Claude Code can check what other
 * tasks are doing, which files they've modified, and avoid conflicts
 * during parallel DAG execution.
 *
 * Uses existing /api/claude-code/tasks endpoint with projectId filter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRelatedTasksTool = registerRelatedTasksTool;
const zod_1 = require("zod");
function registerRelatedTasksTool(server, config, client) {
    server.registerTool('get_related_tasks', {
        title: 'Get Related Tasks',
        description: 'Check the status of other tasks running in the same project. Use this to coordinate with ' +
            'parallel task executions: see what they are working on, avoid file conflicts, ' +
            'check if dependent tasks completed, or detect blockers across the batch.',
        inputSchema: zod_1.z.object({
            excludeTaskId: zod_1.z
                .string()
                .optional()
                .describe('Your own task/requirement ID to exclude from results'),
            projectId: zod_1.z
                .string()
                .optional()
                .describe('Project ID to filter tasks. If not provided, uses the configured projectId.'),
        }),
        annotations: { readOnlyHint: true },
    }, async ({ excludeTaskId, projectId }) => {
        const targetProjectId = projectId || config.projectId;
        if (!targetProjectId) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No projectId available. Cannot query related tasks.',
                    },
                ],
                isError: true,
            };
        }
        const result = await client.get('/api/claude-code/tasks', { projectId: targetProjectId });
        if (!result.success || !result.data) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to query related tasks: ${result.error || 'Unknown error'}`,
                    },
                ],
                isError: true,
            };
        }
        let tasks = result.data.tasks || [];
        // Exclude own task if specified
        if (excludeTaskId) {
            tasks = tasks.filter((t) => t.id !== excludeTaskId);
        }
        if (tasks.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No other tasks found. You are the only active task.',
                    },
                ],
            };
        }
        // Group by status
        const running = tasks.filter((t) => t.status === 'running');
        const pending = tasks.filter((t) => t.status === 'pending');
        const completed = tasks.filter((t) => t.status === 'completed' ||
            t.status === 'failed' ||
            t.status === 'session-limit');
        const sections = [];
        if (running.length > 0) {
            const items = running
                .map((t) => {
                // Show last 2 progress lines for context
                const recent = (t.progress || []).slice(-2);
                const recentStr = recent.length > 0
                    ? `\n    Recent: ${recent.map((l) => l.replace(/^\[.*?\]\s*/, '')).join(' → ')}`
                    : '';
                return `  - **${t.requirementName}** [RUNNING]${recentStr}`;
            })
                .join('\n');
            sections.push(`**Running (${running.length}):**\n${items}`);
        }
        if (pending.length > 0) {
            const items = pending
                .map((t) => `  - **${t.requirementName}** [PENDING]`)
                .join('\n');
            sections.push(`**Pending (${pending.length}):**\n${items}`);
        }
        if (completed.length > 0) {
            const items = completed
                .slice(0, 5)
                .map((t) => {
                const status = t.status === 'completed'
                    ? 'COMPLETED'
                    : t.status === 'session-limit'
                        ? 'SESSION-LIMIT'
                        : 'FAILED';
                const errorStr = t.error ? ` (${t.error.slice(0, 80)})` : '';
                return `  - **${t.requirementName}** [${status}]${errorStr}`;
            })
                .join('\n');
            sections.push(`**Recent Completions (${completed.length}):**\n${items}`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `${tasks.length} related task(s) found:\n\n${sections.join('\n\n')}\n\n**Coordination notes:** Avoid modifying files that running tasks are working on.`,
                },
            ],
        };
    });
}
//# sourceMappingURL=related-tasks.js.map