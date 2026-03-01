/**
 * Progress Tool
 *
 * Reports structured progress from within an executing task.
 * Replaces parsed stream-json stdout with typed progress updates that
 * the Vibeman UI can render directly without heuristic classification.
 *
 * Uses /api/claude-code/tasks/:id/progress endpoint.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface ProgressResponse {
  success: boolean;
  progressIndex?: number;
  error?: string;
}

export function registerProgressTool(
  server: McpServer,
  config: McpConfig,
  client: VibemanHttpClient
) {
  server.registerTool(
    'report_progress',
    {
      title: 'Report Progress',
      description:
        'Report structured progress for the current task. Call this at each major phase transition ' +
        '(analyzing, planning, implementing, testing, validating) to provide real-time ' +
        'updates to the Vibeman dashboard. Include files changed and percentage estimate.',
      inputSchema: z.object({
        taskId: z
          .string()
          .optional()
          .describe(
            'The task/requirement ID. Uses configured VIBEMAN_TASK_ID if not provided.'
          ),
        phase: z
          .enum([
            'analyzing',
            'planning',
            'implementing',
            'testing',
            'validating',
          ])
          .optional()
          .describe('Current execution phase'),
        message: z
          .string()
          .describe(
            'Brief description of what you are currently doing (e.g., "Reading TaskRunner components", "Writing unit tests")'
          ),
        percentage: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe('Estimated completion percentage (0-100)'),
        files: z
          .array(z.string())
          .optional()
          .describe('List of files created or modified so far'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ taskId: inputTaskId, phase, message, percentage, files }) => {
      const resolvedTaskId = inputTaskId || config.taskId;
      if (!resolvedTaskId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No taskId provided and VIBEMAN_TASK_ID not configured. Cannot report progress.',
            },
          ],
          isError: true,
        };
      }

      const body: Record<string, unknown> = { message };
      if (phase) body.phase = phase;
      if (percentage !== undefined) body.percentage = percentage;
      if (files && files.length > 0) body.files = files;

      const result = await client.post<ProgressResponse>(
        `/api/claude-code/tasks/${encodeURIComponent(resolvedTaskId)}/progress`,
        body
      );

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Progress report failed: ${result.error || 'Unknown error'}. This is non-blocking - continue with task.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Progress reported: ${message}${phase ? ` [${phase}]` : ''}${percentage !== undefined ? ` ${percentage}%` : ''}`,
          },
        ],
      };
    }
  );
}
