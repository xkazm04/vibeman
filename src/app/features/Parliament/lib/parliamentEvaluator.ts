/**
 * Parliament-Enhanced Idea Evaluator
 * Integrates multi-agent debate with the existing idea evaluation pipeline
 */

import { ideaDb, goalDb, contextDb } from '@/app/db';
import type { DbIdea } from '@/app/db/models/types';
import type { SupportedProvider } from '@/lib/llm/types';
import {
  calculateAdaptiveScore,
  checkThresholds,
  type AdaptiveScore,
} from '@/app/features/Ideas/sub_Vibeman/lib/adaptiveLearning';
import { runParliamentDebate, runQuickDebate } from './debateEngine';
import { debateSessionDb } from './reputationRepository';
import type { DebateResult, DebateConfig } from './types';

/**
 * Parliament evaluation result
 */
export interface ParliamentEvaluationResult {
  selectedIdeaId: string | null;
  reasoning: string;
  requirementName?: string;
  error?: string;
  // Parliament-specific fields
  debateSessionId?: string;
  consensusReached?: boolean;
  consensusLevel?: number;
  tradeOffs?: DebateResult['tradeOffs'];
  voteSummary?: {
    support: number;
    oppose: number;
    abstain: number;
    margin: number;
  };
  tokensUsed?: number;
  debateRounds?: number;
  duration?: number;
}

/**
 * Parliament evaluation options
 */
export interface ParliamentEvaluationOptions {
  projectId: string;
  projectPath: string;
  /** Use full parliament debate (slower, more thorough) */
  enableDebate?: boolean;
  /** Minimum adaptive score to consider for debate */
  minAdaptiveScore?: number;
  /** Maximum ideas to debate */
  maxIdeasToDebate?: number;
  /** LLM provider to use */
  provider?: SupportedProvider;
  /** Custom debate configuration */
  debateConfig?: Partial<DebateConfig>;
}

interface IdeaWithScore {
  idea: DbIdea;
  adaptiveScore: AdaptiveScore;
}

/**
 * Get project context for debate
 */
async function getProjectContext(projectId: string): Promise<string> {
  const contexts = contextDb.getContextsByProject(projectId);
  const goals = goalDb.getGoalsByProject(projectId);
  const openGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');

  let context = '';

  if (openGoals.length > 0) {
    context += '## Current Goals\n';
    for (const goal of openGoals.slice(0, 5)) {
      context += `- ${goal.title}: ${goal.description || 'No description'}\n`;
    }
    context += '\n';
  }

  if (contexts.length > 0) {
    context += '## Project Contexts\n';
    for (const ctx of contexts.slice(0, 5)) {
      context += `- ${ctx.name}: ${ctx.description || 'No description'}\n`;
    }
  }

  return context || 'No specific project context available.';
}

/**
 * Enhanced idea evaluation with optional parliament debate
 */
export async function evaluateWithParliament(
  options: ParliamentEvaluationOptions
): Promise<ParliamentEvaluationResult> {
  const {
    projectId,
    projectPath,
    enableDebate = true,
    minAdaptiveScore = 30,
    maxIdeasToDebate = 5,
    provider = 'ollama',
    debateConfig = {},
  } = options;

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

    // 3. Check for auto-accept based on thresholds
    for (const iws of ideasWithScores) {
      const thresholdResult = checkThresholds(projectId, iws.adaptiveScore);

      if (thresholdResult.action === 'auto_accept') {
        return {
          selectedIdeaId: iws.idea.id,
          reasoning: `Auto-selected based on high adaptive score (${iws.adaptiveScore.adjustedScore.toFixed(1)}) exceeding threshold`,
        };
      }
    }

    // 4. Filter out auto-rejected ideas and low scores
    const viableIdeas = ideasWithScores.filter(iws => {
      const thresholdResult = checkThresholds(projectId, iws.adaptiveScore);
      return (
        thresholdResult.action !== 'auto_reject' &&
        iws.adaptiveScore.adjustedScore >= minAdaptiveScore
      );
    });

    if (viableIdeas.length === 0) {
      return {
        selectedIdeaId: null,
        reasoning: 'All pending ideas were filtered out by adaptive learning thresholds',
      };
    }

    // 5. Sort by adaptive score and take top candidates
    const sortedIdeas = [...viableIdeas].sort(
      (a, b) => b.adaptiveScore.adjustedScore - a.adaptiveScore.adjustedScore
    );
    const topIdeas = sortedIdeas.slice(0, maxIdeasToDebate).map(iws => iws.idea);

    // 6. If debate is disabled or only one idea, use simple selection
    if (!enableDebate || topIdeas.length === 1) {
      const bestIdea = topIdeas[0];
      return {
        selectedIdeaId: bestIdea.id,
        reasoning: `Selected based on highest adaptive score (${sortedIdeas[0].adaptiveScore.adjustedScore.toFixed(1)})`,
      };
    }

    // 7. Get project context for debate
    const projectContext = await getProjectContext(projectId);

    // 8. Run parliament debate
    if (topIdeas.length === 1) {
      // Single idea: run full debate
      const debateResult = await runParliamentDebate({
        idea: topIdeas[0],
        projectId,
        projectContext,
        config: debateConfig,
        provider,
      });

      // Save debate session
      debateSessionDb.saveSession({
        id: debateResult.sessionId,
        projectId,
        ideaIds: [topIdeas[0].id],
        status: debateResult.consensusReached ? 'consensus' : 'completed',
        selectedIdeaId: debateResult.selectedIdeaId,
        consensusLevel: debateResult.consensusLevel,
        totalTokensUsed: debateResult.tokensUsed,
        debateSummary: debateResult.reasoning,
        tradeOffs: debateResult.tradeOffs,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      return {
        selectedIdeaId: debateResult.selectedIdeaId,
        reasoning: debateResult.reasoning,
        debateSessionId: debateResult.sessionId,
        consensusReached: debateResult.consensusReached,
        consensusLevel: debateResult.consensusLevel,
        tradeOffs: debateResult.tradeOffs,
        voteSummary: debateResult.agentVotes ? {
          support: debateResult.agentVotes.supportCount,
          oppose: debateResult.agentVotes.opposeCount,
          abstain: debateResult.agentVotes.abstainCount,
          margin: debateResult.agentVotes.margin,
        } : undefined,
        tokensUsed: debateResult.tokensUsed,
        debateRounds: debateResult.debateRounds,
        duration: debateResult.duration,
      };
    } else {
      // Multiple ideas: run quick comparison debates
      const { selectedIdeaId, results } = await runQuickDebate({
        ideas: topIdeas,
        projectId,
        projectContext,
        provider,
      });

      // Save the winning debate session
      const winningResult = results.find(r => r.selectedIdeaId === selectedIdeaId);

      if (winningResult) {
        debateSessionDb.saveSession({
          id: winningResult.sessionId,
          projectId,
          ideaIds: topIdeas.map(i => i.id),
          status: winningResult.consensusReached ? 'consensus' : 'completed',
          selectedIdeaId: winningResult.selectedIdeaId,
          consensusLevel: winningResult.consensusLevel,
          totalTokensUsed: winningResult.tokensUsed,
          debateSummary: winningResult.reasoning,
          tradeOffs: winningResult.tradeOffs,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });

        return {
          selectedIdeaId: winningResult.selectedIdeaId,
          reasoning: `Selected after comparative debate. ${winningResult.reasoning}`,
          debateSessionId: winningResult.sessionId,
          consensusReached: winningResult.consensusReached,
          consensusLevel: winningResult.consensusLevel,
          tradeOffs: winningResult.tradeOffs,
          voteSummary: winningResult.agentVotes ? {
            support: winningResult.agentVotes.supportCount,
            oppose: winningResult.agentVotes.opposeCount,
            abstain: winningResult.agentVotes.abstainCount,
            margin: winningResult.agentVotes.margin,
          } : undefined,
          tokensUsed: results.reduce((sum, r) => sum + r.tokensUsed, 0),
          debateRounds: results.reduce((sum, r) => sum + r.debateRounds, 0),
          duration: results.reduce((sum, r) => sum + r.duration, 0),
        };
      }

      // Fallback if no winner found
      return {
        selectedIdeaId: null,
        reasoning: 'Parliament debate did not reach consensus on any idea',
      };
    }
  } catch (error) {
    return {
      selectedIdeaId: null,
      reasoning: 'Error during parliament evaluation',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run parliament debate for a specific idea (for manual triggering)
 */
export async function debateIdea(
  ideaId: string,
  projectId: string,
  options?: {
    provider?: SupportedProvider;
    config?: Partial<DebateConfig>;
  }
): Promise<DebateResult | null> {
  const idea = ideaDb.getIdeaById(ideaId);
  if (!idea) {
    return null;
  }

  const projectContext = await getProjectContext(projectId);

  const result = await runParliamentDebate({
    idea,
    projectId,
    projectContext,
    config: options?.config,
    provider: options?.provider,
  });

  // Save session
  debateSessionDb.saveSession({
    id: result.sessionId,
    projectId,
    ideaIds: [ideaId],
    status: result.consensusReached ? 'consensus' : 'completed',
    selectedIdeaId: result.selectedIdeaId,
    consensusLevel: result.consensusLevel,
    totalTokensUsed: result.tokensUsed,
    debateSummary: result.reasoning,
    tradeOffs: result.tradeOffs,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });

  return result;
}
