/**
 * Bootstrap Task Tool
 *
 * Compound MCP tool that gathers all relevant context in a single call:
 * knowledge base entries, collective memory, context details, related tasks.
 *
 * Replaces the need for 4-5 separate tool calls (get_knowledge, get_memory,
 * get_context, get_related_tasks) at the start of each task by calling all
 * underlying APIs in parallel via Promise.all().
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient, ApiResponse } from '../http-client.js';
import { McpConfig } from '../config.js';

// --- Response types matching existing tool interfaces ---

interface KnowledgeEntry {
  id: string;
  domain: string;
  layer: string;
  pattern_type: string;
  title: string;
  pattern: string;
  rationale: string | null;
  code_example: string | null;
  anti_pattern: string | null;
  language: string;
  confidence: number;
  times_applied: number;
  times_helpful: number;
}

interface MemoryEntry {
  id: string;
  memory_type: string;
  title: string;
  description: string;
  code_pattern?: string;
  tags?: string;
  file_patterns?: string;
  effectiveness_score: number;
  success_count: number;
  failure_count: number;
}

interface ContextData {
  id: string;
  name: string;
  description?: string;
  file_paths?: string;
  test_scenario?: string;
  project_id: string;
  group_id?: string;
}

interface TaskEntry {
  id: string;
  requirementName: string;
  status: string;
  progress?: string[];
  error?: string;
}

// --- Formatting helpers ---

function formatKnowledge(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return '(none found)';

  const bestPractices = entries.filter(
    (e) => e.pattern_type === 'best_practice' || e.pattern_type === 'convention'
  );
  const warnings = entries.filter(
    (e) => e.pattern_type === 'anti_pattern' || e.pattern_type === 'gotcha'
  );
  const other = entries.filter(
    (e) =>
      !['best_practice', 'convention', 'anti_pattern', 'gotcha'].includes(e.pattern_type)
  );

  const sections: string[] = [];

  if (bestPractices.length > 0) {
    sections.push(
      bestPractices
        .map(
          (e) =>
            `- [${e.domain}] **${e.title}** (${e.confidence}%): ${e.pattern.slice(0, 200)}`
        )
        .join('\n')
    );
  }

  if (warnings.length > 0) {
    sections.push(
      '⚠ Warnings:\n' +
        warnings
          .map(
            (e) =>
              `- [${e.domain}] **${e.title}** (${e.confidence}%): ${e.pattern.slice(0, 200)}${e.anti_pattern ? `\n  Avoid: ${e.anti_pattern.slice(0, 100)}` : ''}`
          )
          .join('\n')
    );
  }

  if (other.length > 0) {
    sections.push(
      other
        .map(
          (e) =>
            `- [${e.domain}/${e.pattern_type}] **${e.title}** (${e.confidence}%): ${e.pattern.slice(0, 200)}`
        )
        .join('\n')
    );
  }

  return sections.join('\n');
}

function formatMemory(memories: MemoryEntry[]): string {
  if (memories.length === 0) return '(none found)';

  const warnings = memories.filter(
    (m) => m.memory_type === 'error_fix' || m.memory_type === 'conflict_resolution'
  );
  const patterns = memories.filter(
    (m) => m.memory_type === 'pattern' || m.memory_type === 'optimization'
  );
  const approaches = memories.filter(
    (m) =>
      !['error_fix', 'conflict_resolution', 'pattern', 'optimization'].includes(
        m.memory_type
      )
  );

  const sections: string[] = [];

  if (warnings.length > 0) {
    sections.push(
      '⚠ Known Issues:\n' +
        warnings
          .map(
            (m) =>
              `- [${Math.round(m.effectiveness_score * 100)}%] **${m.title}**: ${m.description.slice(0, 200)}`
          )
          .join('\n')
    );
  }

  if (patterns.length > 0) {
    sections.push(
      'Proven Patterns:\n' +
        patterns
          .map(
            (m) =>
              `- [${Math.round(m.effectiveness_score * 100)}%] **${m.title}**: ${m.description.slice(0, 200)}`
          )
          .join('\n')
    );
  }

  if (approaches.length > 0) {
    sections.push(
      'Approaches:\n' +
        approaches
          .map(
            (m) =>
              `- [${Math.round(m.effectiveness_score * 100)}%] **${m.title}**: ${m.description.slice(0, 200)}`
          )
          .join('\n')
    );
  }

  return sections.join('\n');
}

function formatContext(context: ContextData | null): string {
  if (!context) return '(no context configured)';
  return `**${context.name}** (${context.id})\nDescription: ${context.description || '(none)'}\nFiles: ${context.file_paths || '(none)'}\nTest Scenario: ${context.test_scenario || '(none)'}`;
}

function formatTasks(tasks: TaskEntry[], excludeId?: string): string {
  let filtered = tasks;
  if (excludeId) {
    filtered = tasks.filter((t) => t.id !== excludeId);
  }
  if (filtered.length === 0) return '(no other tasks running)';

  const running = filtered.filter((t) => t.status === 'running');
  const pending = filtered.filter((t) => t.status === 'pending');

  const sections: string[] = [];

  if (running.length > 0) {
    sections.push(
      `Running (${running.length}):\n` +
        running
          .map((t) => {
            const recent = (t.progress || []).slice(-2);
            const recentStr =
              recent.length > 0
                ? ` → ${recent.map((l) => l.replace(/^\[.*?\]\s*/, '')).join(' → ')}`
                : '';
            return `- **${t.requirementName}**${recentStr}`;
          })
          .join('\n')
    );
  }

  if (pending.length > 0) {
    sections.push(
      `Pending (${pending.length}):\n` +
        pending.map((t) => `- **${t.requirementName}**`).join('\n')
    );
  }

  return sections.join('\n');
}

// --- Tool registration ---

export function registerBootstrapTaskTool(
  server: McpServer,
  config: McpConfig,
  client: VibemanHttpClient
) {
  server.registerTool(
    'bootstrap_task',
    {
      title: 'Bootstrap Task Context',
      description:
        'Compound tool that gathers ALL relevant context in a single call. ' +
        'Use this at the start of any task instead of calling get_knowledge, get_memory, ' +
        'get_context, and get_related_tasks separately. Fetches knowledge base entries, ' +
        'collective memory, context details, and related task status in parallel, ' +
        'returning a unified context document. Saves 4-5 round-trips.',
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            'Search query for knowledge and memory lookups. Typically the task name, requirement title, or domain area.'
          ),
        contextId: z
          .string()
          .optional()
          .describe(
            'Context ID to fetch details for. Falls back to configured VIBEMAN_CONTEXT_ID.'
          ),
        knowledgeDomain: z
          .enum([
            'ui', 'api', 'state_management', 'database', 'testing', 'performance',
            'architecture', 'security', 'styling', 'accessibility', 'routing',
            'middleware', 'auth', 'validation', 'error_handling', 'caching',
            'migrations', 'queries', 'orm', 'devops', 'monitoring', 'deployment',
            'ci_cd', 'logging', 'patterns',
          ])
          .optional()
          .describe('Filter knowledge entries by domain. Omit to search all.'),
        knowledgeLimit: z
          .number()
          .optional()
          .describe('Max knowledge entries to return (default: 8)'),
        memoryLimit: z
          .number()
          .optional()
          .describe('Max memory entries to return (default: 5)'),
        filePatterns: z
          .string()
          .optional()
          .describe(
            'JSON array of file patterns for memory lookup (e.g., \'["src/app/features/X","*.tsx"]\')'
          ),
        excludeTaskId: z
          .string()
          .optional()
          .describe('Your own task ID to exclude from related tasks results'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ query, contextId, knowledgeDomain, knowledgeLimit, memoryLimit, filePatterns, excludeTaskId }) => {
      if (!config.projectId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No projectId configured. Set VIBEMAN_PROJECT_ID to use bootstrap_task.',
            },
          ],
          isError: true,
        };
      }

      // Build parallel requests
      const knowledgeParams: Record<string, string> = {
        action: 'query',
        search: query,
        limit: String(knowledgeLimit ?? 8),
      };
      if (knowledgeDomain) knowledgeParams.domain = knowledgeDomain;

      const memoryParams: Record<string, string> = {
        projectId: config.projectId,
        action: 'relevant',
        requirementName: query,
        limit: String(memoryLimit ?? 5),
      };
      if (filePatterns) memoryParams.filePatterns = filePatterns;

      const targetContextId = contextId || config.contextId;

      // Fire all requests in parallel
      const [knowledgeResult, memoryResult, contextResult, tasksResult] =
        await Promise.all([
          client.get<{ success: boolean; data?: KnowledgeEntry[] }>(
            '/api/knowledge-base',
            knowledgeParams
          ),
          client.get<{ success: boolean; memories?: MemoryEntry[] }>(
            '/api/collective-memory',
            memoryParams
          ),
          targetContextId
            ? client.get<{ success: boolean; data?: ContextData }>(
                '/api/contexts/detail',
                { contextId: targetContextId, projectId: config.projectId }
              )
            : Promise.resolve(null),
          client.get<{ tasks?: TaskEntry[] }>('/api/claude-code/tasks', {
            projectId: config.projectId,
          }),
        ]);

      // Extract data with safe fallbacks
      const knowledgeEntries = extractKnowledge(knowledgeResult);
      const memoryEntries = extractMemory(memoryResult);
      const contextData = extractContext(contextResult);
      const taskEntries = extractTasks(tasksResult);

      // Track which sources failed
      const errors: string[] = [];
      if (!knowledgeResult.success) errors.push('knowledge');
      if (!memoryResult.success) errors.push('memory');
      if (contextResult && !contextResult.success) errors.push('context');
      if (!tasksResult.success) errors.push('tasks');

      // Build unified document
      const sections = [
        `# Task Context: ${query}`,
        '',
        `## Knowledge Base (${knowledgeEntries.length} entries)`,
        formatKnowledge(knowledgeEntries),
        '',
        `## Collective Memory (${memoryEntries.length} entries)`,
        formatMemory(memoryEntries),
        '',
        '## Context',
        formatContext(contextData),
        '',
        '## Related Tasks',
        formatTasks(taskEntries, excludeTaskId || config.taskId),
      ];

      if (errors.length > 0) {
        sections.push('', `*Note: Failed to fetch: ${errors.join(', ')}*`);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: sections.join('\n'),
          },
        ],
      };
    }
  );
}

// --- Safe data extractors ---

function extractKnowledge(
  result: ApiResponse<{ success: boolean; data?: KnowledgeEntry[] }>
): KnowledgeEntry[] {
  if (!result.success || !result.data) return [];
  const data = result.data;
  if (Array.isArray(data)) return data as unknown as KnowledgeEntry[];
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function extractMemory(
  result: ApiResponse<{ success: boolean; memories?: MemoryEntry[] }>
): MemoryEntry[] {
  if (!result.success || !result.data) return [];
  return result.data.memories || [];
}

function extractContext(
  result: ApiResponse<{ success: boolean; data?: ContextData }> | null
): ContextData | null {
  if (!result || !result.success || !result.data) return null;
  return result.data.data || null;
}

function extractTasks(
  result: ApiResponse<{ tasks?: TaskEntry[] }>
): TaskEntry[] {
  if (!result.success || !result.data) return [];
  return result.data.tasks || [];
}
