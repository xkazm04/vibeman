/**
 * Knowledge Base Tool
 *
 * Provides access to the cross-project knowledge base during execution.
 * Claude Code can query proven patterns, conventions, gotchas, and anti-patterns
 * relevant to the current task domain.
 *
 * Uses the existing /api/knowledge-base endpoint with action=query.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface KnowledgeEntry {
  id: string;
  domain: string;
  pattern_type: string;
  title: string;
  pattern: string;
  rationale: string | null;
  code_example: string | null;
  anti_pattern: string | null;
  confidence: number;
  times_applied: number;
  times_helpful: number;
}

interface KnowledgeResponse {
  success: boolean;
  data?: KnowledgeEntry[];
  error?: string;
}

export function registerKnowledgeTool(
  server: McpServer,
  config: McpConfig,
  client: VibemanHttpClient
) {
  server.registerTool(
    'get_knowledge',
    {
      title: 'Get Knowledge Base',
      description:
        'Query the cross-project knowledge base for proven patterns, conventions, gotchas, and anti-patterns. ' +
        'Use this when you need architectural guidance, want to check established conventions for a domain, ' +
        'or want to avoid known pitfalls. Returns battle-tested knowledge from past implementations.',
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            'Search query for knowledge entries. Can be a topic, pattern name, file area, or description of what you need guidance on.'
          ),
        domain: z
          .enum([
            'ui',
            'api',
            'state_management',
            'database',
            'testing',
            'performance',
            'architecture',
            'security',
          ])
          .optional()
          .describe(
            'Filter by technical domain. Omit to search across all domains.'
          ),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of entries to return (default: 5)'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ query, domain, limit }) => {
      const params: Record<string, string> = {
        action: 'query',
        search: query,
        limit: String(limit ?? 5),
      };
      if (domain) {
        params.domain = domain;
      }

      const result = await client.get<KnowledgeResponse>(
        '/api/knowledge-base',
        params
      );

      if (!result.success || !result.data) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to query knowledge base: ${result.error || 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }

      // The API returns { success, data } where data is the array
      const entries: KnowledgeEntry[] = Array.isArray(result.data)
        ? result.data
        : (result.data as unknown as { data: KnowledgeEntry[] }).data || [];

      if (entries.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `No knowledge entries found for query: "${query}"${domain ? ` in domain: ${domain}` : ''}`,
            },
          ],
        };
      }

      // Categorize entries for structured output
      const bestPractices = entries.filter(
        (e) => e.pattern_type === 'best_practice' || e.pattern_type === 'convention'
      );
      const warnings = entries.filter(
        (e) => e.pattern_type === 'anti_pattern' || e.pattern_type === 'gotcha'
      );
      const optimizations = entries.filter(
        (e) => e.pattern_type === 'optimization'
      );

      const sections: string[] = [];

      if (bestPractices.length > 0) {
        const items = bestPractices
          .map(
            (e) =>
              `- [${e.domain}] **${e.title}** (${e.confidence}% confidence): ${e.pattern.slice(0, 200)}${e.pattern.length > 200 ? '...' : ''}`
          )
          .join('\n');
        sections.push(`**Best Practices & Conventions:**\n${items}`);
      }

      if (warnings.length > 0) {
        const items = warnings
          .map(
            (e) =>
              `- [${e.domain}] **${e.title}** (${e.confidence}% confidence): ${e.pattern.slice(0, 200)}${e.anti_pattern ? `\n  Avoid: ${e.anti_pattern.slice(0, 100)}` : ''}`
          )
          .join('\n');
        sections.push(`**Gotchas & Anti-Patterns:**\n${items}`);
      }

      if (optimizations.length > 0) {
        const items = optimizations
          .map(
            (e) =>
              `- [${e.domain}] **${e.title}** (${e.confidence}% confidence): ${e.pattern.slice(0, 200)}`
          )
          .join('\n');
        sections.push(`**Optimizations:**\n${items}`);
      }

      // Catch any entries not in the above categories
      const categorized = new Set([...bestPractices, ...warnings, ...optimizations].map(e => e.id));
      const other = entries.filter((e) => !categorized.has(e.id));
      if (other.length > 0) {
        const items = other
          .map(
            (e) =>
              `- [${e.domain}/${e.pattern_type}] **${e.title}** (${e.confidence}% confidence): ${e.pattern.slice(0, 200)}`
          )
          .join('\n');
        sections.push(`**Other Knowledge:**\n${items}`);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${entries.length} knowledge entries:\n\n${sections.join('\n\n')}`,
          },
        ],
      };
    }
  );
}
