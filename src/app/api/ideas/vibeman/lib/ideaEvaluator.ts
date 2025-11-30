import { ideaDb, goalDb } from '@/app/db';
import { OllamaClient } from '@/lib/llm/providers/ollama-client';
import type { DbIdea, DbGoal } from '@/app/db/models/types';
import {
  calculateAdaptiveScore,
  checkThresholds,
  type AdaptiveScore,
} from '@/app/features/Ideas/sub_Vibeman/lib/adaptiveLearning';

export interface IdeaEvaluationResult {
  selectedIdeaId: string | null;
  reasoning: string;
  requirementName?: string;
  error?: string;
}

/**
 * Build system prompt for LLM evaluation
 */
function buildEvaluationSystemPrompt(): string {
  return `You are an expert project manager AI responsible for selecting the best idea to implement next.

Your role is to:
1. Analyze all pending ideas based on their effort and impact ratings
2. Consider how well each idea aligns with current project goals
3. Select the single best idea that provides maximum value with minimal effort
4. Provide clear reasoning for your selection

Selection criteria (in order of priority):
1. **Effort-to-Impact Ratio**: Prefer high-impact, low-effort ideas (quick wins)
2. **Goal Alignment**: Ideas that directly support open goals are prioritized
3. **Risk**: Lower-risk implementations are preferred
4. **Dependencies**: Ideas with fewer dependencies are prioritized

You must respond with ONLY valid JSON in the exact format specified. No additional text or explanation outside the JSON.`;
}

interface IdeaWithScore {
  idea: DbIdea;
  adaptiveScore: AdaptiveScore;
}

/**
 * Format idea for prompt with adaptive score
 */
function formatIdea(idea: DbIdea, index: number, adaptiveScore?: AdaptiveScore): string {
  const scoreInfo = adaptiveScore
    ? `
- **Adaptive Score**: ${adaptiveScore.adjustedScore.toFixed(1)} (confidence: ${adaptiveScore.confidence}%)
- **Score Breakdown**: Effort adj: ${adaptiveScore.breakdown.effortAdjustment.toFixed(2)}, Impact adj: ${adaptiveScore.breakdown.impactAdjustment.toFixed(2)}, Success bonus: ${adaptiveScore.breakdown.successRateBonus.toFixed(2)}`
    : '';

  return `
### Idea ${index + 1}: ${idea.title}
- **ID**: ${idea.id}
- **Category**: ${idea.category}
- **Effort**: ${idea.effort || 'N/A'} (1=low, 2=medium, 3=high)
- **Impact**: ${idea.impact || 'N/A'} (1=low, 2=medium, 3=high)${scoreInfo}
- **Status**: ${idea.status}
- **Description**: ${idea.description || 'No description'}
- **Reasoning**: ${idea.reasoning || 'No reasoning provided'}
- **Scan Type**: ${idea.scan_type}
`;
}

/**
 * Format goal for prompt
 */
function formatGoal(goal: DbGoal, index: number): string {
  return `
### Goal ${index + 1}: ${goal.title}
- **Status**: ${goal.status}
- **Description**: ${goal.description || 'No description'}
`;
}

/**
 * Build the main evaluation prompt with adaptive scores
 */
function buildEvaluationPrompt(ideasWithScores: IdeaWithScore[], goals: DbGoal[]): string {
  const ideasSection = ideasWithScores
    .map((iws, idx) => formatIdea(iws.idea, idx, iws.adaptiveScore))
    .join('\n');
  const goalsSection = goals.length > 0
    ? goals.map(formatGoal).join('\n')
    : 'No open goals currently defined for this project.';

  return `# Project Context

## Current Project Goals
${goalsSection}

## Pending Ideas for Implementation
${ideasSection}

# Your Task

Analyze all ${ideasWithScores.length} pending ideas and select the SINGLE BEST idea to implement next based on:

1. **Adaptive Score**: Ideas with higher adaptive scores (learned from past executions) are preferred
2. **Effort-to-Impact Ratio**: Calculate value = impact / effort. Higher is better.
3. **Goal Alignment**: Does this idea support current project goals?
4. **Implementation Risk**: Is this idea well-defined and achievable?
5. **Priority**: Consider category and business value

**CRITICAL: You MUST use the EXACT full ID from the list above, not the index number.**

**Response Format** (JSON only, no markdown):

{
  "selectedIdeaId": "COPY THE FULL ID FROM ABOVE - NOT THE INDEX NUMBER",
  "reasoning": "Clear explanation of why this idea was selected (2-3 sentences)",
  "effortImpactScore": "calculated score or evaluation",
  "goalAlignment": "how this aligns with current goals"
}

Example valid response:
{
  "selectedIdeaId": "550e8400-e29b-41d4-a716-446655440000",
  "reasoning": "This idea has high impact (3) with low effort (1)...",
  "effortImpactScore": "3.0",
  "goalAlignment": "Directly supports current authentication goal"
}

If NO suitable idea can be selected, respond with:

{
  "selectedIdeaId": null,
  "reasoning": "Explanation of why no idea was selected"
}

REMEMBER: Copy the FULL ID value from the - **ID**: field above, not "Idea 1" or "1" or any index.

Select the best idea now:`;
}

/**
 * Clean JSON from markdown formatting
 */
function cleanJsonResponse(response: string): string {
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```\n?/g, '').replace(/```\n?$/g, '');
  }
  return cleaned;
}

/**
 * Find fallback idea based on adaptive score
 */
function findFallbackIdea(ideasWithScores: IdeaWithScore[]): DbIdea | undefined {
  // Sort by adaptive score descending
  const sorted = [...ideasWithScores].sort(
    (a, b) => b.adaptiveScore.adjustedScore - a.adaptiveScore.adjustedScore
  );
  return sorted[0]?.idea;
}

/**
 * Validate selected idea and provide fallback if needed
 */
function validateSelectedIdea(
  evaluation: IdeaEvaluationResult,
  ideasWithScores: IdeaWithScore[]
): IdeaEvaluationResult {
  if (!evaluation.selectedIdeaId) {
    return evaluation;
  }

  const selectedIdea = ideasWithScores.find(iws => iws.idea.id === evaluation.selectedIdeaId);

  if (!selectedIdea) {
    const fallbackIdea = findFallbackIdea(ideasWithScores);

    if (fallbackIdea) {
      return {
        ...evaluation,
        selectedIdeaId: fallbackIdea.id,
        reasoning: `Fallback selection (LLM returned invalid ID). ${evaluation.reasoning}`,
      };
    } else {
      throw new Error(`Invalid idea ID returned by LLM: ${evaluation.selectedIdeaId}`);
    }
  }

  return evaluation;
}

/**
 * Call LLM with evaluation prompt
 */
async function callLLMForEvaluation(
  prompt: string,
  projectId: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  const ollama = new OllamaClient({
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  });

  return await ollama.generate({
    prompt,
    systemPrompt: buildEvaluationSystemPrompt(),
    maxTokens: 2000,
    temperature: 0.3,
    projectId,
  });
}

/**
 * Main evaluation function with adaptive learning integration
 */
export async function evaluateAndSelectIdea(
  projectId: string,
  projectPath: string
): Promise<IdeaEvaluationResult> {
  try {
    // 1. Get all pending ideas for the project
    const allIdeas = ideaDb.getIdeasByProject(projectId);
    const pendingIdeas = allIdeas.filter(idea => idea.status === 'pending');

    if (pendingIdeas.length === 0) {
      return {
        selectedIdeaId: null,
        reasoning: 'No pending ideas available for implementation',
      };
    }

    // 2. Calculate adaptive scores for all pending ideas
    const ideasWithScores: IdeaWithScore[] = pendingIdeas.map(idea => ({
      idea,
      adaptiveScore: calculateAdaptiveScore(idea, projectId),
    }));

    // 3. Check for auto-accept/reject based on thresholds
    for (const iws of ideasWithScores) {
      const thresholdResult = checkThresholds(projectId, iws.adaptiveScore);

      if (thresholdResult.action === 'auto_accept') {
        return {
          selectedIdeaId: iws.idea.id,
          reasoning: `Auto-selected based on high adaptive score (${iws.adaptiveScore.adjustedScore.toFixed(1)}) exceeding threshold (${thresholdResult.threshold?.value})`,
        };
      }
    }

    // 4. Filter out auto-rejected ideas
    const viableIdeas = ideasWithScores.filter(iws => {
      const thresholdResult = checkThresholds(projectId, iws.adaptiveScore);
      return thresholdResult.action !== 'auto_reject';
    });

    if (viableIdeas.length === 0) {
      return {
        selectedIdeaId: null,
        reasoning: 'All pending ideas were filtered out by adaptive learning thresholds',
      };
    }

    // 5. Sort by adaptive score and take top candidates for LLM evaluation
    const sortedIdeas = [...viableIdeas].sort(
      (a, b) => b.adaptiveScore.adjustedScore - a.adaptiveScore.adjustedScore
    );

    // Limit to top 10 ideas for LLM context
    const topIdeas = sortedIdeas.slice(0, 10);

    // 6. Get all open goals for context
    const allGoals = goalDb.getGoalsByProject(projectId);
    const openGoals = allGoals.filter(g => g.status === 'open' || g.status === 'in_progress');

    // 7. Build evaluation prompt with adaptive scores
    const prompt = buildEvaluationPrompt(topIdeas, openGoals);

    // 8. Call Ollama LLM for evaluation
    const response = await callLLMForEvaluation(prompt, projectId);

    if (!response.success || !response.response) {
      // Fallback to highest adaptive score if LLM fails
      const fallbackIdea = findFallbackIdea(topIdeas);
      if (fallbackIdea) {
        return {
          selectedIdeaId: fallbackIdea.id,
          reasoning: `LLM evaluation failed, falling back to highest adaptive score idea`,
        };
      }
      throw new Error(response.error || 'LLM evaluation failed');
    }

    // 9. Parse LLM response
    let evaluation: IdeaEvaluationResult;
    try {
      const cleanedResponse = cleanJsonResponse(response.response);
      evaluation = JSON.parse(cleanedResponse);

      // 10. Validate that the selected ID exists and is pending
      evaluation = validateSelectedIdea(evaluation, topIdeas);
    } catch (parseError) {
      // Fallback to highest adaptive score on parse error
      const fallbackIdea = findFallbackIdea(topIdeas);
      if (fallbackIdea) {
        return {
          selectedIdeaId: fallbackIdea.id,
          reasoning: `Failed to parse LLM response, falling back to highest adaptive score idea`,
        };
      }
      throw new Error('Failed to parse LLM evaluation response');
    }

    return evaluation;
  } catch (error) {
    return {
      selectedIdeaId: null,
      reasoning: 'Error during evaluation',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
