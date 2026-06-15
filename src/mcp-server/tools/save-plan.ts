/**
 * Save Plan Tool
 *
 * Persists a CLI execution plan as Ideas in SQLite via POST /api/plans/save.
 * Called by the CLI after the ANALYZE & PLAN step with its list of planned
 * requirements.
 *
 * Each planned requirement becomes an Idea with status 'accepted',
 * giving the user visibility in the Ideas module and crash recovery.
 *
 * If the response says approval is required (a requirement crossed the
 * risk/effort threshold), STOP and wait for the user before implementing.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface FlaggedItem {
  id: string;
  title: string;
  effort: number | null;
  impact: number | null;
  risk: number | null;
  reason: string;
}

interface SavePlanResponse {
  success: boolean;
  savedCount?: number;
  ideaIds?: string[];
  requiresApproval?: boolean;
  flaggedItems?: FlaggedItem[];
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
        'Save the execution plan to the database. Call this after completing ' +
        'the ANALYZE & PLAN step with your list of planned requirements. Each requirement ' +
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
              risk: z
                .number()
                .min(1)
                .max(10)
                .optional()
                .describe('Risk of the change (1=very safe, 10=critical/dangerous). Drives the approval gate.'),
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
        effortThreshold: z
          .number()
          .optional()
          .describe('Hold requirements with effort ≥ this for approval (default 7)'),
        riskThreshold: z
          .number()
          .optional()
          .describe('Hold requirements with risk ≥ this for approval (default 7)'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ requirements, planSummary, effortThreshold, riskThreshold }) => {
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

      const result = await client.post<SavePlanResponse>('/api/plans/save', {
        projectId: config.projectId,
        taskId: config.taskId,
        requirements,
        planSummary,
        effortThreshold,
        riskThreshold,
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
        const flagged = (data.flaggedItems || [])
          .map(
            (f) =>
              `  • ${f.title} — ${f.reason} (effort ${f.effort ?? '?'}, risk ${f.risk ?? '?'}, impact ${f.impact ?? '?'}) [id: ${f.id}]`
          )
          .join('\n');
        return {
          content: [
            {
              type: 'text' as const,
              text:
                `Plan saved (${data.savedCount} requirements as Ideas). ` +
                `${data.flaggedItems?.length || 0} item(s) crossed the risk/effort threshold and are HELD for approval:\n${flagged}\n\n` +
                `IMPORTANT: STOP HERE. Present these flagged items to the user and ask them to approve or reject ` +
                `before adding them to an implementation wave. Once they decide, call resolve_approval with the idea IDs ` +
                `(approved=true to proceed, false to drop). Lower-risk items were auto-accepted and are ready.`,
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
