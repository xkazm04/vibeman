/**
 * Brain Context Tool
 *
 * Surfaces the project's learned behavioral context to a running agent:
 * current focus areas, recent success/failure/revert rate, preferred contexts,
 * and top proven insights. Lets the autonomous agent self-consult "what has
 * this project learned / what's failing / where am I working" mid-execution,
 * not just at planning time — closing the loop between the Brain's learning
 * system and the execution engine.
 *
 * Uses the existing /api/brain/context endpoint.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface BehavioralContext {
  hasData: boolean;
  currentFocus?: {
    activeContexts?: Array<{ id: string; name: string; activityScore: number }>;
    recentCommitThemes?: string[];
  };
  patterns?: {
    successRate?: number;
    recentSuccesses?: number;
    recentFailures?: number;
    revertedCount?: number;
    preferredContexts?: Array<{ name?: string } | string>;
  };
  topInsights?: Array<{ title?: string; description?: string; confidence?: number } | string>;
}

// The route wraps the payload as { success, data: { context }, meta }.
interface BrainContextBody {
  success: boolean;
  data?: { context: BehavioralContext };
  error?: string;
}

export function registerBrainContextTool(
  server: McpServer,
  config: McpConfig,
  client: VibemanHttpClient
) {
  server.registerTool(
    'get_brain_context',
    {
      title: 'Get Brain Behavioral Context',
      description:
        'Consult what this project has learned from past work: current focus areas, recent ' +
        'success/failure/revert rate, preferred contexts, and top proven insights. Use mid-task ' +
        'to align with proven patterns, see where effort is concentrated, and avoid repeating work ' +
        'that was reverted. Reflects the Brain learning system, distinct from get_memory.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      if (!config.projectId) {
        return {
          content: [{ type: 'text' as const, text: 'No projectId configured. Cannot fetch brain context.' }],
          isError: true,
        };
      }

      const result = await client.get<BrainContextBody>('/api/brain/context', {
        projectId: config.projectId,
      });

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text' as const, text: `Failed to fetch brain context: ${result.error || 'Unknown error'}` }],
          isError: true,
        };
      }

      const ctx = result.data.data?.context;
      if (!ctx || !ctx.hasData) {
        return {
          content: [{ type: 'text' as const, text: 'No behavioral data has accumulated for this project yet.' }],
        };
      }

      const sections: string[] = [];

      const active = ctx.currentFocus?.activeContexts ?? [];
      if (active.length > 0) {
        sections.push(
          `**Current focus (most active contexts):**\n` +
            active.slice(0, 5).map((c) => `- ${c.name}`).join('\n')
        );
      }

      const p = ctx.patterns;
      if (p) {
        const pref = (p.preferredContexts ?? [])
          .map((c) => (typeof c === 'string' ? c : c?.name))
          .filter(Boolean);
        const lines = [
          `- Success rate: ${Math.round((p.successRate ?? 0) * 100)}% (${p.recentSuccesses ?? 0} ok / ${p.recentFailures ?? 0} failed)`,
          `- Reverted implementations: ${p.revertedCount ?? 0}`,
          pref.length ? `- Preferred contexts: ${pref.join(', ')}` : '',
        ].filter(Boolean);
        sections.push(`**Track record:**\n${lines.join('\n')}`);
      }

      const insights = ctx.topInsights ?? [];
      if (insights.length > 0) {
        const items = insights
          .slice(0, 5)
          .map((i) => {
            if (typeof i === 'string') return `- ${i}`;
            const conf = typeof i.confidence === 'number' ? ` [${Math.round(i.confidence * 100)}%]` : '';
            return `- **${i.title ?? 'insight'}**${conf}: ${(i.description ?? '').slice(0, 200)}`;
          })
          .join('\n');
        sections.push(`**Top proven insights:**\n${items}`);
      }

      if (sections.length === 0) {
        return { content: [{ type: 'text' as const, text: 'Behavioral context is present but empty.' }] };
      }

      return {
        content: [{ type: 'text' as const, text: `Brain behavioral context for this project:\n\n${sections.join('\n\n')}` }],
      };
    }
  );
}
