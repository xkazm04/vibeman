/**
 * Goal Generator Service
 * LLM-powered generation of new goals based on project analysis
 *
 * NOTE: Direct LLM calls are deprecated. Use Claude Code execution via
 * claudeCodeExecutor.ts for deep codebase exploration. The direct functions
 * are kept for backward compatibility but will be removed in a future version.
 */

import { goalDb, ideaDb, standupDb } from '@/app/db';
import { projectDb } from '@/lib/project_database';
import { logger } from '@/lib/logger';
import {
  GoalCandidate,
  GoalGenerationContext,
  GoalGenerationResult,
  LLMGoalGenerationResponse,
  GoalStrategy,
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
    logger.info('[GoalGenerator] Initializing Anthropic client (deprecated path)', {
      hasApiKey: !!apiKey,
    });
    llmClient = new AnthropicClient({ apiKey });
  }
  return llmClient;
}

/**
 * Build goal generation prompt based on strategy
 */
function buildGenerationPrompt(context: GoalGenerationContext, strategy: GoalStrategy = 'build'): string {
  const completedGoalsList = context.completedGoals
    .slice(0, 10)
    .map(g => `  - ${g.title}`)
    .join('\n');

  const openGoalsList = context.openGoals
    .map(g => `  - ${g.title} (${g.status})`)
    .join('\n');

  const pendingIdeasByCategory: Record<string, number> = {};
  context.pendingIdeas.forEach(idea => {
    const cat = idea.scan_type || 'other';
    pendingIdeasByCategory[cat] = (pendingIdeasByCategory[cat] || 0) + 1;
  });

  const ideasBreakdown = Object.entries(pendingIdeasByCategory)
    .map(([cat, count]) => `  - ${cat}: ${count}`)
    .join('\n');

  const techDebtList = context.techDebtItems
    .slice(0, 10)
    .map(td => `  - [${td.severity}] ${td.title}`)
    .join('\n');

  const focusAreasList = context.recentFocusAreas
    .slice(0, 5)
    .map(area => `  - ${area}`)
    .join('\n');

  // Strategy-specific guidance
  const strategyGuidance = strategy === 'build'
    ? `## Strategy: BUILD MODE
Focus on creating NEW features and expanding functionality:
- Prioritize new capabilities over refinement
- Look for feature gaps and missing functionality
- Consider user-facing improvements
- Emphasize growth and expansion
- Categories to prioritize: feature, integration, enhancement`
    : `## Strategy: POLISH MODE
Focus on IMPROVING and REFINING existing code:
- Prioritize code quality and maintainability
- Address technical debt and code smells
- Improve test coverage and documentation
- Optimize performance bottlenecks
- Categories to prioritize: refactor, testing, docs, performance, security`;

  return `You are a strategic development planner generating new goals for a software project.

## Project: ${context.projectName}

${strategyGuidance}

## Recently Completed Goals
${completedGoalsList || '  None - this is a fresh project'}

## Current Open Goals
${openGoalsList || '  None currently open'}

## Pending Ideas Backlog
Total: ${context.pendingIdeas.length}
By Category:
${ideasBreakdown || '  None'}

Top pending ideas:
${context.pendingIdeas.slice(0, 5).map(i => `  - ${i.title}`).join('\n') || '  None'}

## Technical Debt Items
${techDebtList || '  No tech debt recorded'}

## Recent Focus Areas
${focusAreasList || '  No previous focus areas'}

## Goal Generation Guidelines
1. Create 1-3 strategic goals aligned with the ${strategy.toUpperCase()} strategy that:
   - Build on patterns from completed goals
   - Address gaps not covered by current open goals
   - Have clear, measurable success criteria
   - Are achievable within 1-2 weeks
   - Prioritize based on impact and dependencies

2. Goal sources to consider:
   ${strategy === 'build'
     ? '- Clusters of related pending ideas\n   - Feature requests and enhancements\n   - Integration opportunities\n   - User experience improvements'
     : '- Tech debt items that accumulate risk\n   - Code quality improvements\n   - Testing gaps\n   - Documentation needs\n   - Performance optimizations'}

3. For each goal, explain:
   - Why this goal is important now
   - What success looks like
   - How it relates to existing work

Respond ONLY with valid JSON:
{
  "goals": [
    {
      "title": "string (max 80 chars)",
      "description": "string (2-3 sentences with success criteria)",
      "reasoning": "string (why this goal, why now)",
      "priorityScore": number (0-100, higher = more important),
      "suggestedContext": "string (optional - related context/module name)",
      "category": "string (feature, refactor, testing, docs, performance, security, etc.)"
    }
  ]
}`;
}

/**
 * Parse LLM response into goal candidates
 */
function parseGenerationResponse(
  response: string,
  context: GoalGenerationContext
): GoalCandidate[] | null {
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

    const parsed: LLMGoalGenerationResponse = JSON.parse(cleaned);

    if (!Array.isArray(parsed.goals)) {
      return null;
    }

    return parsed.goals.map(g => ({
      title: g.title || 'Untitled Goal',
      description: g.description || '',
      reasoning: g.reasoning || '',
      priorityScore: typeof g.priorityScore === 'number' ? Math.min(100, Math.max(0, g.priorityScore)) : 50,
      suggestedContext: g.suggestedContext,
      category: g.category || 'feature',
      source: 'historical' as const,
      relatedItems: [],
    }));
  } catch (error) {
    console.error('[GoalGenerator] Failed to parse LLM response:', error);
    return null;
  }
}

/**
 * Gather context for goal generation
 */
export async function gatherGenerationContext(projectId: string): Promise<GoalGenerationContext> {
  const project = projectDb.getProject(projectId);
  const projectName = project?.name || 'Unknown Project';

  // Get all goals for the project
  const allGoals = goalDb.getGoalsByProject(projectId);

  // Separate by status
  const completedGoals = allGoals.filter(g => g.status === 'done');
  const openGoals = allGoals.filter(g => g.status === 'open' || g.status === 'in_progress');

  // Get pending ideas (accepted but not implemented)
  const allIdeas = ideaDb.getAllIdeas();
  const pendingIdeas = allIdeas.filter(i => i.status === 'accepted' || i.status === 'pending');

  // Get tech debt items - feature deprecated, return empty array
  const techDebtItems: { id: string; title: string; severity: string }[] = [];

  // Get recent focus areas from standup summaries
  const recentFocusAreas: string[] = [];
  try {
    const recentSummaries = standupDb.getSummariesByProject(projectId, 5);
    for (const summary of recentSummaries) {
      if (summary.focus_areas) {
        try {
          const areas = JSON.parse(summary.focus_areas);
          if (Array.isArray(areas)) {
            areas.forEach((a: any) => {
              if (a.area && !recentFocusAreas.includes(a.area)) {
                recentFocusAreas.push(a.area);
              }
            });
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  } catch {
    // Standup data might not exist
  }

  return {
    projectId,
    projectName,
    completedGoals,
    openGoals,
    pendingIdeas,
    techDebtItems,
    recentFocusAreas,
  };
}

/**
 * Generate new goal candidates for a project using Anthropic Claude
 *
 * @deprecated Use executeGoalGenerationViaClaudeCode from claudeCodeExecutor.ts
 * for deep codebase exploration with Claude Code CLI
 */
export async function generateGoals(
  projectId: string,
  strategy: GoalStrategy = 'build'
): Promise<GoalGenerationResult> {
  // Early check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.error('[GoalGenerator] ANTHROPIC_API_KEY is not set - cannot generate goals');
    return {
      candidates: [],
      tokensUsed: { input: 0, output: 0 },
      generatedAt: new Date().toISOString(),
    };
  }

  logger.info('[GoalGenerator] Starting goal generation (deprecated direct LLM path)', {
    projectId,
    strategy,
    hasApiKey: true,
  });

  const context = await gatherGenerationContext(projectId);

  logger.info('[GoalGenerator] Context gathered', {
    projectId,
    projectName: context.projectName,
    completedGoals: context.completedGoals.length,
    openGoals: context.openGoals.length,
    pendingIdeas: context.pendingIdeas.length,
    techDebtItems: context.techDebtItems.length,
    focusAreas: context.recentFocusAreas.length,
  });

  const prompt = buildGenerationPrompt(context, strategy);

  logger.debug('[GoalGenerator] Prompt built', {
    promptLength: prompt.length,
  });

  try {
    const client = await getLLMClient();

    logger.info('[GoalGenerator] Calling Anthropic API...');

    const response = await client.generate({
      prompt,
      systemPrompt: 'You are a strategic development planner. Generate focused, achievable goals based on project analysis. Respond with valid JSON only.',
      maxTokens: 2000,
      temperature: 0.7,
      taskType: 'goal-generation',
      taskDescription: `Generating ${strategy} goals for project: ${context.projectName}`,
    });

    const tokensUsed = {
      input: response.usage?.prompt_tokens || 0,
      output: response.usage?.completion_tokens || 0,
    };

    logger.info('[GoalGenerator] Anthropic API response received', {
      success: response.success,
      hasResponse: !!response.response,
      responseLength: response.response?.length || 0,
      tokensUsed,
      error: response.error,
    });

    if (!response.success || !response.response) {
      logger.error('[GoalGenerator] Anthropic generation failed', {
        error: response.error,
        projectId,
      });
      return {
        candidates: [],
        tokensUsed,
        generatedAt: new Date().toISOString(),
      };
    }

    const candidates = parseGenerationResponse(response.response, context);

    logger.info('[GoalGenerator] Goals generated successfully', {
      projectId,
      candidateCount: candidates?.length || 0,
      tokensUsed,
    });

    return {
      candidates: candidates || [],
      tokensUsed,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[GoalGenerator] Error generating goals', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      projectId,
    });
    return {
      candidates: [],
      tokensUsed: { input: 0, output: 0 },
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Convert a goal candidate to a database goal (for user approval)
 */
export function candidateToGoal(
  candidate: GoalCandidate,
  projectId: string
): Omit<Parameters<typeof goalDb.createGoal>[0], 'id'> {
  return {
    project_id: projectId,
    context_id: undefined, // Context can be assigned later
    title: candidate.title,
    description: candidate.description,
    status: 'open',
    order_index: 0, // Will be adjusted when created
  };
}

/**
 * Create approved goal candidates in the database
 */
export function createApprovedGoals(
  candidates: GoalCandidate[],
  projectId: string
): string[] {
  const createdIds: string[] = [];

  for (const candidate of candidates) {
    try {
      const goalData = candidateToGoal(candidate, projectId);
      const goal = goalDb.createGoal({ id: crypto.randomUUID(), ...goalData });
      createdIds.push(goal.id);
    } catch (error) {
      console.error('[GoalGenerator] Failed to create goal:', candidate.title, error);
    }
  }

  return createdIds;
}
