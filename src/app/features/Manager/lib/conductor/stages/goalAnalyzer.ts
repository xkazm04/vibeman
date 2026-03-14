/**
 * Goal Analyzer
 *
 * Single-pass LLM analysis that examines the codebase relative to a stated goal,
 * injecting Brain behavioral context as institutional knowledge constraints and
 * weaving three scan type perspectives (zen_architect, bug_hunter, ui_perfectionist)
 * as analysis lenses. Produces a categorized gap report and prioritized backlog items.
 *
 * Pattern: fetch to /api/ai/chat proxy (from diffReviewer.ts)
 * Brain: getBehavioralContext() + formatBehavioralForPrompt() (from behavioralContext.ts)
 * Files: discoverRelevantFiles() (from fileDiscovery.ts)
 */

import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { discoverRelevantFiles } from './fileDiscovery';
import type {
  BacklogItemInput,
  GapItem,
  GapReport,
  GoalAnalyzerInput,
  GoalAnalyzerOutput,
} from './goalAnalyzer.types';

// ============================================================================
// Brain Context Section Builder
// ============================================================================

/**
 * Build a Brain section for the analysis prompt.
 * Formats topInsights and patterns as "institutional knowledge" constraints
 * that guide gap detection (not scoring).
 *
 * Returns empty string when Brain has no data.
 */
function buildBrainSection(projectId: string): string {
  const ctx = getBehavioralContext(projectId);
  if (!ctx.hasData) return '';

  const sections: string[] = [];

  if (ctx.topInsights.length > 0) {
    const insights = ctx.topInsights
      .map(i => `- ${i.title}: ${i.description} (${i.confidence}% confidence)`)
      .join('\n');
    sections.push(`### This project has learned:\n${insights}`);
  }

  if (ctx.patterns.preferredContexts.length > 0) {
    sections.push(`### Preferred areas: ${ctx.patterns.preferredContexts.join(', ')}`);
  }

  if (ctx.patterns.revertedCount > 0) {
    sections.push(`### Caution: ${ctx.patterns.revertedCount} recent reverts -- avoid similar patterns`);
  }

  if (sections.length === 0) return '';

  return `
## Project Intelligence (Brain Patterns)

Apply these learned patterns as active constraints when identifying gaps.
These represent institutional knowledge -- use them to guide WHAT gaps you look for,
but do NOT let them influence effort/impact/risk scoring (keep scoring objective).

${sections.join('\n\n')}
`;
}

// ============================================================================
// Context List Builder
// ============================================================================

/**
 * Get available project contexts (domains) for LLM domain assignment.
 * Uses dynamic require to avoid circular dependency at module load.
 */
function getProjectContexts(projectId: string): Array<{ id: string; name: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { contextDb } = require('@/app/db');
    const contexts = contextDb.getContextsByProjectId(projectId);
    if (!Array.isArray(contexts)) return [];
    return contexts.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
  } catch {
    return [];
  }
}

// ============================================================================
// Analysis Prompt Builder
// ============================================================================

/**
 * Build the comprehensive single-pass analysis prompt.
 * Includes: goal, Brain patterns, codebase context, available domains,
 * three scan type perspectives, and structured output format.
 */
function buildAnalysisPrompt(
  goal: GoalAnalyzerInput['goal'],
  brainSection: string,
  fileTree: string,
  fileContents: Array<{ path: string; content: string }>,
  contextList: Array<{ id: string; name: string }>
): string {
  // Format file contents section
  const filesSection = fileContents
    .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n');

  // Format available domains
  const domainSection = contextList.length > 0
    ? contextList.map(c => `- ID: "${c.id}" -- Name: "${c.name}"`).join('\n')
    : 'No domains defined. Use null for contextId.';

  return `You are a senior developer analyzing a codebase against a specific goal. Your task is to identify gaps (missing code, tech debt, untested areas, missing docs) relevant to the goal and generate prioritized backlog items.

## Goal

**${goal.title}**

${goal.description}

${brainSection}
## Codebase Context

### File Tree (project structure overview)
\`\`\`
${fileTree}
\`\`\`

### Relevant File Contents
${filesSection}

## Available Domains

When assigning a domain (contextId) to backlog items, select ONLY from this list. If no domain fits, use null.

${domainSection}

## Analysis Perspectives

Analyze the codebase through these three lenses simultaneously. Each perspective may reveal different gaps:

### Zen Architect Lens
Look for architectural gaps, missing abstractions, and structural debt. Consider: Are there patterns that should be extracted? Is the module structure clean? Are responsibilities well-separated? Are there missing interfaces or types?

### Bug Hunter Lens
Look for error handling gaps, edge cases, and fragile patterns. Consider: Are there missing null checks? Unhandled error paths? Race conditions? Missing input validation? Brittle assumptions?

### UI Perfectionist Lens
Look for UX gaps, accessibility issues, and inconsistent patterns. Consider: Are there missing loading states? Error feedback? Accessibility attributes? Inconsistent styling patterns? Missing responsive behavior?

## Output Format

Respond with ONLY valid JSON (no markdown fences, no explanation) in this exact structure:

{
  "gaps": [
    {
      "type": "missing_feature" | "tech_debt" | "missing_tests" | "missing_docs",
      "title": "Short descriptive title",
      "description": "What is missing and why it matters for the goal",
      "affectedFiles": ["path/to/file.ts"],
      "severity": "low" | "medium" | "high"
    }
  ],
  "backlogItems": [
    {
      "title": "Actionable task title",
      "description": "What needs to be done",
      "reasoning": "Why this matters for achieving the goal",
      "effort": 1-10,
      "impact": 1-10,
      "risk": 1-10,
      "category": "feature" | "improvement" | "bugfix" | "refactor" | "testing" | "documentation",
      "contextId": "domain-id-from-list-above or null",
      "source": "structural_analysis" | "creative_suggestion",
      "sourceScanType": "zen_architect" | "bug_hunter" | "ui_perfectionist",
      "relevanceScore": 0.0-1.0
    }
  ]
}

## Important Rules

1. Only identify gaps RELEVANT to the stated goal -- not generic improvements.
2. Tag each backlog item with source: "structural_analysis" for clear gaps, "creative_suggestion" for perspective-driven ideas.
3. Tag each backlog item with sourceScanType indicating which perspective identified it.
4. Effort, impact, and risk are 1-10 scales. Score them OBJECTIVELY based on the work involved -- do NOT let Brain patterns influence these scores.
5. relevanceScore is 0.0-1.0 indicating how directly this item relates to the goal.
6. Include ALL items you find -- do not pre-filter. The user will decide at triage what to include.
7. contextId must be an exact ID from the Available Domains list, or null if no domain fits.`;
}

// ============================================================================
// Response Parser
// ============================================================================

/**
 * Parse LLM response text into structured gaps and backlog items.
 * Handles common edge cases: code fences, malformed JSON.
 * Returns empty arrays on parse failure (non-blocking).
 */
function parseAnalysisResponse(
  responseText: string,
  validContextIds: Set<string>
): { gaps: GapItem[]; backlogItems: BacklogItemInput[] } {
  const empty = { gaps: [], backlogItems: [] };

  try {
    // Strip code fences if present
    let cleaned = responseText;
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1];
    }

    // Extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[goal-analyzer] No JSON object found in LLM response');
      return empty;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize gaps
    const gaps: GapItem[] = Array.isArray(parsed.gaps)
      ? parsed.gaps
          .filter((g: Record<string, unknown>) => g && typeof g.title === 'string')
          .map((g: Record<string, unknown>) => ({
            type: validateGapType(g.type as string) || 'missing_feature',
            title: String(g.title),
            description: String(g.description || ''),
            affectedFiles: Array.isArray(g.affectedFiles) ? g.affectedFiles.map(String) : [],
            severity: validateSeverity(g.severity as string) || 'medium',
          }))
      : [];

    // Validate and normalize backlog items
    const backlogItems: BacklogItemInput[] = Array.isArray(parsed.backlogItems)
      ? parsed.backlogItems
          .filter((b: Record<string, unknown>) => b && typeof b.title === 'string')
          .map((b: Record<string, unknown>) => ({
            title: String(b.title),
            description: String(b.description || ''),
            reasoning: String(b.reasoning || ''),
            effort: clamp(Number(b.effort) || 5, 1, 10),
            impact: clamp(Number(b.impact) || 5, 1, 10),
            risk: clamp(Number(b.risk) || 3, 1, 10),
            category: String(b.category || 'improvement'),
            contextId: validContextIds.has(String(b.contextId)) ? String(b.contextId) : null,
            source: validateSource(b.source as string) || 'structural_analysis',
            sourceScanType: validateScanType(b.sourceScanType as string),
            relevanceScore: clamp(Number(b.relevanceScore) || 0.5, 0, 1),
          }))
      : [];

    return { gaps, backlogItems };
  } catch (error) {
    console.warn('[goal-analyzer] Failed to parse LLM response:', error);
    return empty;
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

const VALID_GAP_TYPES = new Set(['missing_feature', 'tech_debt', 'missing_tests', 'missing_docs']);
const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);
const VALID_SOURCES = new Set(['structural_analysis', 'creative_suggestion']);
const VALID_SCAN_TYPES = new Set(['zen_architect', 'bug_hunter', 'ui_perfectionist']);

function validateGapType(value: string): GapItem['type'] | null {
  return VALID_GAP_TYPES.has(value) ? (value as GapItem['type']) : null;
}

function validateSeverity(value: string): GapItem['severity'] | null {
  return VALID_SEVERITIES.has(value) ? (value as GapItem['severity']) : null;
}

function validateSource(value: string): BacklogItemInput['source'] | null {
  return VALID_SOURCES.has(value) ? (value as BacklogItemInput['source']) : null;
}

function validateScanType(value: string): BacklogItemInput['sourceScanType'] | undefined {
  return VALID_SCAN_TYPES.has(value) ? (value as BacklogItemInput['sourceScanType']) : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Execute goal analysis: discover files, inject Brain context, call LLM,
 * parse response into GapReport + BacklogItemInput[].
 *
 * Non-blocking: returns empty output on LLM failure (matches Phase 4 pattern).
 * Single LLM call with all three scan type perspectives.
 */
export async function executeGoalAnalysis(
  input: GoalAnalyzerInput
): Promise<GoalAnalyzerOutput> {
  const { runId, projectId, projectPath, goal, config, abortSignal } = input;

  const emptyOutput: GoalAnalyzerOutput = {
    gapReport: {
      goalId: goal.id,
      analyzedFiles: [],
      gaps: [],
      analyzedAt: new Date().toISOString(),
    },
    backlogItems: [],
  };

  // 1. File discovery
  const contextId = goal.target_paths ?? null;
  const goalText = `${goal.title} ${goal.description}`;
  const { files, fileTree } = discoverRelevantFiles(projectId, projectPath, contextId, goalText);

  if (files.length === 0) {
    console.warn(`[goal-analyzer] No relevant files discovered for goal "${goal.title}"`);
  }

  // 2. Brain context injection (conditional)
  let brainSection = '';
  if (goal.use_brain) {
    brainSection = buildBrainSection(projectId);
  }

  // 3. Context list for domain assignment
  const projectContexts = getProjectContexts(projectId);
  const validContextIds = new Set(projectContexts.map(c => c.id));

  // 4. Build analysis prompt
  const prompt = buildAnalysisPrompt(goal, brainSection, fileTree, files, projectContexts);

  // 5. LLM call via /api/ai/chat proxy
  const model = config.scanModel || 'sonnet';

  try {
    // Check abort before making the call
    if (abortSignal?.aborted) {
      console.warn('[goal-analyzer] Aborted before LLM call');
      return emptyOutput;
    }

    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      console.warn(`[goal-analyzer] LLM call failed with status ${response.status}`);
      return emptyOutput;
    }

    const responseText = await response.text();

    // 6. Response parsing
    const { gaps, backlogItems } = parseAnalysisResponse(responseText, validContextIds);

    // 7. Build output
    const analyzedFiles = files.map(f => f.path);

    return {
      gapReport: {
        goalId: goal.id,
        analyzedFiles,
        gaps,
        analyzedAt: new Date().toISOString(),
      },
      backlogItems,
    };
  } catch (error) {
    // Non-blocking: network errors, abort, etc.
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('abort')) {
      console.warn('[goal-analyzer] Analysis aborted');
    } else {
      console.warn('[goal-analyzer] LLM call failed:', errorMsg);
    }
    return emptyOutput;
  }
}
