/**
 * Report Generator
 *
 * Produces a structured ExecutionReport JSON from run data.
 * The report is self-contained — reading it alone tells you
 * everything about what happened in the run.
 */

import type {
  ExecutionReport,
  ReviewStageInput,
  ReviewStageResult,
} from './reviewTypes';

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate a complete execution report from run data and review results.
 *
 * - Derives buildStatus from BuildResult (passed/failed/skipped)
 * - Derives reviewOutcome from ReviewStageResult
 * - Derives overallResult from combination of build + review
 * - autoCommitted starts as false — caller updates after commit
 */
export function generateExecutionReport(
  input: ReviewStageInput,
  reviewResult: ReviewStageResult
): ExecutionReport {
  // Derive build status
  let buildStatus: 'passed' | 'failed' | 'skipped';
  if (input.buildResult.skipped) {
    buildStatus = 'skipped';
  } else if (input.buildResult.passed) {
    buildStatus = 'passed';
  } else {
    buildStatus = 'failed';
  }

  // Derive review outcome
  let reviewOutcome: 'passed' | 'failed' | 'error';
  const hasError = reviewResult.fileResults.some(
    (r) => r.filePath === 'review_error'
  );
  if (hasError) {
    reviewOutcome = 'error';
  } else if (reviewResult.overallPassed) {
    reviewOutcome = 'passed';
  } else {
    reviewOutcome = 'failed';
  }

  // Derive overall result
  let overallResult: 'success' | 'partial' | 'failure';
  if (buildStatus === 'failed' || reviewOutcome === 'failed') {
    overallResult = 'failure';
  } else if (
    (buildStatus === 'passed' || buildStatus === 'skipped') &&
    reviewOutcome === 'passed'
  ) {
    overallResult = 'success';
  } else {
    overallResult = 'partial';
  }

  // Collect spec titles
  const specTitles = input.specs.map((s) => s.title);

  // Collect unique changed files
  const filesChanged = [
    ...new Set(
      input.executionResults.flatMap((r) => r.filesChanged || [])
    ),
  ];

  return {
    goal: {
      title: input.goalTitle,
      description: input.goalDescription,
    },
    summary: {
      specsExecuted: input.specs.length,
      specTitles,
      filesChanged,
      buildStatus,
      reviewOutcome,
      overallResult,
    },
    fileReviews: reviewResult.fileResults,
    autoCommitted: false,
    generatedAt: new Date().toISOString(),
  };
}
