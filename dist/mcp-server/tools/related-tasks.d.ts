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
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';
export declare function registerRelatedTasksTool(server: McpServer, config: McpConfig, client: VibemanHttpClient): void;
//# sourceMappingURL=related-tasks.d.ts.map