"use strict";
/**
 * MCP Server Configuration
 * Parses environment variables for Vibeman integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConfig = parseConfig;
/**
 * Parse configuration from environment variables
 *
 * Environment variables:
 * - VIBEMAN_BASE_URL: API base URL (default: http://localhost:3000)
 * - VIBEMAN_PROJECT_ID: Project ID (required)
 * - VIBEMAN_CONTEXT_ID: Context ID (optional)
 * - VIBEMAN_PROJECT_PORT: Dev server port (optional)
 * - VIBEMAN_RUN_SCRIPT: Dev server start command (optional)
 */
function parseConfig() {
    const config = {
        baseUrl: process.env.VIBEMAN_BASE_URL || 'http://localhost:3000',
        projectId: process.env.VIBEMAN_PROJECT_ID || '',
        contextId: process.env.VIBEMAN_CONTEXT_ID || undefined,
        projectPort: process.env.VIBEMAN_PROJECT_PORT
            ? parseInt(process.env.VIBEMAN_PROJECT_PORT, 10)
            : undefined,
        runScript: process.env.VIBEMAN_RUN_SCRIPT || undefined,
    };
    // ProjectId is required for meaningful operations
    if (!config.projectId) {
        console.error('[vibeman-mcp] Warning: VIBEMAN_PROJECT_ID not set. Some tools may not work correctly.');
    }
    return config;
}
//# sourceMappingURL=config.js.map