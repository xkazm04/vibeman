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
import { registerKnowledgeTool } from './knowledge.js';
import { registerSavePlanTool } from './save-plan.js';
import { registerBootstrapTaskTool } from './bootstrap-task.js';
import { registerOptimizeTools } from './optimize.js';
import { registerContextWriteTools } from './context-write.js';
import { registerIdeaTools } from './ideas.js';

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
  registerKnowledgeTool(server, config, client);
  registerSavePlanTool(server, config, client);

  // Compound tools
  registerBootstrapTaskTool(server, config, client);

  // Token-optimization tools (offered alongside native Read/Grep)
  registerOptimizeTools(server, config, client);

  // Headless context map maintenance (create/update/refresh contexts + groups)
  registerContextWriteTools(server, config, client);

  // Headless idea scan, ranked backlog, triage, and risk/effort approval gate
  registerIdeaTools(server, config, client);

  console.error('[vibeman-mcp] Registered tools: log_implementation, check_test_scenario, capture_screenshot, get_context, list_contexts, get_config, get_memory, report_progress, get_related_tasks, get_knowledge, save_plan, bootstrap_task, vibeman_read, vibeman_search, vibeman_logs, vibeman_retrieve, create_context, update_context, create_context_group, update_context_group, refresh_context, refresh_context_group, audit_contexts, sync_context_map, scan_ideas, get_backlog, triage_idea, get_pending_approvals, resolve_approval');
}
