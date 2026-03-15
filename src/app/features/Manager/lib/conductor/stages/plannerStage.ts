/**
 * Planner Stage — Structure backlog with dependencies and composite groups
 *
 * Runs between Goal Analyzer and Scout in goal-driven pipeline runs.
 * Uses a single LLM call to:
 *   1. Refine/merge/split raw backlog items from Goal Analyzer
 *   2. Assign dependency ordering (which tasks must complete before others)
 *   3. Group related items into composite specs for efficient execution
 *
 * Pattern: fetch to /api/ai/chat proxy (from goalAnalyzer.ts)
 * Non-blocking: returns passthrough output on LLM failure.
 */

import { v4 as uuidv4 } from 'uuid';
import type { BacklogItemInput, GapReport } from './goalAnalyzer.types';
import type {
  PlannerInput,
  PlannerOutput,
  PlannerBacklogItem,
  CompositeGroup,
} from './plannerStage.types';

// ============================================================================
// Prompt Builder
// ============================================================================

function buildPlannerPrompt(
  input: PlannerInput,
  gapReport: GapReport,
  backlogItems: BacklogItemInput[]
): string {
  const gapsSection = gapReport.gaps.length > 0
    ? gapReport.gaps.map((g, i) =>
        `${i + 1}. [${g.severity}] ${g.title}: ${g.description}`
      ).join('\n')
    : 'No gaps identified.';

  const itemsSection = backlogItems.map((item, i) =>
    `${i + 1}. **${item.title}** (effort: ${item.effort}, impact: ${item.impact}, risk: ${item.risk}, category: ${item.category})
   ${item.description}
   Reasoning: ${item.reasoning}`
  ).join('\n\n');

  const refinedIntentSection = input.refinedIntent
    ? `\n## Refined Intent\n\nThe user provided additional clarification:\n\n${input.refinedIntent}\n`
    : '';

  return `You are a senior technical planner structuring a development backlog for autonomous execution.

## Goal

**${input.goal.title}**

${input.goal.description}
${refinedIntentSection}
## Gap Analysis Results

${gapsSection}

## Raw Backlog Items (from goal analysis)

${itemsSection}

## Your Task

Take the raw backlog items above and produce a structured execution plan:

1. **Refine items**: Merge duplicates, split overly broad items, improve descriptions. Each item should be a single, focused task that one developer can complete in isolation.

2. **Assign dependencies**: Identify which tasks must complete before others can start. For example, if task B modifies a file that task A creates, B depends on A.

3. **Group composites**: Group 2-3 closely related items that touch the same files into composite groups. These will be dispatched as a single CLI session for efficiency. Do NOT group items that are independent or touch different parts of the codebase. Most items should remain ungrouped.

## Output Format

Respond with ONLY valid JSON (no markdown fences, no explanation):

{
  "backlogItems": [
    {
      "itemId": "unique-short-id",
      "title": "Refined task title",
      "description": "Clear implementation instructions",
      "reasoning": "Why this matters for the goal",
      "effort": 1-10,
      "impact": 1-10,
      "risk": 1-10,
      "category": "feature|improvement|bugfix|refactor|testing|documentation",
      "contextId": null,
      "source": "structural_analysis",
      "relevanceScore": 0.0-1.0,
      "plannerGroupId": "group-id-or-null",
      "dependencies": ["itemId-of-dependency"]
    }
  ],
  "compositeGroups": [
    {
      "groupId": "group-id",
      "title": "Group title describing the composite task",
      "itemIds": ["itemId1", "itemId2"],
      "rationale": "Why these items should execute together"
    }
  ]
}

## Rules

1. Keep all items from the original backlog unless they are true duplicates.
2. Do NOT invent new items beyond what the gap analysis identified.
3. Composite groups should have 2-3 items maximum.
4. Most items should NOT be in a composite group — only group when items share the same files.
5. Dependencies should be minimal — only add when there is a real ordering constraint.
6. Each itemId must be a short, unique identifier (e.g., "item-1", "item-2").
7. Items NOT in a composite group should have plannerGroupId as null.`;
}

// ============================================================================
// Response Parser
// ============================================================================

function parsePlannerResponse(
  responseText: string,
  fallbackItems: BacklogItemInput[]
): PlannerOutput {
  const fallbackOutput = buildPassthroughOutput(fallbackItems);

  try {
    let cleaned = responseText;
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1];
    }

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[planner] No JSON object found in LLM response');
      return fallbackOutput;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Parse backlog items
    const backlogItems: PlannerBacklogItem[] = Array.isArray(parsed.backlogItems)
      ? parsed.backlogItems
          .filter((b: Record<string, unknown>) => b && typeof b.title === 'string')
          .map((b: Record<string, unknown>) => ({
            itemId: String(b.itemId || uuidv4().slice(0, 8)),
            title: String(b.title),
            description: String(b.description || ''),
            reasoning: String(b.reasoning || ''),
            effort: clamp(Number(b.effort) || 5, 1, 10),
            impact: clamp(Number(b.impact) || 5, 1, 10),
            risk: clamp(Number(b.risk) || 3, 1, 10),
            category: String(b.category || 'improvement'),
            contextId: b.contextId ? String(b.contextId) : null,
            source: (['structural_analysis', 'creative_suggestion'].includes(String(b.source))
              ? String(b.source)
              : 'structural_analysis') as BacklogItemInput['source'],
            relevanceScore: clamp(Number(b.relevanceScore) || 0.5, 0, 1),
            plannerGroupId: b.plannerGroupId ? String(b.plannerGroupId) : undefined,
            dependencies: Array.isArray(b.dependencies)
              ? b.dependencies.map(String)
              : [],
          }))
      : [];

    // Parse composite groups
    const compositeGroups: CompositeGroup[] = Array.isArray(parsed.compositeGroups)
      ? parsed.compositeGroups
          .filter((g: Record<string, unknown>) => g && typeof g.groupId === 'string' && Array.isArray(g.itemIds))
          .map((g: Record<string, unknown>) => ({
            groupId: String(g.groupId),
            title: String(g.title || 'Composite Task'),
            itemIds: (g.itemIds as unknown[]).map(String).slice(0, 3), // Cap at 3
            rationale: String(g.rationale || ''),
          }))
      : [];

    if (backlogItems.length === 0) {
      console.warn('[planner] LLM returned 0 backlog items, falling back to passthrough');
      return fallbackOutput;
    }

    return { backlogItems, compositeGroups };
  } catch (error) {
    console.warn('[planner] Failed to parse LLM response:', error);
    return fallbackOutput;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a passthrough output from raw Goal Analyzer items.
 * Used when the planner LLM call fails — items proceed without
 * dependency ordering or composite grouping.
 */
function buildPassthroughOutput(items: BacklogItemInput[]): PlannerOutput {
  return {
    backlogItems: items.map((item, i) => ({
      ...item,
      itemId: `item-${i + 1}`,
      dependencies: [],
    })),
    compositeGroups: [],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Execute the Planner stage: structure backlog items with dependency
 * ordering and composite groups.
 *
 * Non-blocking: returns passthrough output on LLM failure.
 */
export async function executePlannerStage(
  input: PlannerInput
): Promise<PlannerOutput> {
  const { backlogItems, gapReport, config, abortSignal } = input;

  // Skip planner if no items to plan
  if (backlogItems.length === 0) {
    return { backlogItems: [], compositeGroups: [] };
  }

  // For very small backlogs (1-2 items), skip the LLM call — no value in planning
  if (backlogItems.length <= 2) {
    return buildPassthroughOutput(backlogItems);
  }

  const prompt = buildPlannerPrompt(input, gapReport, backlogItems);
  const model = config.plannerModel || config.scanModel || 'sonnet';

  try {
    if (abortSignal?.aborted) {
      console.warn('[planner] Aborted before LLM call');
      return buildPassthroughOutput(backlogItems);
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
      console.warn(`[planner] LLM call failed with status ${response.status}`);
      return buildPassthroughOutput(backlogItems);
    }

    const responseText = await response.text();
    return parsePlannerResponse(responseText, backlogItems);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('abort')) {
      console.warn('[planner] Aborted');
    } else {
      console.warn('[planner] LLM call failed:', errorMsg);
    }
    return buildPassthroughOutput(backlogItems);
  }
}
