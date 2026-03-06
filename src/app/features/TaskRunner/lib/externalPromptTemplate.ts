/**
 * Enhanced Prompt Template for External Requirements
 *
 * Wraps the base buildTaskPrompt() with an analysis preamble and
 * context-aware enrichment. Forces the CLI agent to analyze before
 * implementing, consult MCP tools for conflict detection, and
 * produce production-quality output.
 */

import { buildTaskPrompt, type TaskPromptParams } from './promptTemplate';
import type { MatchedContext } from '@/lib/supabase/external-types';

export interface ExternalPromptParams {
  /** Core requirement fields from Supabase */
  title: string;
  description: string;
  reasoning: string | null;
  category: string;
  priority: number;
  effort: number | null;
  impact: number | null;
  risk: number | null;
  sourceApp: string;
  externalRequirementId: string;

  /** Context matching results */
  matchedContexts: MatchedContext[];
  contextHints: string | null;

  /** Base prompt params (from existing template) */
  baseParams: TaskPromptParams;
}

/**
 * Build the enriched requirement content that becomes the prompt body.
 * This content is inserted into the base template via buildTaskPrompt().
 */
export function buildExternalTaskPrompt(params: ExternalPromptParams): string {
  const enrichedContent = buildEnrichedContent(params);

  return buildTaskPrompt({
    ...params.baseParams,
    requirementContent: enrichedContent,
  });
}

function buildEnrichedContent(params: ExternalPromptParams): string {
  const sections: string[] = [];

  // ── External requirement header ──────────────────────────────────────────
  sections.push(
    `## EXTERNAL REQUIREMENT`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Title** | ${params.title} |`,
    `| **Priority** | ${params.priority}/10 |`,
    `| **Category** | ${params.category} |`,
    `| **Source** | ${params.sourceApp} |`,
    `| **ID** | ${params.externalRequirementId} |`,
    ...(params.effort != null ? [`| **Effort** | ${params.effort}/10 |`] : []),
    ...(params.impact != null ? [`| **Impact** | ${params.impact}/10 |`] : []),
    ...(params.risk != null ? [`| **Risk** | ${params.risk}/10 |`] : []),
    ''
  );

  // ── Description ──────────────────────────────────────────────────────────
  sections.push(
    `## Description`,
    '',
    params.description,
    ''
  );

  // ── Source reasoning ─────────────────────────────────────────────────────
  if (params.reasoning) {
    sections.push(
      `## Source Reasoning`,
      '',
      params.reasoning,
      ''
    );
  }

  // ── Analysis phase instructions ──────────────────────────────────────────
  sections.push(
    `## ANALYSIS PHASE (Execute Before Implementation)`,
    '',
    `Before writing any code, complete the following analysis steps:`,
    '',
    `### Step 1: Context Review`,
    `Review the matched contexts below to understand the existing architecture.`,
    `Identify which files will need to be modified or created.`,
    '',
    `### Step 2: Conflict Detection`,
    `Use the \`get_related_tasks\` MCP tool to check if any parallel tasks`,
    `are modifying the same files. If conflicts are detected, coordinate`,
    `your changes to avoid overwriting their work.`,
    '',
    `### Step 3: Memory Consultation`,
    `Use the \`get_memory\` MCP tool with relevant file paths and patterns`,
    `to retrieve insights from previous implementations in this codebase.`,
    `This helps you follow established patterns and avoid known pitfalls.`,
    '',
    `### Step 4: Implementation Plan`,
    `Write a brief implementation plan (3-5 bullet points) covering:`,
    `- Files to create or modify`,
    `- Key patterns to follow from the existing codebase`,
    `- Testing approach`,
    `- Potential risks or edge cases`,
    '',
    `### Step 5: Progress Reporting`,
    `Use \`report_progress\` MCP tool at each phase transition:`,
    `- Phase "analyzing" — when starting analysis`,
    `- Phase "planning" — when writing implementation plan`,
    `- Phase "implementing" — when starting code changes`,
    `- Phase "testing" — when running verification`,
    `- Phase "validating" — when doing final checks`,
    ''
  );

  // ── Matched contexts ────────────────────────────────────────────────────
  sections.push(buildContextSection(params.matchedContexts));

  // ── Context hints from 3rd party ─────────────────────────────────────────
  if (params.contextHints) {
    try {
      const hints = JSON.parse(params.contextHints);
      if (Array.isArray(hints) && hints.length > 0) {
        sections.push(
          `## Context Hints from Source App`,
          '',
          `The external app provided these hints about relevant code areas:`,
          ''
        );
        for (const hint of hints) {
          sections.push(`- ${typeof hint === 'string' ? hint : JSON.stringify(hint)}`);
        }
        sections.push('');
      }
    } catch {
      // If context_hints is plain text, include it directly
      if (params.contextHints.trim()) {
        sections.push(
          `## Context Hints from Source App`,
          '',
          params.contextHints,
          ''
        );
      }
    }
  }

  // ── Quality requirements ─────────────────────────────────────────────────
  sections.push(
    `## QUALITY REQUIREMENTS`,
    '',
    `This is an external requirement — extra care is needed:`,
    `- Follow existing code patterns exactly (check matched contexts)`,
    `- Add \`data-testid\` attributes to all interactive UI elements`,
    `- Ensure TypeScript types are correct (\`npx tsc --noEmit\` must pass)`,
    `- Match the existing theme and design language`,
    `- Handle edge cases and error states`,
    ''
  );

  return sections.join('\n');
}

function buildContextSection(contexts: MatchedContext[]): string {
  if (contexts.length === 0) {
    return [
      `## Matched Contexts`,
      '',
      `No matching contexts were found automatically.`,
      `Use the \`list_contexts\` MCP tool to discover relevant code areas,`,
      `then use \`get_context\` to fetch details for the most relevant ones.`,
      '',
    ].join('\n');
  }

  const sections: string[] = [
    `## Matched Contexts (${contexts.length} relevant areas)`,
    '',
    `**Note**: These contexts provide architectural guidance — use them to`,
    `understand existing code structure and maintain consistency.`,
    '',
  ];

  for (const ctx of contexts) {
    sections.push(`### Context: ${ctx.name} (score: ${ctx.matchScore.toFixed(1)})`);

    if (ctx.description) {
      sections.push(`*${ctx.description}*`);
    }

    sections.push('');

    if (ctx.filePaths.length > 0) {
      sections.push('**Key Files**:');
      // Limit to 15 files to avoid prompt bloat
      const displayPaths = ctx.filePaths.slice(0, 15);
      for (const fp of displayPaths) {
        sections.push(`- \`${fp}\``);
      }
      if (ctx.filePaths.length > 15) {
        sections.push(`- ... and ${ctx.filePaths.length - 15} more files`);
      }
      sections.push('');
    }

    const metadata: string[] = [];
    if (ctx.entryPoints) metadata.push(`**Entry Points**: ${ctx.entryPoints}`);
    if (ctx.dbTables) metadata.push(`**DB Tables**: ${ctx.dbTables}`);
    if (ctx.apiSurface) metadata.push(`**API Surface**: ${ctx.apiSurface}`);
    if (ctx.techStack) metadata.push(`**Tech Stack**: ${ctx.techStack}`);

    if (metadata.length > 0) {
      sections.push(...metadata, '');
    }
  }

  return sections.join('\n');
}
