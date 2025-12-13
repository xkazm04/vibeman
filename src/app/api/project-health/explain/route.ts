/**
 * Project Health Score AI Explanation API
 * POST - Generate AI explanation for health score changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectHealthDb } from '@/app/db';
import { LLMManager } from '@/lib/llm/llm-manager';
import { CategoryScores, HealthScoreCategory } from '@/app/db/models/project-health.types';
import { logger } from '@/lib/logger';

const llmManager = new LLMManager();

/**
 * POST /api/project-health/explain
 * Generate AI explanation for health score changes and recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, healthId, provider, model } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get current and previous health scores
    const history = projectHealthDb.getHealthHistory(projectId, 2);

    if (history.length === 0) {
      return NextResponse.json(
        { error: 'No health score data available' },
        { status: 404 }
      );
    }

    const current = history[0];
    const previous = history.length > 1 ? history[1] : null;
    const currentScores = JSON.parse(current.category_scores) as CategoryScores;
    const previousScores = previous
      ? (JSON.parse(previous.category_scores) as CategoryScores)
      : null;

    // Build context for AI
    const context = buildAnalysisContext(current, previous, currentScores, previousScores);

    // Generate AI explanation
    const prompt = buildExplanationPrompt(context);

    try {
      const response = await llmManager.generate({
        provider: provider || 'ollama',
        model: model || 'llama3.2',
        systemPrompt: `You are a software development health analyst. Analyze project health metrics and provide actionable insights. Be concise and specific.`,
        prompt: prompt,
        temperature: 0.3,
        maxTokens: 500,
      });

      // Parse AI response
      const aiContent = response.response || '';
      const { explanation, recommendation, focusArea } = parseAIResponse(aiContent, currentScores);

      // Update health record with AI insights
      projectHealthDb.updateHealthWithAI(current.id, explanation, recommendation);

      return NextResponse.json({
        explanation,
        recommendation,
        focusArea,
        healthId: current.id,
      });
    } catch (llmError) {
      // Fallback to rule-based explanation if LLM fails
      const { explanation, recommendation, focusArea } = generateRuleBasedInsights(
        currentScores,
        previousScores,
        current.overall_score,
        previous?.overall_score || null
      );

      // Update health record
      projectHealthDb.updateHealthWithAI(current.id, explanation, recommendation);

      return NextResponse.json({
        explanation,
        recommendation,
        focusArea,
        healthId: current.id,
        fallback: true,
      });
    }
  } catch (error) {
    logger.error('Failed to generate health explanation:', { data: error });
    return NextResponse.json(
      { error: 'Failed to generate explanation', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Build analysis context from health data
 */
function buildAnalysisContext(
  current: any,
  previous: any | null,
  currentScores: CategoryScores,
  previousScores: CategoryScores | null
): string {
  const lines: string[] = [];

  lines.push(`Current Health Score: ${current.overall_score}/100 (${current.status})`);

  if (previous) {
    const change = current.overall_score - previous.overall_score;
    lines.push(`Previous Score: ${previous.overall_score}/100 (${change >= 0 ? '+' : ''}${change} change)`);
  }

  lines.push('\nCategory Breakdown:');

  const categories: Array<[HealthScoreCategory, string]> = [
    ['idea_backlog', 'Idea Backlog'],
    ['tech_debt', 'Technical Debt'],
    ['security', 'Security'],
    ['test_coverage', 'Test Coverage'],
    ['goal_completion', 'Goal Completion'],
    ['code_quality', 'Code Quality'],
  ];

  for (const [key, label] of categories) {
    const score = currentScores[key];
    const prevScore = previousScores?.[key];
    const change = prevScore ? score.score - prevScore.score : 0;

    lines.push(`- ${label}: ${score.score}/100 ${change !== 0 ? `(${change >= 0 ? '+' : ''}${change})` : ''}`);
    if (score.details) {
      lines.push(`  Details: ${score.details}`);
    }
    if (score.issues_count !== undefined && score.issues_count > 0) {
      lines.push(`  Issues: ${score.issues_count}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build prompt for AI explanation
 */
function buildExplanationPrompt(context: string): string {
  return `Analyze this project health report and provide:
1. A brief explanation of the current health status (2-3 sentences)
2. The most important area to focus on and why
3. A specific actionable recommendation

Health Report:
${context}

Respond in this exact format:
EXPLANATION: <your explanation>
FOCUS_AREA: <category name: idea_backlog|tech_debt|security|test_coverage|goal_completion|code_quality>
RECOMMENDATION: <your recommendation>`;
}

/**
 * Parse AI response into structured insights
 */
function parseAIResponse(
  content: string,
  currentScores: CategoryScores
): { explanation: string; recommendation: string; focusArea: HealthScoreCategory } {
  const explanationMatch = content.match(/EXPLANATION:\s*([\s\S]+?)(?=FOCUS_AREA:|$)/);
  const focusMatch = content.match(/FOCUS_AREA:\s*([\s\S]+?)(?=RECOMMENDATION:|$)/);
  const recommendationMatch = content.match(/RECOMMENDATION:\s*([\s\S]+?)$/);

  const explanation = explanationMatch?.[1]?.trim() || content.slice(0, 200);
  const recommendationText = recommendationMatch?.[1]?.trim() || 'Review the lowest scoring category and address critical issues first.';

  // Parse focus area
  let focusArea: HealthScoreCategory = 'tech_debt';
  const focusText = focusMatch?.[1]?.trim().toLowerCase() || '';

  if (focusText.includes('idea') || focusText.includes('backlog')) {
    focusArea = 'idea_backlog';
  } else if (focusText.includes('debt')) {
    focusArea = 'tech_debt';
  } else if (focusText.includes('security')) {
    focusArea = 'security';
  } else if (focusText.includes('test') || focusText.includes('coverage')) {
    focusArea = 'test_coverage';
  } else if (focusText.includes('goal')) {
    focusArea = 'goal_completion';
  } else if (focusText.includes('quality') || focusText.includes('code')) {
    focusArea = 'code_quality';
  } else {
    // Fall back to lowest scoring category
    focusArea = findLowestScoringCategory(currentScores);
  }

  return { explanation, recommendation: recommendationText, focusArea };
}

/**
 * Generate rule-based insights (fallback when LLM unavailable)
 */
function generateRuleBasedInsights(
  currentScores: CategoryScores,
  previousScores: CategoryScores | null,
  currentOverall: number,
  previousOverall: number | null
): { explanation: string; recommendation: string; focusArea: HealthScoreCategory } {
  const focusArea = findLowestScoringCategory(currentScores);
  const focusScore = currentScores[focusArea];

  // Build explanation
  let explanation = '';

  if (currentOverall >= 85) {
    explanation = 'Project health is excellent. All key metrics are performing well.';
  } else if (currentOverall >= 70) {
    explanation = 'Project health is good with some areas for improvement.';
  } else if (currentOverall >= 50) {
    explanation = 'Project health needs attention. Several metrics are below optimal levels.';
  } else {
    explanation = 'Project health is critical. Immediate action is required on multiple fronts.';
  }

  if (previousOverall !== null) {
    const change = currentOverall - previousOverall;
    if (change > 5) {
      explanation += ` Health improved by ${change} points since last measurement.`;
    } else if (change < -5) {
      explanation += ` Health declined by ${Math.abs(change)} points since last measurement.`;
    }
  }

  // Build recommendation based on focus area
  const recommendations: Record<HealthScoreCategory, string> = {
    idea_backlog: `Your idea backlog (${focusScore.score}/100) needs attention. Review pending ideas and either implement, accept, or reject them to maintain a healthy backlog.`,
    tech_debt: `Technical debt score (${focusScore.score}/100) is low. Prioritize resolving critical and high severity tech debt items to improve code maintainability.`,
    security: `Security score (${focusScore.score}/100) requires immediate attention. Address pending security patches, especially critical and high severity vulnerabilities.`,
    test_coverage: `Test coverage (${focusScore.score}/100) needs improvement. Focus on adding tests for critical code paths and increasing overall coverage.`,
    goal_completion: `Goal completion rate (${focusScore.score}/100) is below target. Review open goals and create actionable plans to make progress.`,
    code_quality: `Code quality (${focusScore.score}/100) needs improvement. Focus on refactoring, reducing complexity, and following coding standards.`,
  };

  return {
    explanation,
    recommendation: recommendations[focusArea],
    focusArea,
  };
}

/**
 * Find the category with the lowest score
 */
function findLowestScoringCategory(scores: CategoryScores): HealthScoreCategory {
  let lowest: HealthScoreCategory = 'tech_debt';
  let lowestScore = 100;

  const categories: HealthScoreCategory[] = [
    'idea_backlog',
    'tech_debt',
    'security',
    'test_coverage',
    'goal_completion',
    'code_quality',
  ];

  for (const category of categories) {
    if (scores[category].score < lowestScore) {
      lowestScore = scores[category].score;
      lowest = category;
    }
  }

  return lowest;
}
