/**
 * Review Stage — Analyze results, run LLM code review, write Brain signals,
 * generate execution report, and optionally auto-commit.
 *
 * Orchestrates sub-operations from the review/ modules while preserving
 * existing metric aggregation and decision logic.
 */

import type {
  PipelineMetrics,
  ReviewDecision,
  ErrorClassification,
  SpecMetadata,
} from '../types';
import type {
  ReviewStageInput,
  ReviewStageResult,
  ExecutionReport,
} from '../review/reviewTypes';
import { checkQuota } from '../balancingEngine';
import { extractFileDiffs, reviewFileDiffs } from '../review/diffReviewer';
import { generateExecutionReport } from '../review/reportGenerator';
import { canCommit, commitChanges } from '../review/gitCommitter';
import { recordSignal } from '@/lib/brain/brainService';

/**
 * Execute the Review stage: analyze results, run LLM review, write Brain
 * signals, generate report, and optionally auto-commit.
 */
export async function executeReviewStage(input: ReviewStageInput): Promise<{
  decision: ReviewDecision;
  updatedMetrics: PipelineMetrics;
  errors: ErrorClassification[];
  reviewResults: ReviewStageResult | null;
  report: ExecutionReport | null;
}> {
  const { executionResults, currentMetrics, currentCycle, config, projectId } = input;

  // 1. Extract diffs
  const fileDiffs = extractFileDiffs(input.projectPath, input.executionResults, input.specs);

  // 2. LLM code review (non-blocking on failure)
  let reviewResults: ReviewStageResult | null = null;
  try {
    reviewResults = await reviewFileDiffs(fileDiffs, input.specs, input.reviewModel);
  } catch (error) {
    console.error('[review] LLM code review failed (non-blocking):', error);
  }

  // 3. Brain signal writes per spec (non-blocking)
  for (const spec of input.specs) {
    try {
      // Find review rationale for this spec's files
      const specFiles = [
        ...(spec.affectedFiles?.create || []),
        ...(spec.affectedFiles?.modify || []),
        ...(spec.affectedFiles?.delete || []),
      ].map((f) => f.replace(/\\/g, '/'));

      const relevantReviews = reviewResults?.fileResults.filter((r) =>
        specFiles.includes(r.filePath)
      ) || [];

      recordSignal({
        projectId,
        signalType: 'implementation' as any,
        data: {
          requirementId: spec.id,
          requirementName: spec.title,
          filesCreated: spec.affectedFiles?.create || [],
          filesModified: spec.affectedFiles?.modify || [],
          filesDeleted: spec.affectedFiles?.delete || [],
          success: reviewResults?.overallPassed ?? false,
          executionTimeMs: 0,
          reviewRationale: relevantReviews.map((r) => ({
            filePath: r.filePath,
            passed: r.passed,
            rationale: r.rationale,
          })),
        },
      });
    } catch (error) {
      console.error(`[review] Brain signal write failed for spec ${spec.id} (non-blocking):`, error);
    }
  }

  // 4. Metric aggregation (preserved from original)
  const completedCount = executionResults.filter((r) => r.success).length;
  const failedCount = executionResults.filter((r) => !r.success).length;
  const totalDuration = executionResults.reduce((sum, r) => sum + (r.durationMs || 0), 0);

  const updatedMetrics: PipelineMetrics = {
    ...currentMetrics,
    tasksCompleted: currentMetrics.tasksCompleted + completedCount,
    tasksFailed: currentMetrics.tasksFailed + failedCount,
    totalDurationMs: currentMetrics.totalDurationMs + totalDuration,
  };

  const totalExecuted = updatedMetrics.tasksCompleted + updatedMetrics.tasksFailed;
  const successRate = totalExecuted > 0
    ? updatedMetrics.tasksCompleted / totalExecuted
    : 0;

  // 5. Classify errors from failed tasks
  const errors: ErrorClassification[] = [];
  for (const result of executionResults) {
    if (!result.success && result.error) {
      errors.push(classifyError(result, projectId));
    }
  }

  // 6. Make decision (preserved from original)
  const decision = makeDecision(
    currentCycle,
    config,
    updatedMetrics,
    successRate,
    errors.length
  );

  // 7. Generate report
  const fallbackReviewResult: ReviewStageResult = {
    overallPassed: false,
    fileResults: [],
    reviewModel: input.reviewModel || 'none',
    reviewedAt: new Date().toISOString(),
  };
  const report = generateExecutionReport(input, reviewResults || fallbackReviewResult);

  // 8. Auto-commit (gated on both build and review pass)
  if (input.autoCommit && reviewResults && canCommit(input.buildResult, reviewResults)) {
    const allFilesChanged = [
      ...new Set(
        input.executionResults.flatMap((r) => r.filesChanged || [])
      ),
    ];
    const commitResult = commitChanges(
      input.projectPath,
      input.goalTitle,
      input.specs.length,
      allFilesChanged
    );
    if (commitResult) {
      report.autoCommitted = true;
      report.commitSha = commitResult.sha;
    }
  }

  return { decision, updatedMetrics, errors, reviewResults, report };
}

function makeDecision(
  currentCycle: number,
  config: import('../types').BalancingConfig,
  metrics: PipelineMetrics,
  successRate: number,
  errorCount: number
): ReviewDecision {
  // Check cycle limit
  if (config.maxCyclesPerRun > 0 && currentCycle >= config.maxCyclesPerRun) {
    return {
      shouldContinue: false,
      reason: `Reached max cycles (${config.maxCyclesPerRun})`,
      successRate,
      healingTriggered: errorCount >= config.healingThreshold,
    };
  }

  // Check quota
  const quotaCheck = checkQuota(config, metrics);
  if (!quotaCheck.allowed) {
    return {
      shouldContinue: false,
      reason: quotaCheck.reason || 'Quota exceeded',
      successRate,
      healingTriggered: errorCount >= config.healingThreshold,
    };
  }

  // Stop if success rate is too low (< 20%) and we've done at least 1 cycle
  if (successRate < 0.2 && currentCycle > 1) {
    return {
      shouldContinue: false,
      reason: `Success rate too low (${Math.round(successRate * 100)}%)`,
      successRate,
      healingTriggered: true,
    };
  }

  // Stop if nothing was generated in this cycle
  if (metrics.ideasGenerated === 0) {
    return {
      shouldContinue: false,
      reason: 'No ideas generated in this cycle',
      successRate,
      healingTriggered: false,
    };
  }

  // Continue
  return {
    shouldContinue: true,
    reason: `Success rate ${Math.round(successRate * 100)}%, continuing to cycle ${currentCycle + 1}`,
    successRate,
    healingTriggered: errorCount >= config.healingThreshold,
  };
}

function classifyError(
  result: import('../types').ExecutionResult,
  _projectId: string
): ErrorClassification {
  const errorMsg = result.error || 'Unknown error';
  const errorType = detectErrorType(errorMsg);

  return {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pipelineRunId: '', // Will be set by orchestrator
    stage: 'execute',
    errorType,
    errorMessage: errorMsg,
    taskId: result.taskId,
    occurrenceCount: 1,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    resolved: false,
  };
}

function detectErrorType(errorMessage: string): ErrorClassification['errorType'] {
  const msg = errorMessage.toLowerCase();

  if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
  if (msg.includes('permission') || msg.includes('access denied')) return 'permission_error';
  if (msg.includes('not found') || msg.includes('missing module') || msg.includes('cannot find')) return 'dependency_missing';
  if (msg.includes('parse') || msg.includes('invalid json') || msg.includes('unexpected token')) return 'invalid_output';
  if (msg.includes('tool') || msg.includes('edit failed') || msg.includes('write failed')) return 'tool_failure';
  if (msg.includes('ambiguous') || msg.includes('unclear') || msg.includes('confused')) return 'prompt_ambiguity';
  if (msg.includes('context') || msg.includes('file not') || msg.includes('no such file')) return 'missing_context';

  return 'unknown';
}
