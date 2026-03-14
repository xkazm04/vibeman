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
// Rubric & File Review
// ============================================================================

export interface RubricScores {
  logicCorrectness: 'pass' | 'fail';
  namingConventions: 'pass' | 'fail';
  typeSafety: 'pass' | 'fail';
}

export interface FileReviewResult {
  filePath: string;
  passed: boolean;
  rationale: string;
  rubricScores: RubricScores;
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
