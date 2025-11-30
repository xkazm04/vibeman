/**
 * Adaptive Learning Algorithm
 * Self-optimizing system that learns from past idea executions
 * to fine-tune impact-effort scoring weights and thresholds
 */

import {
  ideaExecutionOutcomeDb,
  scoringWeightDb,
  scoringThresholdDb,
} from '@/app/db';
import type { DbIdea, DbIdeaExecutionOutcome, DbScoringWeight } from '@/app/db/models/types';

export interface AdaptiveScore {
  rawScore: number; // Base impact/effort ratio
  adjustedScore: number; // Score after applying learned weights
  confidence: number; // Confidence level (0-100) based on sample size
  breakdown: {
    effortAdjustment: number;
    impactAdjustment: number;
    successRateBonus: number;
    categoryFactor: number;
  };
}

export interface LearningMetrics {
  totalExecutions: number;
  successRate: number;
  effortAccuracy: number;
  impactAccuracy: number;
  avgExecutionTime: number;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    successRate: number;
    avgEffortDelta: number;
    avgImpactDelta: number;
  }>;
}

/**
 * Calculate adaptive score for an idea based on learned patterns
 */
export function calculateAdaptiveScore(
  idea: DbIdea,
  projectId: string
): AdaptiveScore {
  const effort = idea.effort ?? 2; // Default to medium
  const impact = idea.impact ?? 2; // Default to medium

  // Base score: impact/effort ratio (higher is better)
  const rawScore = (impact / effort) * 33.33; // Normalize to 0-100 scale

  // Get learned weights
  const weights = scoringWeightDb.getWeights(projectId, idea.category, idea.scan_type);
  const defaultWeights = scoringWeightDb.getOrCreateDefaults(projectId);
  const activeWeights = weights || defaultWeights;

  // Get historical outcomes for this category
  const categoryOutcomes = ideaExecutionOutcomeDb.getByCategory(projectId, idea.category);
  const successfulOutcomes = categoryOutcomes.filter(o => o.success === 1);

  // Calculate confidence based on sample size
  const sampleCount = categoryOutcomes.length;
  const confidence = Math.min(100, sampleCount * 10); // Max confidence at 10+ samples

  // Calculate adjustments based on historical patterns
  let effortAdjustment = 0;
  let impactAdjustment = 0;
  let successRateBonus = 0;
  let categoryFactor = 1.0;

  if (sampleCount >= 3) {
    // Effort adjustment: If we consistently underestimate effort, reduce score
    const avgEffortDelta = calculateAvgEffortDelta(categoryOutcomes);
    effortAdjustment = -avgEffortDelta * activeWeights.effort_accuracy_weight * 5;

    // Impact adjustment: If we consistently overestimate impact, reduce score
    const avgImpactDelta = calculateAvgImpactDelta(categoryOutcomes);
    impactAdjustment = -avgImpactDelta * activeWeights.impact_accuracy_weight * 5;

    // Success rate bonus
    const successRate = successfulOutcomes.length / sampleCount;
    successRateBonus = (successRate - 0.5) * activeWeights.success_rate_weight * 20;

    // Category factor based on overall category performance
    categoryFactor = calculateCategoryFactor(categoryOutcomes, activeWeights);
  }

  // Calculate adjusted score
  const adjustedScore = Math.max(0, Math.min(100,
    rawScore + effortAdjustment + impactAdjustment + successRateBonus
  ) * categoryFactor);

  return {
    rawScore: Math.round(rawScore * 100) / 100,
    adjustedScore: Math.round(adjustedScore * 100) / 100,
    confidence,
    breakdown: {
      effortAdjustment: Math.round(effortAdjustment * 100) / 100,
      impactAdjustment: Math.round(impactAdjustment * 100) / 100,
      successRateBonus: Math.round(successRateBonus * 100) / 100,
      categoryFactor: Math.round(categoryFactor * 100) / 100,
    },
  };
}

/**
 * Calculate average effort prediction delta
 */
function calculateAvgEffortDelta(outcomes: DbIdeaExecutionOutcome[]): number {
  const withActual = outcomes.filter(o => o.predicted_effort && o.actual_effort);
  if (withActual.length === 0) return 0;

  const totalDelta = withActual.reduce((sum, o) => {
    return sum + ((o.actual_effort || 0) - (o.predicted_effort || 0));
  }, 0);

  return totalDelta / withActual.length;
}

/**
 * Calculate average impact prediction delta
 */
function calculateAvgImpactDelta(outcomes: DbIdeaExecutionOutcome[]): number {
  const withActual = outcomes.filter(o => o.predicted_impact && o.actual_impact);
  if (withActual.length === 0) return 0;

  const totalDelta = withActual.reduce((sum, o) => {
    return sum + ((o.predicted_impact || 0) - (o.actual_impact || 0));
  }, 0);

  return totalDelta / withActual.length;
}

/**
 * Calculate category performance factor
 */
function calculateCategoryFactor(
  outcomes: DbIdeaExecutionOutcome[],
  weights: DbScoringWeight
): number {
  if (outcomes.length < 3) return 1.0;

  const successRate = outcomes.filter(o => o.success === 1).length / outcomes.length;
  const avgExecutionTime = outcomes.reduce((sum, o) => sum + (o.execution_time_ms || 0), 0) / outcomes.length;

  // Normalize execution time (assume 5 minutes is average)
  const timeNormalized = Math.min(2, avgExecutionTime / 300000);

  // Factor combines success rate and execution time efficiency
  const factor = (successRate * 0.7) + ((1 - timeNormalized * 0.3) * 0.3);

  return Math.max(0.5, Math.min(1.5, factor + 0.5));
}

/**
 * Record execution outcome and trigger learning update
 */
export async function recordExecutionOutcome(
  idea: DbIdea,
  executionResult: {
    success: boolean;
    executionTimeMs?: number;
    filesChanged?: number;
    linesAdded?: number;
    linesRemoved?: number;
    errorType?: string;
  }
): Promise<DbIdeaExecutionOutcome> {
  // Calculate actual effort based on execution metrics
  const actualEffort = inferActualEffort(executionResult);
  const actualImpact = inferActualImpact(executionResult, idea);

  // Record the outcome
  const outcome = ideaExecutionOutcomeDb.create({
    idea_id: idea.id,
    project_id: idea.project_id,
    predicted_effort: idea.effort,
    predicted_impact: idea.impact,
    actual_effort: actualEffort,
    actual_impact: actualImpact,
    execution_time_ms: executionResult.executionTimeMs,
    files_changed: executionResult.filesChanged,
    lines_added: executionResult.linesAdded,
    lines_removed: executionResult.linesRemoved,
    success: executionResult.success,
    error_type: executionResult.errorType,
    category: idea.category,
    scan_type: idea.scan_type,
  });

  // Trigger weight recalibration if we have enough new data
  await maybeRecalibrateWeights(idea.project_id, idea.category, idea.scan_type);

  return outcome;
}

/**
 * Infer actual effort from execution metrics
 */
function inferActualEffort(result: {
  executionTimeMs?: number;
  filesChanged?: number;
  linesAdded?: number;
  linesRemoved?: number;
}): number {
  const time = result.executionTimeMs || 0;
  const files = result.filesChanged || 0;
  const lines = (result.linesAdded || 0) + (result.linesRemoved || 0);

  // Score based on metrics
  let score = 0;

  // Time-based scoring (in minutes)
  const minutes = time / 60000;
  if (minutes < 2) score += 1;
  else if (minutes < 5) score += 2;
  else score += 3;

  // File-based scoring
  if (files <= 2) score += 1;
  else if (files <= 5) score += 2;
  else score += 3;

  // Line-based scoring
  if (lines <= 50) score += 1;
  else if (lines <= 200) score += 2;
  else score += 3;

  // Average and clamp to 1-3
  return Math.max(1, Math.min(3, Math.round(score / 3)));
}

/**
 * Infer actual impact from execution result and idea context
 */
function inferActualImpact(
  result: { success: boolean; filesChanged?: number },
  idea: DbIdea
): number {
  if (!result.success) {
    // Failed implementations have low impact
    return 1;
  }

  // Base on file count and category importance
  const files = result.filesChanged || 1;
  const categoryWeight = getCategoryImportanceWeight(idea.category);

  let baseImpact = 2; // Medium by default

  if (files >= 5 && categoryWeight >= 1.2) {
    baseImpact = 3;
  } else if (files <= 2 && categoryWeight < 0.9) {
    baseImpact = 1;
  }

  return baseImpact;
}

/**
 * Get importance weight for a category
 */
function getCategoryImportanceWeight(category: string): number {
  const categoryWeights: Record<string, number> = {
    security: 1.5,
    performance: 1.3,
    bug_fix: 1.2,
    functionality: 1.1,
    enhancement: 1.0,
    refactoring: 0.9,
    documentation: 0.7,
    style: 0.6,
  };

  return categoryWeights[category.toLowerCase()] || 1.0;
}

/**
 * Recalibrate weights if we have enough new samples
 */
async function maybeRecalibrateWeights(
  projectId: string,
  category: string,
  scanType: string
): Promise<void> {
  const outcomes = ideaExecutionOutcomeDb.getByCategory(projectId, category);
  const weights = scoringWeightDb.getWeights(projectId, category, scanType);

  // Need at least 5 samples to recalibrate
  if (outcomes.length < 5) return;

  // Only recalibrate if we have new samples since last calibration
  const currentSampleCount = weights?.sample_count || 0;
  if (outcomes.length <= currentSampleCount) return;

  // Calculate new weights
  const successRate = outcomes.filter(o => o.success === 1).length / outcomes.length;

  // Effort accuracy: How often do we predict effort correctly?
  const effortAccurate = outcomes.filter(o =>
    o.predicted_effort === o.actual_effort
  ).length / outcomes.filter(o => o.actual_effort !== null).length || 0;

  // Impact accuracy
  const impactAccurate = outcomes.filter(o =>
    o.predicted_impact === o.actual_impact
  ).length / outcomes.filter(o => o.actual_impact !== null).length || 0;

  // Adjust weights based on accuracy
  // If effort predictions are poor, increase effort weight to compensate
  const effortWeight = 1.0 + (1 - effortAccurate) * 0.5;
  const impactWeight = 1.5 + (1 - impactAccurate) * 0.5;
  const successWeight = 2.0 + (successRate < 0.6 ? 0.5 : 0); // Boost if low success

  // Calculate execution time factor
  const avgTime = outcomes.reduce((sum, o) => sum + (o.execution_time_ms || 0), 0) / outcomes.length;
  const timeFactor = Math.min(1.0, 300000 / (avgTime || 300000)); // Normalize to 5 min

  scoringWeightDb.updateWeights(projectId, category, scanType, {
    effort_accuracy_weight: Math.round(effortWeight * 100) / 100,
    impact_accuracy_weight: Math.round(impactWeight * 100) / 100,
    success_rate_weight: Math.round(successWeight * 100) / 100,
    execution_time_factor: Math.round(timeFactor * 100) / 100,
    sample_count: outcomes.length,
  });
}

/**
 * Get comprehensive learning metrics for a project
 */
export function getLearningMetrics(projectId: string): LearningMetrics {
  const outcomes = ideaExecutionOutcomeDb.getByProject(projectId);

  if (outcomes.length === 0) {
    return {
      totalExecutions: 0,
      successRate: 0,
      effortAccuracy: 0,
      impactAccuracy: 0,
      avgExecutionTime: 0,
      categoryBreakdown: [],
    };
  }

  const successRate = outcomes.filter(o => o.success === 1).length / outcomes.length;

  const withEffort = outcomes.filter(o => o.actual_effort !== null);
  const effortAccuracy = withEffort.length > 0
    ? withEffort.filter(o => o.predicted_effort === o.actual_effort).length / withEffort.length
    : 0;

  const withImpact = outcomes.filter(o => o.actual_impact !== null);
  const impactAccuracy = withImpact.length > 0
    ? withImpact.filter(o => o.predicted_impact === o.actual_impact).length / withImpact.length
    : 0;

  const avgExecutionTime = outcomes.reduce((sum, o) => sum + (o.execution_time_ms || 0), 0) / outcomes.length;

  // Build category breakdown
  const categoryMap = new Map<string, DbIdeaExecutionOutcome[]>();
  outcomes.forEach(o => {
    const existing = categoryMap.get(o.category) || [];
    existing.push(o);
    categoryMap.set(o.category, existing);
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, catOutcomes]) => {
    const catSuccessRate = catOutcomes.filter(o => o.success === 1).length / catOutcomes.length;
    const avgEffortDelta = calculateAvgEffortDelta(catOutcomes);
    const avgImpactDelta = calculateAvgImpactDelta(catOutcomes);

    return {
      category,
      count: catOutcomes.length,
      successRate: Math.round(catSuccessRate * 100) / 100,
      avgEffortDelta: Math.round(avgEffortDelta * 100) / 100,
      avgImpactDelta: Math.round(avgImpactDelta * 100) / 100,
    };
  }).sort((a, b) => b.count - a.count);

  return {
    totalExecutions: outcomes.length,
    successRate: Math.round(successRate * 100) / 100,
    effortAccuracy: Math.round(effortAccuracy * 100) / 100,
    impactAccuracy: Math.round(impactAccuracy * 100) / 100,
    avgExecutionTime: Math.round(avgExecutionTime),
    categoryBreakdown,
  };
}

/**
 * Check thresholds and return recommended action
 */
export function checkThresholds(
  projectId: string,
  score: AdaptiveScore
): {
  action: 'auto_accept' | 'auto_reject' | 'priority_boost' | 'none';
  threshold?: { type: string; value: number };
} {
  const thresholds = scoringThresholdDb.getOrCreateDefaults(projectId);

  for (const threshold of thresholds) {
    if (threshold.enabled !== 1) continue;

    // Check confidence requirement
    if (threshold.min_confidence && score.confidence < threshold.min_confidence) continue;

    const meetsMinScore = !threshold.min_score || score.adjustedScore >= threshold.min_score;
    const meetsMaxScore = !threshold.max_score || score.adjustedScore <= threshold.max_score;

    if (meetsMinScore && meetsMaxScore) {
      return {
        action: threshold.threshold_type,
        threshold: {
          type: threshold.threshold_type,
          value: threshold.min_score || threshold.max_score || 0,
        },
      };
    }
  }

  return { action: 'none' };
}

/**
 * Get all weights and thresholds for dashboard display
 */
export function getAdaptiveConfig(projectId: string): {
  weights: DbScoringWeight[];
  thresholds: Array<{
    id: string;
    type: string;
    minScore: number | null;
    maxScore: number | null;
    minConfidence: number | null;
    enabled: boolean;
  }>;
} {
  const weights = scoringWeightDb.getAllByProject(projectId);
  const thresholds = scoringThresholdDb.getAllByProject(projectId);

  return {
    weights,
    thresholds: thresholds.map(t => ({
      id: t.id,
      type: t.threshold_type,
      minScore: t.min_score,
      maxScore: t.max_score,
      minConfidence: t.min_confidence,
      enabled: t.enabled === 1,
    })),
  };
}
