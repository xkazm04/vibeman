/**
 * Implementation Log Tool
 * Logs implementation work to Vibeman database
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface LogResponse {
  success: boolean;
  log?: {
    id: string;
    projectId: string;
    requirementName: string;
    title: string;
  };
  error?: string;
  message?: string;
}

export function registerImplementationLogTool(
  server: McpServer,
  config: McpConfig,
  client: VibemanHttpClient
) {
  server.registerTool(
    'log_implementation',
    {
      title: 'Log Implementation',
      description: 'Log implementation work to Vibeman database. Call this after completing any implementation task to record what was done.',
      inputSchema: z.object({
        requirementName: z
          .string()
          .describe('Requirement filename WITHOUT the .md extension (e.g., "implement-dark-mode")'),
        title: z
          .string()
          .describe('Brief 2-6 word summary of what was implemented (e.g., "Dark Mode Implementation")'),
        overview: z
          .string()
          .describe('1-2 paragraphs describing what was implemented and how'),
        overviewBullets: z
          .string()
          .optional()
          .describe('Key implementation points separated by newlines (e.g., "Created ThemeProvider\\nUpdated components\\nAdded toggle")'),
        category: z
          .enum(['feature', 'bugfix', 'refactor', 'performance', 'security', 'infrastructure', 'ui', 'docs', 'test'])
          .optional()
          .describe('Category of work performed'),
        patternsApplied: z
          .string()
          .optional()
          .describe('Comma-separated list of patterns or techniques used (e.g., "repository pattern, LRU cache, debounce")'),
        testResult: z
          .enum(['passed', 'failed', 'skipped'])
          .optional()
          .describe('Result of testing this implementation: passed (tests/browser verified), failed (tests broke), skipped (could not test)'),
        testDetails: z
          .string()
          .optional()
          .describe('Details about testing: what was tested, what failed, or why testing was skipped'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ requirementName, title, overview, overviewBullets, category, patternsApplied, testResult, testDetails }) => {
      if (!config.projectId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Warning: No projectId configured. Log was not created.\nThis is non-blocking - continue with task completion.',
            },
          ],
          isError: true,
        };
      }

      // Build metadata object from optional structured fields
      const metadata: Record<string, unknown> = {};
      if (category) metadata.category = category;
      if (patternsApplied) metadata.patterns_applied = patternsApplied.split(',').map(s => s.trim()).filter(Boolean);
      if (testResult) metadata.test_result = testResult;
      if (testDetails) metadata.test_details = testDetails;
      const hasMetadata = Object.keys(metadata).length > 0;

      // Set tested flag based on test result
      const tested = testResult === 'passed';

      const result = await client.post<LogResponse>('/api/implementation-log', {
        projectId: config.projectId,
        contextId: config.contextId || null,
        requirementName,
        title,
        overview,
        overviewBullets: overviewBullets || null,
        tested,
        ...(hasMetadata ? { metadata } : {}),
      });

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to log implementation: ${result.error}\nThis is non-blocking - continue with task completion.`,
            },
          ],
          isError: true,
        };
      }

      const logData = result.data;
      return {
        content: [
          {
            type: 'text' as const,
            text: `Implementation logged successfully.\nLog ID: ${logData?.log?.id || 'unknown'}\nTitle: ${title}`,
          },
        ],
      };
    }
  );
}
