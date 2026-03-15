/**
 * Review Stage Types
 *
 * Type contracts for the review stage: diff review, report generation,
 * and auto-commit. All downstream review modules implement against these.
 */

import type { BuildResult } from '../execution/buildValidator';
import type {
  ExecutionResult,
  SpecMetadata,
  PipelineMetrics,
  BalancingConfig,
} from '../types';

// ============================================================================
// Deep Rubric (10-dimension scored review)
// ============================================================================

export interface RubricDimension {
  score: number; // 1-5
  critical: boolean; // if true and score < 2, review fails
  note?: string;
}

export interface DeepRubricScores {
  structureSize: RubricDimension;      // Functions/files < 200 LOC
  noAnyTypes: RubricDimension;         // No `any` usage
  errorHandling: RubricDimension;      // Try/catch, error boundaries
  security: RubricDimension;           // OWASP: no injection, XSS, etc.
  resilience: RubricDimension;         // Circuit-breaking, graceful degradation
  performance: RubricDimension;        // No N+1, efficient algorithms
  naming: RubricDimension;             // Consistent, descriptive names
  dependencies: RubricDimension;       // No circular, clean imports
  testing: RubricDimension;            // Testable code, edge cases
  reversibility: RubricDimension;      // Safe to roll back
}

/** Dimensions where score < 2 causes automatic failure */
export const CRITICAL_DIMENSIONS: (keyof DeepRubricScores)[] = [
  'security',
  'errorHandling',
  'noAnyTypes',
  'structureSize',
];

// ============================================================================
// Legacy Rubric (backward compatibility)
// ============================================================================

export type RubricScores = {
  logicCorrectness: 'pass' | 'fail';
  namingConventions: 'pass' | 'fail';
  typeSafety: 'pass' | 'fail';
};

// ============================================================================
// File Review Result
// ============================================================================

export interface FileReviewResult {
  filePath: string;
  passed: boolean;
  rationale: string;
  rubricScores: RubricScores;
  deepScores?: DeepRubricScores;
}

// ============================================================================
// Review Stage Result
// ============================================================================

export interface ReviewStageResult {
  overallPassed: boolean;
  fileResults: FileReviewResult[];
  reviewModel: string;
  reviewedAt: string;
}

// ============================================================================
// Execution Report
// ============================================================================

export interface ExecutionReport {
  goal: {
    title: string;
    description: string;
  };
  summary: {
    specsExecuted: number;
    specTitles: string[];
    filesChanged: string[];
    buildStatus: 'passed' | 'failed' | 'skipped';
    reviewOutcome: 'passed' | 'failed' | 'error';
    overallResult: 'success' | 'partial' | 'failure';
  };
  fileReviews: FileReviewResult[];
  autoCommitted: boolean;
  commitSha?: string;
  generatedAt: string;
}

// ============================================================================
// Review Stage Input
// ============================================================================

export interface ReviewStageInput {
  executionResults: ExecutionResult[];
  currentMetrics: PipelineMetrics;
  currentCycle: number;
  config: BalancingConfig;
  projectId: string;
  projectPath: string;
  specs: SpecMetadata[];
  buildResult: BuildResult;
  goalTitle: string;
  goalDescription: string;
  autoCommit: boolean;
  reviewModel: string | null;
  runId?: string;
}

// ============================================================================
// File Diff
// ============================================================================

export interface FileDiff {
  filePath: string;
  diff: string;
  isNew: boolean;
  error: string | null;
}
