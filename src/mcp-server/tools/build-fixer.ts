/**
 * Build Fixer Tool
 *
 * Reconnects the (previously caller-less) build-fixer engine to the autonomous
 * loop: run the project's build, group any compile/type errors, and — unless
 * previewOnly — write Claude Code requirement files describing the fixes so the
 * agent can act on them. Turns "detect build errors" into a real
 * detect -> stage-fix step instead of dead code.
 *
 * Uses the existing /api/build-fixer endpoint.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VibemanHttpClient } from '../http-client.js';
import { McpConfig } from '../config.js';

interface BuildFixerResult {
  success: boolean;
  totalErrors: number;
  totalWarnings: number;
  requirementFiles: string[];
  buildCommand: string;
  executionTime: number;
  error?: string;
}

export function registerBuildFixerTool(
  server: McpServer,
  _config: McpConfig,
  client: VibemanHttpClient
) {
  server.registerTool(
    'fix_build',
    {
      title: 'Detect & Stage Build-Error Fixes',
      description:
        "Run the project's build, group any compile/type errors, and (unless previewOnly) write " +
        'Claude Code requirement files describing how to fix them. Use to detect build breakage and ' +
        'turn it into actionable fix requirements. Returns error/warning counts and the requirement ' +
        'files created. Set previewOnly=true to scan without writing files.',
      inputSchema: z.object({
        projectPath: z.string().describe('Absolute path to the project to build and scan.'),
        buildCommand: z
          .string()
          .optional()
          .describe('Override the build command (default: auto-detected, e.g. "npm run build").'),
        previewOnly: z
          .boolean()
          .optional()
          .describe('If true, only scan and report errors; do not write requirement files (default: false).'),
      }),
      // Not read-only: writes requirement files unless previewOnly.
      annotations: {},
    },
    async ({ projectPath, buildCommand, previewOnly }) => {
      const path = previewOnly ? '/api/build-fixer?scanOnly=true' : '/api/build-fixer';
      const result = await client.post<BuildFixerResult>(path, {
        projectPath,
        ...(buildCommand ? { buildCommand } : {}),
      });

      if (!result.success || !result.data) {
        return {
          content: [{ type: 'text' as const, text: `Build scan failed: ${result.error || 'Unknown error'}` }],
          isError: true,
        };
      }

      const r = result.data;
      if (!r.success) {
        return {
          content: [{ type: 'text' as const, text: `Build scan could not run: ${r.error || 'Unknown error'}` }],
          isError: true,
        };
      }

      if (r.totalErrors === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Build clean — 0 errors${r.totalWarnings ? `, ${r.totalWarnings} warning(s)` : ''} (\`${r.buildCommand}\`).`,
            },
          ],
        };
      }

      const filesNote = previewOnly
        ? 'Preview only — no requirement files written. Re-run with previewOnly=false to stage fixes.'
        : r.requirementFiles.length > 0
          ? `Wrote ${r.requirementFiles.length} requirement file(s):\n${r.requirementFiles.map((f) => `- ${f}`).join('\n')}`
          : 'No requirement files were written.';

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Build (\`${r.buildCommand}\`) found ${r.totalErrors} error(s) and ${r.totalWarnings} warning(s).\n\n` +
              filesNote,
          },
        ],
      };
    }
  );
}
