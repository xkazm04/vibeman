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
    console.error('[vibeman-mcp] Registered tools: log_implementation, check_test_scenario, capture_screenshot, get_context, list_contexts, get_config');
}
//# sourceMappingURL=index.js.map