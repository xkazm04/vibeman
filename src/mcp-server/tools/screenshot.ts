/**
 * Screenshot Tools
 * Check for test scenarios and capture screenshots
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface TestScenarioResponse {
  hasScenario: boolean;
  scenario?: string;
  daysAgo?: number;
}

interface ScreenshotResponse {
  success: boolean;
  screenshotPath?: string;
  duration?: number;
  error?: string;
}

export function registerScreenshotTools(
  server: McpServer,
  config: McpConfig,
  client: VibemanHttpClient
) {
  // Check if test scenario exists
  server.registerTool(
    'check_test_scenario',
    {
      title: 'Check Test Scenario',
      description: 'Check if a test scenario exists for a context. Call this BEFORE attempting screenshot capture to verify a scenario is configured.',
      inputSchema: z.object({
        contextId: z
          .string()
          .optional()
          .describe('Context ID to check. If not provided, uses the configured contextId.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ contextId }) => {
      const targetContextId = contextId || config.contextId;

      if (!targetContextId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No contextId available. Skip screenshot capture.\nhasScenario: false',
            },
          ],
        };
      }

      const result = await client.post<TestScenarioResponse>('/api/tester/screenshot', {
        contextId: targetContextId,
        scanOnly: true,
      });

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
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
              type: 'text' as const,
              text: `Test scenario exists for context ${targetContextId}.\nLast tested: ${data?.daysAgo ?? 'never'} days ago.\nhasScenario: true\n\nYou can proceed with capture_screenshot tool.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `No test scenario found for context ${targetContextId}.\nhasScenario: false\n\nSkip screenshot capture.`,
          },
        ],
      };
    }
  );

  // Capture screenshot
  server.registerTool(
    'capture_screenshot',
    {
      title: 'Capture Screenshot',
      description: 'Capture a screenshot for a context. Only call this if check_test_scenario returned hasScenario: true. The screenshot will be stored and associated with the context.',
      inputSchema: z.object({
        contextId: z
          .string()
          .optional()
          .describe('Context ID to capture screenshot for. If not provided, uses the configured contextId.'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ contextId }) => {
      const targetContextId = contextId || config.contextId;

      if (!targetContextId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No contextId available. Cannot capture screenshot.',
            },
          ],
          isError: true,
        };
      }

      const result = await client.post<ScreenshotResponse>('/api/tester/screenshot', {
        contextId: targetContextId,
      });

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
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
              type: 'text' as const,
              text: `Screenshot captured successfully.\nPath: ${data.screenshotPath}\nDuration: ${data.duration || 'unknown'}ms`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: 'Screenshot capture completed but no path returned.\nContinue without screenshot.',
          },
        ],
      };
    }
  );
}
