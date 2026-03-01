/**
 * MCP Tools Registry
 * Registers all Vibeman MCP tools with the server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpConfig } from '../config.js';
import { VibemanHttpClient } from '../http-client.js';
import { registerImplementationLogTool } from './implementation-log.js';
import { registerScreenshotTools } from './screenshot.js';
import { registerContextTools } from './context.js';
import { registerMemoryTool } from './memory.js';
import { registerProgressTool } from './progress.js';
import { registerRelatedTasksTool } from './related-tasks.js';

/**
 * Register all Vibeman MCP tools
 */
export function registerTools(server: McpServer, config: McpConfig) {
  const client = new VibemanHttpClient(config.baseUrl);

  // Implementation logging
  registerImplementationLogTool(server, config, client);

  // Screenshot tools
  registerScreenshotTools(server, config, client);

  // Context tools
  registerContextTools(server, config, client);

  // Bidirectional execution channel tools
  registerMemoryTool(server, config, client);
  registerProgressTool(server, config, client);
  registerRelatedTasksTool(server, config, client);

  console.error('[vibeman-mcp] Registered tools: log_implementation, check_test_scenario, capture_screenshot, get_context, list_contexts, get_config, get_memory, report_progress, get_related_tasks');
}
