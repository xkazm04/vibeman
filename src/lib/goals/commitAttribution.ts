/**
 * Commit Attribution
 *
 * Uses LLM to analyze git commit messages and PR descriptions against
 * active goal descriptions, producing context-aware goal attributions
 * instead of blanket-matching all active goals.
 */

import { generateWithLLM } from '@/lib/llm';
import type { DbGoal } from '@/app/db/models/types';
import { logger } from '@/lib/logger';

export interface CommitInfo {
  sha: string;
  message: string;
  author?: string;
  timestamp?: string;
}

export interface PRInfo {
  number: number;
  title: string;
  body?: string;
  commits?: CommitInfo[];
}

export interface AttributionResult {
  /** Commit SHA or PR identifier */
  sourceId: string;
  /** Commit message or PR title */
  sourceTitle: string;
  /** Goal IDs this commit/PR was attributed to */
  goalIds: string[];
  /** Optional context ID inferred from attribution */
  contextId?: string;
}

/**
 * Analyze commits against active goals using LLM and return attributions.
 * Falls back to empty attributions if LLM is unavailable.
 */
export async function attributeCommitsToGoals(
  commits: CommitInfo[],
  goals: DbGoal[]
): Promise<AttributionResult[]> {
  if (commits.length === 0 || goals.length === 0) return [];

  // Build compact goal summaries for the prompt
  const goalSummaries = goals.map(g => ({
    id: g.id,
    title: g.title,
    description: g.description?.slice(0, 200) || '',
    contextId: g.context_id || null,
  }));

  const commitSummaries = commits.map(c => ({
    sha: c.sha.slice(0, 8),
    message: c.message.slice(0, 300),
  }));

  const prompt = `You are analyzing git commits to determine which project goals they relate to.

## Goals
${JSON.stringify(goalSummaries, null, 2)}

## Commits
${JSON.stringify(commitSummaries, null, 2)}

For each commit, determine which goal(s) it most likely contributes to based on the commit message content matching the goal title/description. A commit may match zero, one, or multiple goals.

Only attribute a commit to a goal if there is a clear semantic connection. Do NOT attribute every commit to every goal.

Respond with ONLY a JSON array (no markdown fences):
[
  {
    "sha": "<first 8 chars>",
    "goalIds": ["goal-id-1"],
    "contextId": "context-id-if-known-or-null"
  }
]

If a commit doesn't match any goal, include it with an empty goalIds array.`;

  try {
    const response = await generateWithLLM(prompt, {
      taskType: 'commit-attribution',
      taskDescription: 'Attribute git commits to project goals',
      temperature: 0.1,
      maxTokens: 2000,
    });

    if (!response.success || !response.response) {
      logger.warn('[CommitAttribution] LLM call failed, skipping attribution', {
        error: response.error,
      });
      return [];
    }

    const parsed = parseAttributionResponse(response.response, commits, goals);
    return parsed;
  } catch (error) {
    logger.error('[CommitAttribution] Attribution failed', { error });
    return [];
  }
}

/**
 * Analyze a PR against active goals using LLM.
 */
export async function attributePRToGoals(
  pr: PRInfo,
  goals: DbGoal[]
): Promise<AttributionResult | null> {
  if (goals.length === 0) return null;

  const goalSummaries = goals.map(g => ({
    id: g.id,
    title: g.title,
    description: g.description?.slice(0, 200) || '',
    contextId: g.context_id || null,
  }));

  const prompt = `You are analyzing a GitHub Pull Request to determine which project goals it contributes to.

## Goals
${JSON.stringify(goalSummaries, null, 2)}

## Pull Request
Title: ${pr.title}
Body: ${(pr.body || '').slice(0, 500)}
${pr.commits?.length ? `Commits: ${pr.commits.map(c => c.message.slice(0, 100)).join('; ')}` : ''}

Determine which goal(s) this PR most likely contributes to. Only attribute if there is a clear semantic connection.

Respond with ONLY a JSON object (no markdown fences):
{
  "goalIds": ["goal-id-1"],
  "contextId": "context-id-if-known-or-null"
}

If no goals match, return: {"goalIds": [], "contextId": null}`;

  try {
    const response = await generateWithLLM(prompt, {
      taskType: 'pr-attribution',
      taskDescription: 'Attribute PR to project goals',
      temperature: 0.1,
      maxTokens: 1000,
    });

    if (!response.success || !response.response) {
      logger.warn('[CommitAttribution] PR attribution LLM call failed', {
        error: response.error,
      });
      return null;
    }

    const cleaned = response.response.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleaned) as { goalIds: string[]; contextId?: string | null };

    // Validate goal IDs exist
    const validGoalIds = new Set(goals.map(g => g.id));
    const matchedIds = (data.goalIds || []).filter(id => validGoalIds.has(id));

    if (matchedIds.length === 0) return null;

    return {
      sourceId: `pr-${pr.number}`,
      sourceTitle: pr.title,
      goalIds: matchedIds,
      contextId: data.contextId || undefined,
    };
  } catch (error) {
    logger.error('[CommitAttribution] PR attribution failed', { error });
    return null;
  }
}

/**
 * Parse the LLM's JSON response into validated AttributionResults.
 */
function parseAttributionResponse(
  raw: string,
  commits: CommitInfo[],
  goals: DbGoal[]
): AttributionResult[] {
  try {
    const cleaned = raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleaned) as Array<{
      sha: string;
      goalIds: string[];
      contextId?: string | null;
    }>;

    if (!Array.isArray(data)) return [];

    const validGoalIds = new Set(goals.map(g => g.id));
    const commitBySha = new Map(commits.map(c => [c.sha.slice(0, 8), c]));

    const results: AttributionResult[] = [];

    for (const entry of data) {
      const matchedIds = (entry.goalIds || []).filter(id => validGoalIds.has(id));
      if (matchedIds.length === 0) continue;

      const commit = commitBySha.get(entry.sha);
      if (!commit) continue;

      results.push({
        sourceId: commit.sha,
        sourceTitle: commit.message.split('\n')[0].slice(0, 100),
        goalIds: matchedIds,
        contextId: entry.contextId || undefined,
      });
    }

    return results;
  } catch (error) {
    logger.warn('[CommitAttribution] Failed to parse LLM response', { error, raw: raw.slice(0, 200) });
    return [];
  }
}
