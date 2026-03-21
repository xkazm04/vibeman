/**
 * Save Plan Tool (V4 Gap 1+2)
 *
 * Persists the Conductor V4 execution plan as Ideas in SQLite.
 * Called by the CLI after STEP 1 (ANALYZE & PLAN) of the V4 protocol.
 *
 * Each planned requirement becomes an Idea with status 'accepted',
 * giving the user visibility in the Ideas module and crash recovery.
 *
 * If requirePlanApproval is enabled, returns a message telling the CLI
 * to wait for approval before proceeding to execution.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface SavePlanResponse {
  success: boolean;
  savedCount?: number;
  ideaIds?: string[];
  requiresApproval?: boolean;
  error?: string;
}

export function registerSavePlanTool(
  server: McpServer,
  config: McpConfig,
  client: VibemanHttpClient
) {
  server.registerTool(
    'save_plan',
    {
      title: 'Save Execution Plan',
      description:
        'Save the Conductor V4 execution plan to the database. Call this after completing ' +
        'STEP 1 (ANALYZE & PLAN) with your list of planned requirements. Each requirement ' +
        'will be saved as an Idea with status "accepted" for tracking and crash recovery. ' +
        'If the response says approval is required, STOP and wait — do not proceed to implementation.',
      inputSchema: z.object({
        requirements: z
          .array(
            z.object({
              title: z.string().describe('Short title for the requirement (2-8 words)'),
              description: z.string().describe('Detailed description of what needs to be implemented'),
              category: z
                .string()
                .optional()
                .describe('Category: feature, bugfix, refactor, performance, security, ui, test, docs'),
              effort: z
                .number()
                .min(1)
                .max(10)
                .optional()
                .describe('Estimated effort (1=trivial, 10=massive)'),
              impact: z
                .number()
                .min(1)
                .max(10)
                .optional()
                .describe('Expected impact (1=minimal, 10=critical)'),
              targetFiles: z
                .array(z.string())
                .optional()
                .describe('Files that will be created or modified'),
              contextId: z
                .string()
                .optional()
                .describe('Context ID this requirement belongs to (if known)'),
            })
          )
          .describe('Array of planned requirements to save'),
        planSummary: z
          .string()
          .optional()
          .describe('Brief summary of the overall plan and approach'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ requirements, planSummary }) => {
      if (!config.projectId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Warning: No projectId configured. Plan was not saved. Continue with execution.',
            },
          ],
          isError: true,
        };
      }

      const result = await client.post<SavePlanResponse>('/api/conductor/save-plan', {
        projectId: config.projectId,
        taskId: config.taskId,
        requirements,
        planSummary,
      });

      if (!result.success || !result.data?.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to save plan: ${result.data?.error || 'Unknown error'}\nThis is non-blocking — continue with execution.`,
            },
          ],
          isError: true,
        };
      }

      const data = result.data;

      if (data.requiresApproval) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Plan saved successfully (${data.savedCount} requirements as Ideas).\n\n` +
                `IMPORTANT: Plan approval is required. STOP HERE and wait for the user to approve ` +
                `the plan in the Vibeman dashboard before proceeding to implementation.\n` +
                `Do NOT continue until you receive a message to proceed.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Plan saved successfully: ${data.savedCount} requirements stored as Ideas.\n` +
              `Idea IDs: ${data.ideaIds?.join(', ') || 'N/A'}\n` +
              `Proceed to STEP 2 — execute each requirement.`,
          },
        ],
      };
    }
  );
}
