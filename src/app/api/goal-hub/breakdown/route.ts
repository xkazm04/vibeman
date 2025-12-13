/**
 * Goal Breakdown API
 * Generate multi-agent analysis for a goal using Claude Code
 */

import { NextRequest, NextResponse } from 'next/server';
import { goalHubDb, goalDb } from '@/app/db';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';
import { SCAN_TYPE_CONFIGS } from '@/app/features/Ideas/lib/scanTypes';
import type { AgentResponse, HypothesisCategory } from '@/app/db/models/goal-hub.types';

/**
 * GET /api/goal-hub/breakdown?goalId=xxx
 * Get the latest breakdown for a goal
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');

    if (!goalId) {
      return createErrorResponse('goalId is required', 400);
    }

    const breakdown = goalHubDb.breakdowns.getByGoalId(goalId);
    const history = goalHubDb.breakdowns.getHistoryByGoalId(goalId);

    return NextResponse.json({
      breakdown,
      history,
    });
  } catch (error) {
    logger.error('Error in GET /api/goal-hub/breakdown:', { data: error });
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/goal-hub/breakdown
 * Generate a new breakdown for a goal
 * This creates a Claude Code requirement file for execution
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalId, projectId, projectPath } = body;

    if (!goalId || !projectId || !projectPath) {
      return createErrorResponse('goalId, projectId, and projectPath are required', 400);
    }

    // Get the goal
    const goal = goalDb.getGoalById(goalId);
    if (!goal) {
      return notFoundResponse('Goal');
    }

    // Build the breakdown prompt
    const prompt = buildBreakdownPrompt(goal.title, goal.description || '');

    // Return the prompt for Claude Code execution
    // The frontend will create a requirement file and execute it
    return NextResponse.json({
      prompt,
      goalId,
      projectId,
      projectPath,
      requirementName: `goal-breakdown-${goalId.slice(0, 8)}`,
    });
  } catch (error) {
    logger.error('Error in POST /api/goal-hub/breakdown:', { data: error });
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/goal-hub/breakdown/save
 * Save a breakdown result after Claude Code execution
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      goalId,
      projectId,
      agentResponses,
      promptUsed,
      modelUsed,
      inputTokens,
      outputTokens,
    } = body as {
      goalId: string;
      projectId: string;
      agentResponses: AgentResponse[];
      promptUsed?: string;
      modelUsed?: string;
      inputTokens?: number;
      outputTokens?: number;
    };

    if (!goalId || !projectId || !agentResponses) {
      return createErrorResponse('goalId, projectId, and agentResponses are required', 400);
    }

    // Create the breakdown record
    const breakdown = goalHubDb.breakdowns.create({
      id: randomUUID(),
      goalId,
      projectId,
      agentResponses,
      promptUsed,
      modelUsed,
      inputTokens,
      outputTokens,
      hypothesesGenerated: 0,
    });

    // Extract and create hypotheses from agent responses
    const hypothesesToCreate: Array<{
      id: string;
      goalId: string;
      projectId: string;
      title: string;
      statement: string;
      reasoning?: string;
      category?: HypothesisCategory;
      priority?: number;
      agentSource?: string;
    }> = [];

    for (const response of agentResponses) {
      for (const h of response.hypotheses) {
        hypothesesToCreate.push({
          id: randomUUID(),
          goalId,
          projectId,
          title: h.title,
          statement: h.statement,
          category: h.category,
          priority: h.priority,
          agentSource: response.agentType,
        });
      }
    }

    // Bulk create hypotheses
    let hypotheses: ReturnType<typeof goalHubDb.hypotheses.getByGoalId> = [];
    if (hypothesesToCreate.length > 0) {
      hypotheses = goalHubDb.hypotheses.createBulk(hypothesesToCreate);
    }

    // Update goal progress
    goalHubDb.extensions.updateProgress(goalId);

    // Start the goal if not already started
    goalHubDb.extensions.startGoal(goalId);

    return NextResponse.json({
      breakdown,
      hypotheses,
      hypothesesGenerated: hypothesesToCreate.length,
    });
  } catch (error) {
    logger.error('Error in PUT /api/goal-hub/breakdown:', { data: error });
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * Build the multi-agent breakdown prompt for Claude Code
 */
function buildBreakdownPrompt(goalTitle: string, goalDescription: string): string {
  // Select relevant agents from the scan type configs
  const relevantAgents = SCAN_TYPE_CONFIGS.filter(agent =>
    ['zen_architect', 'bug_hunter', 'security_protector', 'perf_optimizer',
     'user_empathy_champion', 'accessibility_advocate', 'business_visionary',
     'data_flow_optimizer', 'ambiguity_guardian'].includes(agent.value)
  );

  const agentDescriptions = relevantAgents.map(agent =>
    `- **${agent.emoji} ${agent.label}** (${agent.value}): ${agent.description}`
  ).join('\n');

  return `# Goal Breakdown Analysis

## Goal
**Title:** ${goalTitle}
${goalDescription ? `**Description:** ${goalDescription}` : ''}

## Your Task
Analyze this development goal from multiple expert perspectives. For each relevant perspective, provide:
1. Key considerations and recommendations
2. Potential risks or challenges
3. Testable hypotheses that would prove successful implementation

## Available Agent Perspectives
${agentDescriptions}

## Output Format
You MUST respond with valid JSON in exactly this structure:

\`\`\`json
{
  "agentResponses": [
    {
      "agentType": "zen_architect",
      "agentLabel": "Zen Architect",
      "agentEmoji": "🏗️",
      "perspective": "Brief summary of this agent's view on the goal",
      "recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
      "hypotheses": [
        {
          "title": "Short hypothesis title",
          "statement": "When [condition], then [expected outcome] because [reasoning]",
          "category": "behavior|performance|security|accessibility|ux|integration|edge_case|data|error",
          "priority": 1-10
        }
      ],
      "risks": ["Potential risk 1", "Potential risk 2"],
      "considerations": ["Important consideration 1"]
    }
  ]
}
\`\`\`

## Guidelines
1. Only include agents whose perspective is relevant to this specific goal
2. Each hypothesis should be testable and verifiable
3. Prioritize hypotheses by importance (10 = critical, 1 = nice to have)
4. Focus on practical, actionable insights
5. Consider edge cases and failure modes
6. Include at least 3-5 hypotheses total across all agents
7. Use appropriate category for each hypothesis

Analyze the goal and provide your multi-agent breakdown:`;
}
