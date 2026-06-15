/**
 * Context Write Tools
 *
 * Headless create/update/refresh for contexts and context groups, so a Claude
 * Code CLI can build and keep a project's context map fresh without the UI.
 * Thin wrappers over the existing /api/contexts, /api/context-groups, and
 * /api/context-generation endpoints.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface MutationResponse {
  success: boolean;
  data?: { id?: string; name?: string };
  error?: string;
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}
function fail(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true };
}

export function registerContextWriteTools(
  server: McpServer,
  config: McpConfig,
  client: VibemanHttpClient
) {
  // ── create_context ─────────────────────────────────────────────────────────
  server.registerTool(
    'create_context',
    {
      title: 'Create Context',
      description:
        'Create a new context (a named group of files with a description). Use after discovering a coherent area of the codebase that should be tracked.',
      inputSchema: z.object({
        name: z.string().describe('Short context name, e.g. "Auth & Sessions"'),
        filePaths: z.array(z.string()).describe('Project-relative file paths that belong to this context'),
        description: z.string().optional().describe('What this context does'),
        testScenario: z.string().optional().describe('How to verify this area works'),
        groupId: z.string().optional().describe('Context group ID to place this context in'),
        projectId: z.string().optional().describe('Project ID (defaults to the configured project)'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ name, filePaths, description, testScenario, groupId, projectId }) => {
      const pid = projectId || config.projectId;
      if (!pid) return fail('No projectId available. Provide projectId or set VIBEMAN_PROJECT_ID.');

      const result = await client.post<MutationResponse>('/api/contexts', {
        projectId: pid,
        name,
        filePaths,
        description,
        testScenario,
        groupId,
      });

      if (!result.success || !result.data?.success) {
        return fail(`Failed to create context: ${result.data?.error || result.error}`);
      }
      return ok(`Created context "${name}" (id: ${result.data.data?.id}) with ${filePaths.length} file(s).`);
    }
  );

  // ── update_context ───────────────────────────────────────────────────────────
  server.registerTool(
    'update_context',
    {
      title: 'Update Context',
      description:
        "Update a context's files, description, test scenario, or group. Only the fields you pass are changed. Use to keep a context current after implementing changes.",
      inputSchema: z.object({
        contextId: z.string().describe('Context ID to update'),
        name: z.string().optional(),
        description: z.string().optional(),
        filePaths: z.array(z.string()).optional().describe('Replaces the context file list'),
        testScenario: z.string().optional(),
        groupId: z.string().optional().describe('Move the context to this group'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ contextId, name, description, filePaths, testScenario, groupId }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (filePaths !== undefined) updates.file_paths = filePaths;
      if (testScenario !== undefined) updates.test_scenario = testScenario;
      if (groupId !== undefined) updates.group_id = groupId;

      if (Object.keys(updates).length === 0) {
        return fail('No fields to update. Pass at least one of name/description/filePaths/testScenario/groupId.');
      }

      const result = await client.put<MutationResponse>('/api/contexts', { contextId, updates });
      if (!result.success || !result.data?.success) {
        return fail(`Failed to update context: ${result.data?.error || result.error}`);
      }
      return ok(`Updated context ${contextId} (${Object.keys(updates).join(', ')}).`);
    }
  );

  // ── create_context_group ─────────────────────────────────────────────────────
  server.registerTool(
    'create_context_group',
    {
      title: 'Create Context Group',
      description: 'Create a context group to organize related contexts.',
      inputSchema: z.object({
        name: z.string().describe('Group name, e.g. "Backend" or "Auth"'),
        color: z.string().optional().describe('Hex color, defaults to a neutral indigo'),
        icon: z.string().optional(),
        position: z.number().optional(),
        projectId: z.string().optional().describe('Project ID (defaults to the configured project)'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ name, color, icon, position, projectId }) => {
      const pid = projectId || config.projectId;
      if (!pid) return fail('No projectId available. Provide projectId or set VIBEMAN_PROJECT_ID.');

      const result = await client.post<MutationResponse>('/api/context-groups', {
        projectId: pid,
        name,
        color: color || '#6366f1',
        icon,
        position,
      });
      if (!result.success || !result.data?.success) {
        return fail(`Failed to create context group: ${result.data?.error || result.error}`);
      }
      return ok(`Created context group "${name}" (id: ${result.data.data?.id}).`);
    }
  );

  // ── update_context_group ─────────────────────────────────────────────────────
  server.registerTool(
    'update_context_group',
    {
      title: 'Update Context Group',
      description: 'Rename or restyle a context group. Only the fields you pass are changed.',
      inputSchema: z.object({
        groupId: z.string().describe('Group ID to update'),
        name: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        position: z.number().optional(),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ groupId, name, color, icon, position }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;
      if (icon !== undefined) updates.icon = icon;
      if (position !== undefined) updates.position = position;

      if (Object.keys(updates).length === 0) {
        return fail('No fields to update. Pass at least one of name/color/icon/position.');
      }

      const result = await client.put<MutationResponse>('/api/context-groups', { groupId, updates });
      if (!result.success || !result.data?.success) {
        return fail(`Failed to update context group: ${result.data?.error || result.error}`);
      }
      return ok(`Updated context group ${groupId} (${Object.keys(updates).join(', ')}).`);
    }
  );

  // ── refresh_context ──────────────────────────────────────────────────────────
  server.registerTool(
    'refresh_context',
    {
      title: 'Refresh Context',
      description:
        "Re-read a context's files and regenerate its description with the LLM. Use to keep a single context fresh after you change its code.",
      inputSchema: z.object({
        contextId: z.string().optional().describe('Context ID to refresh (defaults to the configured context)'),
        provider: z.string().optional(),
        model: z.string().optional(),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ contextId, provider, model }) => {
      const cid = contextId || config.contextId;
      if (!cid) return fail('No contextId available. Provide contextId or set VIBEMAN_CONTEXT_ID.');

      const result = await client.post<{ success: boolean; error?: string; stats?: { filesAnalyzed: number; totalFiles: number } }>(
        '/api/context-generation/regenerate',
        { contextId: cid, provider, model }
      );
      if (!result.success || !result.data?.success) {
        return fail(`Failed to refresh context: ${result.data?.error || result.error}`);
      }
      const s = result.data.stats;
      return ok(`Refreshed context ${cid}${s ? ` (analyzed ${s.filesAnalyzed}/${s.totalFiles} files)` : ''}.`);
    }
  );

  // ── audit_contexts ───────────────────────────────────────────────────────────
  server.registerTool(
    'audit_contexts',
    {
      title: 'Audit Contexts',
      description:
        "Grade the project's context map against the granularity policy and categorization taxonomy. Advisory — surfaces oversized/uncategorized contexts, file overlap, groups missing a domain, etc. Run after generating or editing contexts.",
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
        ok?: boolean;
        tier?: string;
        totals?: { groups: number; contexts: number; files: number };
        findings?: Array<{ severity: string; message: string }>;
      }>('/api/contexts/audit', { projectId: pid });

      if (!result.success || !result.data?.success) {
        return fail(`Audit failed: ${result.data?.error || result.error}`);
      }
      const d = result.data;
      const findings = d.findings || [];
      const warns = findings.filter((f) => f.severity === 'warn');
      const header =
        `Context audit (${d.tier}): ${d.totals?.groups} groups, ${d.totals?.contexts} contexts, ${d.totals?.files} files. ` +
        (d.ok ? 'BALANCED ✓' : `${warns.length} issue(s) to fix:`);
      const lines = findings.map((f) => `  [${f.severity}] ${f.message}`).join('\n');
      return ok(findings.length ? `${header}\n${lines}` : header);
    }
  );

  // ── refresh_context_group ────────────────────────────────────────────────────
  server.registerTool(
    'refresh_context_group',
    {
      title: 'Refresh Context Group',
      description:
        "Re-read and regenerate descriptions for every context in a group. Use after a batch of changes to keep a whole area's contexts current.",
      inputSchema: z.object({
        groupId: z.string().describe('Group ID whose contexts to refresh'),
        provider: z.string().optional(),
        model: z.string().optional(),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ groupId, provider, model }) => {
      const result = await client.post<{ success: boolean; error?: string; updatedCount?: number; totalContexts?: number }>(
        '/api/context-generation/regenerate-group',
        { groupId, provider, model }
      );
      if (!result.success || !result.data?.success) {
        return fail(`Failed to refresh context group: ${result.data?.error || result.error}`);
      }
      return ok(`Refreshed group ${groupId}: updated ${result.data.updatedCount}/${result.data.totalContexts} contexts.`);
    }
  );

  // ── sync_context_map ─────────────────────────────────────────────────────────
  server.registerTool(
    'sync_context_map',
    {
      title: 'Sync Context Map',
      description:
        "Reconcile edits made to the project's committed context-map.json back into Vibeman's DB (upsert by name; never deletes). Run when Vibeman comes online after a CLI edited the map while it was offline.",
      inputSchema: z.object({
        projectId: z.string().optional().describe('Project ID (defaults to the configured project)'),
      }),
      annotations: { readOnlyHint: false },
    },
    async ({ projectId }) => {
      const pid = projectId || config.projectId;
      if (!pid) return fail('No projectId available. Provide projectId or set VIBEMAN_PROJECT_ID.');

      const result = await client.post<{
        success: boolean;
        error?: string;
        stats?: { groupsCreated: number; groupsUpdated: number; contextsCreated: number; contextsUpdated: number };
      }>('/api/contexts/import', { projectId: pid });

      if (!result.success || !result.data?.success) {
        return fail(`Failed to sync context map: ${result.data?.error || result.error}`);
      }
      const s = result.data.stats;
      return ok(
        `Synced context-map.json → DB: +${s?.groupsCreated ?? 0} groups (${s?.groupsUpdated ?? 0} updated), ` +
        `+${s?.contextsCreated ?? 0} contexts (${s?.contextsUpdated ?? 0} updated).`
      );
    }
  );
}
