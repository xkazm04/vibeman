/**
 * Idea Tools
 *
 * Headless idea scanning, ranked backlog retrieval, triage, and the risk/effort
 * approval gate — so a Claude Code CLI can drive the discover → triage → approve
 * loop entirely against Vibeman's database.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}
function fail(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true };
}

interface BacklogIdea {
  id: string;
  title: string;
  category: string;
  status: string;
  effort: number | null;
  impact: number | null;
  risk: number | null;
  score: number;
}

export function registerIdeaTools(
  server: McpServer,
  config: McpConfig,
  client: VibemanHttpClient
) {
  // ── scan_ideas ───────────────────────────────────────────────────────────────
  server.registerTool(
    'scan_ideas',
    {
      title: 'Scan Ideas',
      description:
        'Run an Idea scanner over a context or a whole context group. Reads the files server-side (you do not ship them) and generates ideas into the database. Provide a contextId or a groupId.',
      inputSchema: z.object({
        contextId: z.string().optional().describe('Scan a single context'),
        groupId: z.string().optional().describe('Scan every context in this group'),
        scanType: z
          .string()
          .optional()
          .describe('Idea scanner slug (e.g. bug_hunter, perf_optimizer, feature_scout). Omit to run the default set.'),
        detailed: z.boolean().optional().describe('Include implementation steps in generated ideas'),
        provider: z.string().optional(),
        projectId: z.string().optional().describe('Project ID (defaults to the configured project)'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ contextId, groupId, scanType, detailed, provider, projectId }) => {
      const pid = projectId || config.projectId;
      if (!pid) return fail('No projectId available. Provide projectId or set VIBEMAN_PROJECT_ID.');
      if (!contextId && !groupId) return fail('Provide a contextId or a groupId to scan.');

      const result = await client.post<{
        success: boolean;
        error?: string;
        totalIdeas?: number;
        contextsScanned?: number;
        perContext?: Array<{ contextName: string; ideaCount: number; error?: string }>;
      }>('/api/ideas/scan', { projectId: pid, contextId, groupId, scanType, detailed, provider });

      if (!result.success || !result.data?.success) {
        return fail(`Scan failed: ${result.data?.error || result.error}`);
      }
      const d = result.data;
      const lines = (d.perContext || [])
        .map((c) => `  - ${c.contextName}: ${c.ideaCount} idea(s)${c.error ? ` (${c.error})` : ''}`)
        .join('\n');
      return ok(
        `Scanned ${d.contextsScanned} context(s), generated ${d.totalIdeas} idea(s).\n${lines}\n\n` +
        `Use get_backlog to review and triage_idea to accept/reject.`
      );
    }
  );

  // ── get_backlog ──────────────────────────────────────────────────────────────
  server.registerTool(
    'get_backlog',
    {
      title: 'Get Idea Backlog',
      description:
        'Fetch a ranked idea backlog for the project. Defaults to pending ideas ranked by value (high impact, low effort/risk first).',
      inputSchema: z.object({
        status: z.string().optional().describe('pending|accepted|rejected|implemented|all (default: pending)'),
        sortBy: z.string().optional().describe('value|effort|impact|risk (default: value)'),
        order: z.string().optional().describe('asc|desc'),
        limit: z.number().optional().describe('Max ideas to return (default 50)'),
        projectId: z.string().optional().describe('Project ID (defaults to the configured project)'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ status, sortBy, order, limit, projectId }) => {
      const pid = projectId || config.projectId;
      if (!pid) return fail('No projectId available. Provide projectId or set VIBEMAN_PROJECT_ID.');

      const params: Record<string, string> = { projectId: pid };
      if (status) params.status = status;
      if (sortBy) params.sortBy = sortBy;
      if (order) params.order = order;
      if (limit) params.limit = String(limit);

      const result = await client.get<{ success: boolean; error?: string; total?: number; ideas?: BacklogIdea[] }>(
        '/api/ideas/backlog',
        params
      );
      if (!result.success || !result.data?.success) {
        return fail(`Failed to fetch backlog: ${result.data?.error || result.error}`);
      }
      const ideas = result.data.ideas || [];
      if (ideas.length === 0) return ok('No ideas in the backlog for this filter.');

      const lines = ideas
        .map(
          (i) =>
            `• [${i.id}] ${i.title}\n    ${i.category} · effort ${i.effort ?? '?'} · impact ${i.impact ?? '?'} · risk ${i.risk ?? '?'} · score ${i.score} · ${i.status}`
        )
        .join('\n');
      return ok(`Backlog (${ideas.length} of ${result.data.total}):\n${lines}`);
    }
  );

  // ── triage_idea ──────────────────────────────────────────────────────────────
  server.registerTool(
    'triage_idea',
    {
      title: 'Triage Idea',
      description:
        'Set an idea\'s status (accept/reject/etc.) and optionally record feedback. Use during triage to curate the backlog.',
      inputSchema: z.object({
        ideaId: z.string().describe('Idea ID to triage'),
        status: z
          .enum(['pending', 'accepted', 'rejected', 'implemented'])
          .describe('New status'),
        feedback: z.string().optional().describe('Why — recorded as user feedback'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ ideaId, status, feedback }) => {
      const body: Record<string, unknown> = { id: ideaId, status };
      if (feedback) body.user_feedback = feedback;

      const result = await client.patch<{ idea?: { id: string }; error?: string }>('/api/ideas', body);
      if (!result.success || !result.data?.idea) {
        return fail(`Failed to triage idea: ${result.data?.error || result.error}`);
      }
      return ok(`Idea ${ideaId} → ${status}.`);
    }
  );

  // ── get_pending_approvals ────────────────────────────────────────────────────
  server.registerTool(
    'get_pending_approvals',
    {
      title: 'Get Pending Approvals',
      description:
        'List plan items held by the risk/effort approval gate (high effort/risk, awaiting an explicit accept/reject). Present these to the user before they enter an implementation wave.',
      inputSchema: z.object({
        projectId: z.string().optional().describe('Project ID (defaults to the configured project)'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) => {
      const pid = projectId || config.projectId;
      if (!pid) return fail('No projectId available. Provide projectId or set VIBEMAN_PROJECT_ID.');

      const result = await client.get<{
        success: boolean;
        error?: string;
        count?: number;
        ideas?: Array<{ id: string; title: string; effort: number | null; risk: number | null; impact: number | null }>;
      }>('/api/ideas/pending-approval', { projectId: pid });

      if (!result.success || !result.data?.success) {
        return fail(`Failed to fetch pending approvals: ${result.data?.error || result.error}`);
      }
      const ideas = result.data.ideas || [];
      if (ideas.length === 0) return ok('No items awaiting approval.');
      const lines = ideas
        .map((i) => `• [${i.id}] ${i.title} — effort ${i.effort ?? '?'}, risk ${i.risk ?? '?'}, impact ${i.impact ?? '?'}`)
        .join('\n');
      return ok(`${ideas.length} item(s) awaiting approval:\n${lines}\n\nUse resolve_approval to accept or reject.`);
    }
  );

  // ── resolve_approval ─────────────────────────────────────────────────────────
  server.registerTool(
    'resolve_approval',
    {
      title: 'Resolve Approval',
      description:
        'Accept or reject a batch of flagged ideas after the user decides. Accepted items become ready for an implementation wave; rejected items are dropped.',
      inputSchema: z.object({
        ideaIds: z.array(z.string()).describe('Idea IDs to resolve'),
        approved: z.boolean().describe('true = accept (ready for wave), false = reject'),
        feedback: z.string().optional().describe('Optional note recorded on each idea'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ ideaIds, approved, feedback }) => {
      const result = await client.post<{ success: boolean; error?: string; updatedCount?: number; status?: string }>(
        '/api/ideas/approve',
        { ideaIds, approved, feedback }
      );
      if (!result.success || !result.data?.success) {
        return fail(`Failed to resolve approval: ${result.data?.error || result.error}`);
      }
      return ok(`Resolved ${result.data.updatedCount} idea(s) → ${result.data.status}.`);
    }
  );
}
