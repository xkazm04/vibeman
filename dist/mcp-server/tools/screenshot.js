"use strict";
/**
 * Screenshot Tools
 * Check for test scenarios and capture screenshots
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerScreenshotTools = registerScreenshotTools;
const zod_1 = require("zod");
function registerScreenshotTools(server, config, client) {
    // Check if test scenario exists
    server.tool('check_test_scenario', 'Check if a test scenario exists for a context. Call this BEFORE attempting screenshot capture to verify a scenario is configured.', {
        contextId: zod_1.z
            .string()
            .optional()
            .describe('Context ID to check. If not provided, uses the configured contextId.'),
    }, async ({ contextId }) => {
        const targetContextId = contextId || config.contextId;
        if (!targetContextId) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No contextId available. Skip screenshot capture.\nhasScenario: false',
                    },
                ],
            };
        }
        const result = await client.post('/api/tester/screenshot', {
            contextId: targetContextId,
            scanOnly: true,
        });
        if (!result.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to check test scenario: ${result.error}\nAssuming no scenario - skip screenshot capture.`,
                    },
                ],
                isError: true,
            };
        }
        const data = result.data;
        const hasScenario = data?.hasScenario ?? false;
        if (hasScenario) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Test scenario exists for context ${targetContextId}.\nLast tested: ${data?.daysAgo ?? 'never'} days ago.\nhasScenario: true\n\nYou can proceed with capture_screenshot tool.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `No test scenario found for context ${targetContextId}.\nhasScenario: false\n\nSkip screenshot capture.`,
                },
            ],
        };
    });
    // Capture screenshot
    server.tool('capture_screenshot', 'Capture a screenshot for a context. Only call this if check_test_scenario returned hasScenario: true. The screenshot will be stored and associated with the context.', {
        contextId: zod_1.z
            .string()
            .optional()
            .describe('Context ID to capture screenshot for. If not provided, uses the configured contextId.'),
    }, async ({ contextId }) => {
        const targetContextId = contextId || config.contextId;
        if (!targetContextId) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No contextId available. Cannot capture screenshot.',
                    },
                ],
                isError: true,
            };
        }
        const result = await client.post('/api/tester/screenshot', {
            contextId: targetContextId,
        });
        if (!result.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Screenshot capture failed: ${result.error}\nContinue without screenshot - this is non-blocking.`,
                    },
                ],
                isError: true,
            };
        }
        const data = result.data;
        if (data?.screenshotPath) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Screenshot captured successfully.\nPath: ${data.screenshotPath}\nDuration: ${data.duration || 'unknown'}ms`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: 'Screenshot capture completed but no path returned.\nContinue without screenshot.',
                },
            ],
        };
    });
}
//# sourceMappingURL=screenshot.js.map