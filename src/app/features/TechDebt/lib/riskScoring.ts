/**
 * Risk Scoring Algorithm for Technical Debt
 * Calculates a 0-100 risk score based on multiple factors
 */

import type { RiskFactors } from '@/app/db/models/tech-debt.types';

/**
 * Weights for each risk factor (must sum to 100)
 */
const WEIGHTS = {
  severity: 30,        // How critical is the issue
  ageInDays: 20,       // How long has it existed
  fileCount: 15,       // How many files are affected
  businessImpact: 20,  // Impact on business operations
  technicalImpact: 15  // Impact on technical quality
};

/**
 * Calculate overall risk score (0-100)
 */
export function calculateRiskScore(factors: RiskFactors): number {
  // Normalize each factor to 0-10 scale
  const normalizedSeverity = normalizeSeverity(factors.severity);
  const normalizedAge = normalizeAge(factors.ageInDays);
  const normalizedFileCount = normalizeFileCount(factors.fileCount);
  const normalizedBusinessImpact = normalizeImpact(factors.businessImpact);
  const normalizedTechnicalImpact = normalizeImpact(factors.technicalImpact);

  // Calculate weighted score
  const score =
    (normalizedSeverity * WEIGHTS.severity) +
    (normalizedAge * WEIGHTS.ageInDays) +
    (normalizedFileCount * WEIGHTS.fileCount) +
    (normalizedBusinessImpact * WEIGHTS.businessImpact) +
    (normalizedTechnicalImpact * WEIGHTS.technicalImpact);

  // Ensure score is between 0-100
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Normalize severity (0-10 scale)
 * Input: 0-10 (severity weight)
 */
function normalizeSeverity(severity: number): number {
  // Already on 0-10 scale
  return Math.min(10, Math.max(0, severity));
}

/**
 * Normalize age (0-10 scale)
 * Older tech debt is riskier
 * 0 days = 0, 365+ days = 10
 */
function normalizeAge(ageInDays: number): number {
  if (ageInDays <= 0) return 0;
  if (ageInDays >= 365) return 10;

  // Logarithmic scale - risk increases rapidly in first 30 days, then gradually
  if (ageInDays <= 30) {
    return (ageInDays / 30) * 5; // 0-30 days = 0-5 score
  } else {
    return 5 + ((ageInDays - 30) / 335) * 5; // 31-365 days = 5-10 score
  }
}

/**
 * Normalize file count (0-10 scale)
 * More files affected = higher risk
 * 0-1 files = 0-2, 2-5 files = 3-5, 6-10 files = 6-8, 11+ files = 9-10
 */
function normalizeFileCount(fileCount: number): number {
  if (fileCount === 0) return 0;
  if (fileCount === 1) return 2;
  if (fileCount <= 5) return 3 + (fileCount - 2);
  if (fileCount <= 10) return 6 + Math.floor((fileCount - 6) * 0.4);
  return Math.min(10, 9 + Math.floor((fileCount - 11) * 0.1));
}

/**
 * Normalize impact (0-10 scale)
 * Input: 0-10 (impact weight)
 */
function normalizeImpact(impact: number): number {
  return Math.min(10, Math.max(0, impact));
}

/**
 * Get risk level label from score
 */
export function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Calculate priority rank for sorting
 * Combines risk score with other factors for prioritization
 */
export function calculatePriorityRank(
  riskScore: number,
  estimatedEffort: number | null,
  businessImpact: number
): number {
  // Higher risk = higher priority
  let priority = riskScore;

  // Lower effort = higher priority (ROI consideration)
  if (estimatedEffort !== null) {
    const effortPenalty = Math.min(20, estimatedEffort * 2); // Max 20 point penalty
    priority -= effortPenalty;
  }

  // Higher business impact = higher priority
  priority += businessImpact * 0.5;

  return Math.max(0, priority);
}

/**
 * Predict future risk score based on trend
 * Returns projected score in N days if not addressed
 */
export function predictFutureRisk(
  currentFactors: RiskFactors,
  daysInFuture: number
): number {
  const futureFactors: RiskFactors = {
    ...currentFactors,
    ageInDays: currentFactors.ageInDays + daysInFuture
  };

  return calculateRiskScore(futureFactors);
}

/**
 * Calculate risk trend over time
 * Returns array of risk scores for visualization
 */
export function calculateRiskTrend(
  baseFactors: RiskFactors,
  daysToProject: number = 90,
  interval: number = 7
): Array<{ day: number; riskScore: number }> {
  const trend: Array<{ day: number; riskScore: number }> = [];

  for (let day = 0; day <= daysToProject; day += interval) {
    const score = predictFutureRisk(baseFactors, day);
    trend.push({ day, riskScore: score });
  }

  return trend;
}

/**
 * Calculate ROI score for addressing tech debt
 * Higher score = better return on investment
 */
export function calculateROI(
  riskScore: number,
  estimatedEffort: number,
  businessImpact: number
): number {
  if (estimatedEffort === 0) return 0;

  // ROI = (Risk Reduction + Business Value) / Effort
  const riskReduction = riskScore;
  const businessValue = businessImpact * 10; // Scale business impact

  return ((riskReduction + businessValue) / estimatedEffort) * 10;
}
