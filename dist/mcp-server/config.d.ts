/**
 * MCP Server Configuration
 * Parses environment variables for Vibeman integration
 */
export interface McpConfig {
    /** Base URL for Vibeman Next.js API (default: http://localhost:3000) */
    baseUrl: string;
    /** Project ID - required for most operations */
    projectId: string;
    /** Context ID - optional, for context-specific tools */
    contextId?: string;
    /** Task ID - optional, for progress reporting during execution */
    taskId?: string;
    /** Project port for dev server (used in screenshot capture) */
    projectPort?: number;
    /** Run script for dev server (e.g., "npm run dev") */
    runScript?: string;
}
/**
 * Parse configuration from environment variables
 *
 * Environment variables:
 * - VIBEMAN_BASE_URL: API base URL (default: http://localhost:3000)
 * - VIBEMAN_PROJECT_ID: Project ID (required)
 * - VIBEMAN_CONTEXT_ID: Context ID (optional)
 * - VIBEMAN_TASK_ID: Task/requirement ID for progress reporting (optional)
 * - VIBEMAN_PROJECT_PORT: Dev server port (optional)
 * - VIBEMAN_RUN_SCRIPT: Dev server start command (optional)
 */
export declare function parseConfig(): McpConfig;
//# sourceMappingURL=config.d.ts.map