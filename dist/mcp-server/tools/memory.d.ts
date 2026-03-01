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
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';
export declare function registerMemoryTool(server: McpServer, config: McpConfig, client: VibemanHttpClient): void;
//# sourceMappingURL=memory.d.ts.map