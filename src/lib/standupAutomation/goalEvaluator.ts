/**
 * Goal Evaluator Service
 * LLM-powered analysis of goal completion status based on activity
 *
 * NOTE: Direct LLM calls are deprecated. Use Claude Code execution via
 * claudeCodeExecutor.ts for deep codebase exploration. The direct functions
 * are kept for backward compatibility but will be removed in a future version.
 */

import { goalDb, goalHubDb, implementationLogDb, ideaDb } from '@/app/db';
import { DbGoal } from '@/app/db/models/types';
import { logger } from '@/lib/logger';
import {
  GoalEvaluationContext,
  GoalEvaluationResult,
  GoalStatusChange,
  LLMGoalEvaluationResponse,
  AutonomyLevel,
} from './types';

// Lazy LLM client - only initialized if direct LLM functions are called
let llmClient: any = null;

async function getLLMClient(): Promise<any> {
  if (!llmClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set - use Claude Code execution instead');
    }
    // Dynamic import to avoid bundling issues when not using direct LLM
    const { AnthropicClient } = await import('@/lib/llm/providers/anthropic-client');
    logger.info('[GoalEvaluator] Initializing Anthropic client (deprecated path)', {
      hasApiKey: !!apiKey,
    });
    llmClient = new AnthropicClient({ apiKey });
  }
  return llmClient;
}

/**
 * Build evaluation prompt for a single goal
 */
function buildEvaluationPrompt(context: GoalEvaluationContext): string {
  const { goal, hypotheses, relatedImplementations, relatedIdeas, contextActivity, periodStats } = context;

  const verifiedHypotheses = hypotheses.filter(h => h.status === 'verified').length;
  const totalHypotheses = hypotheses.length;

  const hypothesisList = hypotheses
    .map(h => `  - [${h.status.toUpperCase()}] ${h.title}`)
    .join('\n');

  const implementationList = relatedImplementations
    .slice(0, 5)
    .map(impl => `  - ${impl.title}: ${impl.overview?.slice(0, 100) || 'No overview'}...`)
    .join('\n');

  const ideaList = relatedIdeas
    .slice(0, 5)
    .map(idea => `  - [${idea.status}] ${idea.title}`)
    .join('\n');

  return `You are evaluating whether a development goal should change status based on recent activity.

## Goal Information
- **Title**: ${goal.title}
- **Current Status**: ${goal.status}
- **Description**: ${goal.description || 'No description'}
- **Context ID**: ${goal.context_id || 'No context assigned'}
- **Created**: ${goal.created_at}

## Hypotheses (Success Criteria)
${totalHypotheses > 0 ? `Verified: ${verifiedHypotheses}/${totalHypotheses}` : 'No hypotheses defined'}
${hypothesisList || '  None'}

## Recent Implementations
${relatedImplementations.length > 0 ? `Count: ${relatedImplementations.length}` : 'No related implementations'}
${implementationList || '  None'}

## Related Ideas
${relatedIdeas.length > 0 ? `${relatedIdeas.filter(i => i.status === 'implemented').length}/${relatedIdeas.length} implemented` : 'No related ideas'}
${ideaList || '  None'}

## Activity Metrics
- Files changed: ${contextActivity.filesChanged}
- Commits: ${contextActivity.commitsCount}
- Last activity: ${contextActivity.lastActivity || 'Unknown'}
- Implementations this period: ${periodStats.implementationsThisPeriod}
- Ideas implemented: ${periodStats.ideasImplemented}

## Status Transition Rules
- **open → in_progress**: Work has started (implementations, verified hypotheses, or significant activity)
- **in_progress → done**: All hypotheses verified OR clear evidence of completion
- **in_progress → blocked**: Explicit blockers identified, no recent progress
- **blocked → in_progress**: Blockers resolved, work resumed

## Your Task
Evaluate this goal and determine:
1. Should the status change? If yes, to what?
2. What evidence supports this conclusion?
3. Are there any blockers preventing progress?
4. What is the estimated completion percentage (0-100)?
5. How confident are you in this assessment (0-100)?

Respond ONLY with valid JSON:
{
  "shouldUpdate": boolean,
  "newStatus": "open" | "in_progress" | "done" | "blocked" | null,
  "evidence": "string explaining the reasoning",
  "blockers": ["list of blocker strings"],
  "progress": number (0-100),
  "confidence": number (0-100),
  "reasoning": "detailed explanation"
}`;
}

/**
 * Parse LLM response into structured evaluation result
 */
function parseEvaluationResponse(response: string, goalId: string, currentStatus: string): GoalEvaluationResult | null {
  try {
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed: LLMGoalEvaluationResponse = JSON.parse(cleaned);

    return {
      goalId,
      shouldUpdate: parsed.shouldUpdate,
      currentStatus,
      recommendedStatus: parsed.newStatus || undefined,
      evidence: parsed.evidence || 'No evidence provided',
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
      progress: typeof parsed.progress === 'number' ? Math.min(100, Math.max(0, parsed.progress)) : 0,
      confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 50,
      reasoning: parsed.reasoning || parsed.evidence || 'No reasoning provided',
    };
  } catch (error) {
    console.error('[GoalEvaluator] Failed to parse LLM response:', error);
    return null;
  }
}

/**
 * Gather context data for goal evaluation
 */
export async function gatherGoalContext(goal: DbGoal): Promise<GoalEvaluationContext> {
  // Get hypotheses for this goal
  const hypotheses = goalHubDb.hypotheses.getByGoalId(goal.id);

  // Get implementations - filter by context if available
  const allImplementations = implementationLogDb.getLogsByProject(goal.project_id);

  // Try to find implementations related to the goal's context
  const relatedImplementations = goal.context_id
    ? allImplementations.filter(impl =>
        impl.context_id === goal.context_id ||
        impl.title.toLowerCase().includes(goal.title.toLowerCase().slice(0, 20))
      )
    : allImplementations.slice(0, 10);

  // Get ideas - filter by status and recency
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 7); // Last 7 days

  const allIdeas = ideaDb.getAllIdeas();
  const relatedIdeas = allIdeas.filter(idea => {
    if (!idea.created_at) return false;
    return new Date(idea.created_at) >= recentCutoff;
  }).slice(0, 20);

  // Calculate activity metrics
  const now = new Date();
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const recentImplementations = allImplementations.filter(impl => {
    if (!impl.created_at) return false;
    return new Date(impl.created_at) >= lastWeek;
  });

  const implementedIdeasCount = relatedIdeas.filter(i => i.status === 'implemented').length;

  // Determine last activity date
  let lastActivity: string | null = null;
  if (recentImplementations.length > 0) {
    const dates = recentImplementations
      .map(i => i.created_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    lastActivity = dates[0] || null;
  }

  return {
    goal,
    hypotheses,
    relatedImplementations: relatedImplementations.slice(0, 10),
    relatedIdeas: relatedIdeas.slice(0, 10),
    contextActivity: {
      filesChanged: recentImplementations.length, // Approximate: each implementation counts as a file change
      commitsCount: recentImplementations.length,
      lastActivity,
    },
    periodStats: {
      implementationsThisPeriod: recentImplementations.length,
      ideasImplemented: implementedIdeasCount,
    },
  };
}

/**
 * Evaluate a single goal using Anthropic Claude
 *
 * @deprecated Use executeGoalEvaluationViaClaudeCode from claudeCodeExecutor.ts
 * for deep codebase exploration with Claude Code CLI
 */
export async function evaluateGoal(
  goal: DbGoal
): Promise<{
  result: GoalEvaluationResult | null;
  tokensUsed: { input: number; output: number };
}> {
  const context = await gatherGoalContext(goal);
  const prompt = buildEvaluationPrompt(context);

  try {
    const client = await getLLMClient();
    const response = await client.generate({
      prompt,
      systemPrompt: 'You are an AI development manager evaluating goal progress. Analyze objectively and respond with valid JSON only.',
      maxTokens: 1000,
      temperature: 0.3,
      taskType: 'goal-evaluation',
      taskDescription: `Evaluating goal: ${goal.title}`,
    });

    const tokensUsed = {
      input: response.usage?.prompt_tokens || 0,
      output: response.usage?.completion_tokens || 0,
    };

    if (!response.success || !response.response) {
      logger.error('[GoalEvaluator] Anthropic generation failed:', { error: response.error });
      return { result: null, tokensUsed };
    }

    const result = parseEvaluationResponse(response.response, goal.id, goal.status);
    return { result, tokensUsed };
  } catch (error) {
    logger.error('[GoalEvaluator] Error evaluating goal:', { error });
    return { result: null, tokensUsed: { input: 0, output: 0 } };
  }
}

/**
 * Determine if a status change should be auto-applied based on autonomy level
 */
export function shouldAutoApply(
  evaluation: GoalEvaluationResult,
  autonomyLevel: AutonomyLevel
): boolean {
  if (autonomyLevel === 'suggest') {
    return false;
  }

  if (autonomyLevel === 'autonomous') {
    return evaluation.shouldUpdate && evaluation.confidence >= 50;
  }

  // 'cautious' mode - only auto-apply high-confidence obvious changes
  if (!evaluation.shouldUpdate) {
    return false;
  }

  // Require high confidence for cautious mode
  if (evaluation.confidence < 80) {
    return false;
  }

  // Specific transition rules for cautious mode
  const { currentStatus, recommendedStatus, progress } = evaluation;

  // Auto-apply: open → in_progress if there's clear activity
  if (currentStatus === 'open' && recommendedStatus === 'in_progress' && progress >= 10) {
    return true;
  }

  // Auto-apply: in_progress → done if progress is 100% and high confidence
  if (currentStatus === 'in_progress' && recommendedStatus === 'done' && progress >= 95) {
    return true;
  }

  return false;
}

/**
 * Apply a goal status change to the database
 */
export function applyStatusChange(
  goal: DbGoal,
  newStatus: string,
  evidence: string
): GoalStatusChange {
  const previousStatus = goal.status;

  // Update the goal in database
  goalDb.updateGoal(goal.id, {
    status: newStatus as 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided',
  });

  return {
    goalId: goal.id,
    goalTitle: goal.title,
    previousStatus,
    newStatus,
    evidence,
    changedAt: new Date().toISOString(),
    autoApplied: true,
  };
}

/**
 * Evaluate all goals for a project using Anthropic Claude
 */
export async function evaluateProjectGoals(
  projectId: string,
  autonomyLevel: AutonomyLevel = 'cautious'
): Promise<{
  evaluations: GoalEvaluationResult[];
  statusChanges: GoalStatusChange[];
  tokensUsed: { input: number; output: number };
}> {
  // Get open and in-progress goals for the project
  const allGoals = goalDb.getGoalsByProject(projectId);
  const activeGoals = allGoals.filter(g =>
    g.status === 'open' || g.status === 'in_progress'
  );

  const evaluations: GoalEvaluationResult[] = [];
  const statusChanges: GoalStatusChange[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const goal of activeGoals) {
    const { result, tokensUsed } = await evaluateGoal(goal);

    totalInputTokens += tokensUsed.input;
    totalOutputTokens += tokensUsed.output;

    if (result) {
      evaluations.push(result);

      // Check if we should apply the change
      if (result.shouldUpdate && result.recommendedStatus) {
        if (shouldAutoApply(result, autonomyLevel)) {
          const change = applyStatusChange(goal, result.recommendedStatus, result.evidence);
          statusChanges.push(change);
        } else {
          // Record as suggestion (not auto-applied)
          statusChanges.push({
            goalId: goal.id,
            goalTitle: goal.title,
            previousStatus: goal.status,
            newStatus: result.recommendedStatus,
            evidence: result.evidence,
            changedAt: new Date().toISOString(),
            autoApplied: false,
          });
        }
      }
    }

    // Small delay between evaluations to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    evaluations,
    statusChanges,
    tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
  };
}
