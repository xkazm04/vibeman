/**
 * Project Health Score API
 * GET - Get health score and stats for a project
 * POST - Trigger health score calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectHealthDb, ideaDb, techDebtDb, goalDb, securityPatchDb } from '@/app/db';
import { logger } from '@/lib/logger';
import {
  CategoryScores,
  CategoryScore,
  HealthScoreStatus,
  DEFAULT_CATEGORY_WEIGHTS,
  DEFAULT_STATUS_THRESHOLDS,
} from '@/app/db/models/project-health.types';

/**
 * GET /api/project-health
 * Get health score and statistics for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const includeHistory = searchParams.get('includeHistory') === 'true';

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get latest health score
    const health = projectHealthDb.getLatestHealth(projectId);

    if (!health) {
      return NextResponse.json({
        health: null,
        stats: null,
        message: 'No health score calculated yet. Trigger a calculation.',
      });
    }

    // Get stats if requested
    const stats = projectHealthDb.getStats(projectId);

    // Get history if requested
    let history = null;
    if (includeHistory) {
      history = projectHealthDb.getHealthHistory(projectId, 30);
    }

    return NextResponse.json({
      health,
      stats,
      history,
    });
  } catch (error) {
    logger.error('Failed to get project health:', { data: error });
    return NextResponse.json(
      { error: 'Failed to get project health', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project-health
 * Calculate and store a new health score for a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, generateAiInsights } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get config or use defaults
    const config = projectHealthDb.getConfig(projectId);
    const weights = config
      ? JSON.parse(config.category_weights)
      : DEFAULT_CATEGORY_WEIGHTS;
    const thresholds = config
      ? JSON.parse(config.thresholds)
      : DEFAULT_STATUS_THRESHOLDS;

    // Calculate category scores
    const categoryScores = await calculateCategoryScores(projectId);

    // Calculate overall score
    const overallScore = calculateOverallScore(categoryScores, weights);

    // Determine status
    const status = determineStatus(overallScore, thresholds);

    // Calculate trend from previous
    const previousHealth = projectHealthDb.getLatestHealth(projectId);
    const trend = previousHealth
      ? overallScore - previousHealth.overall_score
      : 0;
    const trendDirection: 'up' | 'down' | 'stable' =
      trend > 1 ? 'up' : trend < -1 ? 'down' : 'stable';

    // Create health record
    const health = projectHealthDb.createHealth({
      project_id: projectId,
      overall_score: Math.round(overallScore),
      status,
      category_scores: categoryScores,
      trend,
      trend_direction: trendDirection,
    });

    // Get updated stats
    const stats = projectHealthDb.getStats(projectId);

    return NextResponse.json({
      health,
      stats,
      calculated: true,
    });
  } catch (error) {
    logger.error('Failed to calculate project health:', { data: error });
    return NextResponse.json(
      { error: 'Failed to calculate project health', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Calculate scores for each health category
 */
async function calculateCategoryScores(projectId: string): Promise<CategoryScores> {
  // Idea Backlog Score
  const ideaScore = await calculateIdeaBacklogScore(projectId);

  // Tech Debt Score
  const techDebtScore = await calculateTechDebtScore(projectId);

  // Security Score
  const securityScore = await calculateSecurityScore(projectId);

  // Test Coverage Score (simulated based on available data)
  const testCoverageScore = calculateTestCoverageScore(projectId);

  // Goal Completion Score
  const goalScore = await calculateGoalCompletionScore(projectId);

  // Code Quality Score (derived from other metrics)
  const codeQualityScore = calculateCodeQualityScore(techDebtScore.score, securityScore.score);

  return {
    idea_backlog: ideaScore,
    tech_debt: techDebtScore,
    security: securityScore,
    test_coverage: testCoverageScore,
    goal_completion: goalScore,
    code_quality: codeQualityScore,
  };
}

/**
 * Calculate idea backlog score
 * Higher score = healthier backlog management
 */
async function calculateIdeaBacklogScore(projectId: string): Promise<CategoryScore> {
  const ideas = ideaDb.getIdeasByProject(projectId);

  const pending = ideas.filter((i) => i.status === 'pending').length;
  const accepted = ideas.filter((i) => i.status === 'accepted').length;
  const implemented = ideas.filter((i) => i.status === 'implemented').length;
  const total = ideas.length;

  // Healthy: Low pending ratio, high implementation rate
  let score = 100;

  // Penalize high pending ratio (backlog not being processed)
  if (total > 0) {
    const pendingRatio = pending / total;
    score -= pendingRatio * 30; // Max 30 point penalty

    // Reward implementation rate
    const implementedRatio = implemented / total;
    score = score * 0.7 + implementedRatio * 100 * 0.3;
  }

  // Absolute penalty for large pending backlogs
  if (pending > 50) score -= 10;
  if (pending > 100) score -= 10;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    weight: DEFAULT_CATEGORY_WEIGHTS.idea_backlog,
    trend: 0,
    issues_count: pending,
    details: `${pending} pending, ${accepted} accepted, ${implemented} implemented`,
  };
}

/**
 * Calculate tech debt score
 * Higher score = less tech debt
 */
async function calculateTechDebtScore(projectId: string): Promise<CategoryScore> {
  try {
    const techDebtItems = techDebtDb.getTechDebtByProject(projectId);

    const total = techDebtItems.length;
    const critical = techDebtItems.filter((t) => t.severity === 'critical').length;
    const high = techDebtItems.filter((t) => t.severity === 'high').length;
    const resolved = techDebtItems.filter((t) => t.status === 'resolved').length;

    // Start at 100, deduct based on severity
    let score = 100;
    score -= critical * 15; // Critical issues are severe
    score -= high * 8;
    score -= (total - critical - high) * 3;

    // Bonus for resolved items
    if (total > 0) {
      const resolvedRatio = resolved / total;
      score += resolvedRatio * 20;
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      weight: DEFAULT_CATEGORY_WEIGHTS.tech_debt,
      trend: 0,
      issues_count: total - resolved,
      details: `${total - resolved} unresolved (${critical} critical, ${high} high)`,
    };
  } catch {
    // Tech debt table might not exist yet
    return {
      score: 80,
      weight: DEFAULT_CATEGORY_WEIGHTS.tech_debt,
      trend: 0,
      issues_count: 0,
      details: 'No tech debt data available',
    };
  }
}

/**
 * Calculate security score
 * Higher score = fewer security issues
 */
async function calculateSecurityScore(projectId: string): Promise<CategoryScore> {
  try {
    const patches = securityPatchDb.getPatchesByProject(projectId);

    const total = patches.length;
    const pending = patches.filter((p) => !p.patchApplied).length;
    const applied = patches.filter((p) => p.patchApplied).length;

    // Start at 100, deduct based on pending patches
    let score = 100;

    // Penalize pending security patches heavily
    patches.forEach((patch) => {
      if (!patch.patchApplied) {
        if (patch.severity === 'critical') score -= 25;
        else if (patch.severity === 'high') score -= 15;
        else if (patch.severity === 'medium') score -= 8;
        else score -= 3;
      }
    });

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      weight: DEFAULT_CATEGORY_WEIGHTS.security,
      trend: 0,
      issues_count: pending,
      details: `${pending} pending patches, ${applied} applied`,
    };
  } catch {
    // Security patches table might not exist
    return {
      score: 85,
      weight: DEFAULT_CATEGORY_WEIGHTS.security,
      trend: 0,
      issues_count: 0,
      details: 'No security scan data available',
    };
  }
}

/**
 * Calculate test coverage score (simulated)
 */
function calculateTestCoverageScore(projectId: string): CategoryScore {
  // In a real implementation, this would analyze test files
  // For now, we provide a baseline score
  return {
    score: 70,
    weight: DEFAULT_CATEGORY_WEIGHTS.test_coverage,
    trend: 0,
    issues_count: 0,
    details: 'Test coverage analysis not fully implemented',
  };
}

/**
 * Calculate goal completion score
 */
async function calculateGoalCompletionScore(projectId: string): Promise<CategoryScore> {
  try {
    const goals = goalDb.getGoalsByProject(projectId);

    const total = goals.length;
    const done = goals.filter((g) => g.status === 'done').length;
    const inProgress = goals.filter((g) => g.status === 'in_progress').length;
    const open = goals.filter((g) => g.status === 'open').length;

    if (total === 0) {
      return {
        score: 50, // Neutral if no goals
        weight: DEFAULT_CATEGORY_WEIGHTS.goal_completion,
        trend: 0,
        issues_count: 0,
        details: 'No goals defined',
      };
    }

    // Calculate completion percentage
    const completionRatio = done / total;
    const progressRatio = inProgress / total;

    // Score based on completion + partial credit for in-progress
    const score = completionRatio * 100 + progressRatio * 30;

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      weight: DEFAULT_CATEGORY_WEIGHTS.goal_completion,
      trend: 0,
      issues_count: open,
      details: `${done}/${total} completed, ${inProgress} in progress`,
    };
  } catch {
    return {
      score: 50,
      weight: DEFAULT_CATEGORY_WEIGHTS.goal_completion,
      trend: 0,
      issues_count: 0,
      details: 'Goal tracking not available',
    };
  }
}

/**
 * Calculate code quality score (derived from other metrics)
 */
function calculateCodeQualityScore(
  techDebtScore: number,
  securityScore: number
): CategoryScore {
  // Code quality is a composite of tech debt and security
  const score = techDebtScore * 0.6 + securityScore * 0.4;

  return {
    score: Math.round(score),
    weight: DEFAULT_CATEGORY_WEIGHTS.code_quality,
    trend: 0,
    details: 'Derived from tech debt and security scores',
  };
}

/**
 * Calculate weighted overall score
 */
function calculateOverallScore(
  categories: CategoryScores,
  weights: Record<string, number>
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, data] of Object.entries(categories) as [string, CategoryScore][]) {
    const weight = weights[category] || 0;
    weightedSum += data.score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Determine health status from score
 */
function determineStatus(
  score: number,
  thresholds: Record<string, number>
): HealthScoreStatus {
  if (score >= thresholds.excellent) return 'excellent';
  if (score >= thresholds.good) return 'good';
  if (score >= thresholds.fair) return 'fair';
  if (score >= thresholds.poor) return 'poor';
  return 'critical';
}
