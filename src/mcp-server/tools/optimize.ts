/**
 * Token-optimization tools.
 *
 * Compressing replacements for large reads / searches / log dumps. They route
 * to `/api/optimize`, which runs the `vibeman-optimize` binary and caches into
 * the project's OWN `.vibeman/optimizer-cache.db` (per-project isolation).
 *
 * These are OFFERED alongside the native Read/Grep tools, not forced. Each tool
 * degrades gracefully: if the optimizer is unavailable it says so and tells the
 * agent to fall back to the native tool, so agent reliability is never at risk.
 *
 * Originals are never lost — every compressed result carries a hash; call
 * `vibeman_retrieve` to get the full original back on demand.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface OptimizeData {
  ok: boolean;
  error?: string;
  compressed?: string;
  content?: string;
  original_hash?: string;
  original_tokens: number;
  compressed_tokens: number;
  saved_tokens: number;
  strategy: string;
  cache_hit: boolean;
}

/** Project root for cache scoping. CLI cwd = project, inherited by this server. */
function projectRoot(): string {
  return process.env.VIBEMAN_PROJECT_PATH || process.cwd();
}

type McpText = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

/** Unwrap the `{ success, data: { ...optimize result } }` envelope and format. */
function format(
  result: { success: boolean; data?: unknown; error?: string },
  label: string
): McpText {
  if (!result.success || !result.data) {
    return {
      content: [{ type: 'text', text: `${label} unavailable (${result.error || 'unknown'}). Fall back to the native tool.` }],
      isError: true,
    };
  }
  // The API wraps payloads as { success, data }; unwrap one level if present.
  const envelope = result.data as { data?: OptimizeData } & Partial<OptimizeData>;
  const d: OptimizeData = (envelope.data as OptimizeData) ?? (envelope as OptimizeData);

  if (!d || !d.ok) {
    return {
      content: [{ type: 'text', text: `${label} failed: ${d?.error || 'unknown'}. Fall back to the native tool.` }],
      isError: true,
    };
  }

  const text = d.content ?? d.compressed ?? '';
  const note =
    d.strategy === 'passthrough' || d.strategy === 'retrieve'
      ? ''
      : `\n\n(vibeman-optimize ${d.strategy}: ~${d.original_tokens}→${d.compressed_tokens} tokens${d.cache_hit ? ', cached' : ''})`;
  return { content: [{ type: 'text', text: text + note }] };
}

export function registerOptimizeTools(server: McpServer, _config: McpConfig, client: VibemanHttpClient) {
  server.registerTool(
    'vibeman_read',
    {
      title: 'Read file (token-optimized)',
      description:
        'Read a file with token-aware compression. For LARGE files (configs, generated code, long modules) this returns a structural skeleton (imports, signatures, declarations) instead of every line, cutting context cost. Small files are returned verbatim. The full original is always recoverable via vibeman_retrieve. Prefer this over the native Read for large files when you need to understand structure, not every line.',
      inputSchema: z.object({
        path: z.string().describe('File path, relative to the project root (or absolute within the project).'),
        max_lines: z.number().optional().describe('Optional cap on kept lines before eliding (default 400).'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ path, max_lines }) =>
      format(
        await client.post('/api/optimize', {
          kind: 'read',
          projectPath: projectRoot(),
          path,
          options: max_lines ? { max_lines } : {},
        }),
        'vibeman_read'
      )
  );

  server.registerTool(
    'vibeman_search',
    {
      title: 'Search code (token-optimized)',
      description:
        'Search the project (ripgrep) and return RELEVANCE-RANKED, compressed results: top files first, top matches per file, the rest elided with counts. Much cheaper than dumping every match into context. Originals recoverable via vibeman_retrieve. Prefer this over native Grep for broad searches likely to return many matches.',
      inputSchema: z.object({
        query: z.string().describe('Search pattern (regex). Searched across the project with ripgrep.'),
        glob: z.string().optional().describe('Optional ripgrep -g glob filter, e.g. "*.ts".'),
        max_files: z.number().optional().describe('Max files to keep (default 20).'),
        max_lines: z.number().optional().describe('Total match-line budget across files (default 200).'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ query, glob, max_files, max_lines }) => {
      const options: Record<string, number> = {};
      if (max_files) options.max_files = max_files;
      if (max_lines) options.max_lines = max_lines;
      return format(
        await client.post('/api/optimize', {
          kind: 'search',
          projectPath: projectRoot(),
          query,
          glob,
          options,
        }),
        'vibeman_search'
      );
    }
  );

  server.registerTool(
    'vibeman_logs',
    {
      title: 'Compress logs/output',
      description:
        'Compress a large block of build/test/command output you already have, keeping errors, failures, and summary lines while eliding noise. Paste the raw output as `content`. Use before reasoning over a long log so it does not dominate your context. Original recoverable via vibeman_retrieve.',
      inputSchema: z.object({
        content: z.string().describe('Raw log / command output to compress.'),
        max_lines: z.number().optional().describe('Max lines to keep (default 200).'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ content, max_lines }) =>
      format(
        await client.post('/api/optimize', {
          kind: 'logs',
          projectPath: projectRoot(),
          content,
          options: max_lines ? { max_lines } : {},
        }),
        'vibeman_logs'
      )
  );

  server.registerTool(
    'vibeman_retrieve',
    {
      title: 'Retrieve original (uncompressed)',
      description:
        'Fetch the FULL original content for a hash shown in a vibeman_read/search/logs result (the `vibeman_retrieve hash=...` marker). Use when the compressed view elided something you now need in full.',
      inputSchema: z.object({
        hash: z.string().describe('The hash from a compression marker, e.g. the value in `vibeman_retrieve hash=abc123...`.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ hash }) =>
      format(
        await client.post('/api/optimize', {
          kind: 'retrieve',
          projectPath: projectRoot(),
          hash,
        }),
        'vibeman_retrieve'
      )
  );
}
