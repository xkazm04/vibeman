/**
 * Progress Tool
 *
 * Reports structured progress from within an executing task.
 * Replaces parsed stream-json stdout with typed progress updates that
 * the Vibeman UI can render directly without heuristic classification.
 *
 * Uses /api/claude-code/tasks/:id/progress endpoint.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';
export declare function registerProgressTool(server: McpServer, config: McpConfig, client: VibemanHttpClient): void;
//# sourceMappingURL=progress.d.ts.map