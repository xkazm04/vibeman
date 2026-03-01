"use strict";
/**
 * MCP Tools Registry
 * Registers all Vibeman MCP tools with the server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTools = registerTools;
const http_client_js_1 = require("../http-client.js");
const implementation_log_js_1 = require("./implementation-log.js");
const screenshot_js_1 = require("./screenshot.js");
const context_js_1 = require("./context.js");
const memory_js_1 = require("./memory.js");
const progress_js_1 = require("./progress.js");
const related_tasks_js_1 = require("./related-tasks.js");
/**
 * Register all Vibeman MCP tools
 */
function registerTools(server, config) {
    const client = new http_client_js_1.VibemanHttpClient(config.baseUrl);
    // Implementation logging
    (0, implementation_log_js_1.registerImplementationLogTool)(server, config, client);
    // Screenshot tools
    (0, screenshot_js_1.registerScreenshotTools)(server, config, client);
    // Context tools
    (0, context_js_1.registerContextTools)(server, config, client);
    // Bidirectional execution channel tools
    (0, memory_js_1.registerMemoryTool)(server, config, client);
    (0, progress_js_1.registerProgressTool)(server, config, client);
    (0, related_tasks_js_1.registerRelatedTasksTool)(server, config, client);
    console.error('[vibeman-mcp] Registered tools: log_implementation, check_test_scenario, capture_screenshot, get_context, list_contexts, get_config, get_memory, report_progress, get_related_tasks');
}
//# sourceMappingURL=index.js.map