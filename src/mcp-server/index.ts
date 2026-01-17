#!/usr/bin/env node
/**
 * Vibeman MCP Server
 *
 * Provides tools for Claude Code to interact with Vibeman's internal APIs:
 * - log_implementation: Log implementation work to the database
 * - check_test_scenario: Check if a context has a test scenario
 * - capture_screenshot: Capture screenshots for contexts
 * - get_context: Get context details
 * - get_config: Get current configuration
 *
 * Communicates with Claude Code via stdio transport.
 * Calls Vibeman Next.js APIs over HTTP.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseConfig } from './config.js';
import { registerTools } from './tools/index.js';

async function main() {
  // Parse configuration from environment variables
  const config = parseConfig();

  // Create MCP server
  const server = new McpServer({
    name: 'vibeman',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
    instructions: `Vibeman MCP server provides tools for:
- log_implementation: Log implementation work to Vibeman database (call after completing tasks)
- check_test_scenario: Check if a context has a test scenario before capturing screenshots
- capture_screenshot: Capture UI screenshots for contexts with test scenarios
- get_context: Get detailed information about a context
- get_config: Get current Vibeman configuration (projectId, contextId, etc.)

Use these tools instead of curl commands for better reliability and error handling.
Configuration is provided via environment variables (VIBEMAN_PROJECT_ID, VIBEMAN_CONTEXT_ID, etc.).`,
  });

  // Register all tools
  registerTools(server, config);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[vibeman-mcp] Server started successfully');
  console.error(`[vibeman-mcp] Project ID: ${config.projectId || '(not set)'}`);
  console.error(`[vibeman-mcp] Context ID: ${config.contextId || '(not set)'}`);
  console.error(`[vibeman-mcp] Base URL: ${config.baseUrl}`);
}

main().catch((error) => {
  console.error('[vibeman-mcp] Fatal error:', error);
  process.exit(1);
});
