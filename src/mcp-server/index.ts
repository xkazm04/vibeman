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
 * - get_memory: Query collective memory for relevant knowledge mid-execution
 * - report_progress: Report structured progress with phase/percentage/files
 * - get_related_tasks: Check status of parallel tasks for coordination
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

Post-implementation:
- log_implementation: Log implementation work to Vibeman database (call after completing tasks)
- check_test_scenario: Check if a context has a test scenario before capturing screenshots
- capture_screenshot: Capture UI screenshots for contexts with test scenarios

Context & config:
- get_context: Get detailed information about a context
- get_config: Get current Vibeman configuration (projectId, contextId, etc.)

Bidirectional execution channel (use during implementation):
- get_memory: Query collective memory for relevant knowledge about files, patterns, or errors. Call when you encounter unfamiliar code, need context about a module, or want proven solutions to similar problems.
- report_progress: Report structured progress (phase, percentage, current step, files changed). Call at each major phase transition to provide real-time dashboard updates.
- get_related_tasks: Check status of other tasks running in parallel. Call to coordinate file changes and avoid conflicts during batch execution.

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
  console.error(`[vibeman-mcp] Task ID: ${config.taskId || '(not set)'}`);
  console.error(`[vibeman-mcp] Base URL: ${config.baseUrl}`);
}

main().catch((error) => {
  console.error('[vibeman-mcp] Fatal error:', error);
  process.exit(1);
});
