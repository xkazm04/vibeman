/**
 * Confidence Scorer -- Conductor Verification Engine
 *
 * Computes a composite 0-100 confidence score from multiple verification
 * factors: build pass, test pass, file verification, LLM review quality,
 * and task completion rate.
 */

export interface ConfidenceFactors {
  buildPassed: boolean;
  testsGenerated: number;
  testsPassed: number;
  testsFailed: number;
  filesVerified: boolean;
  llmReviewQuality: number; // 0-1, how well-structured the LLM reflect response was
  taskSuccessRate: number; // 0-1, completed/total tasks
}

export interface ConfidenceBreakdown {
  build: number; // 0-25
  tests: number; // 0-30
  fileVerification: number; // 0-20
  llmReview: number; // 0-15
  taskCompletion: number; // 0-10
}

export interface ConfidenceScore {
  overall: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: ConfidenceFactors;
  breakdown: ConfidenceBreakdown;
}

const WEIGHTS = {
  build: 25,
  tests: 30,
  fileVerification: 20,
  llmReview: 15,
  taskCompletion: 10,
} as const;

export function computeConfidence(factors: ConfidenceFactors): ConfidenceScore {
  const breakdown: ConfidenceBreakdown = {
    build: factors.buildPassed ? WEIGHTS.build : 0,
    tests: computeTestScore(factors),
    fileVerification: factors.filesVerified ? WEIGHTS.fileVerification : 0,
    llmReview: Math.round(factors.llmReviewQuality * WEIGHTS.llmReview),
    taskCompletion: Math.round(factors.taskSuccessRate * WEIGHTS.taskCompletion),
  };

  const overall =
    breakdown.build +
    breakdown.tests +
    breakdown.fileVerification +
    breakdown.llmReview +
    breakdown.taskCompletion;

  return {
    overall,
    grade: scoreToGrade(overall),
    factors,
    breakdown,
  };
}

function computeTestScore(factors: ConfidenceFactors): number {
  const total = factors.testsGenerated;
  if (total === 0) return Math.round(WEIGHTS.tests * 0.5); // partial credit if no tests generated
  const passRate = factors.testsPassed / total;
  return Math.round(passRate * WEIGHTS.tests);
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}
