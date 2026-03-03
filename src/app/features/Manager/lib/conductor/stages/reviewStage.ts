/**
 * Review Stage — Analyze results and decide whether to continue
 *
 * Aggregates execution metrics, feeds results to Brain for learning,
 * triggers self-healing if failures detected, and decides whether
 * to loop back to Scout for another cycle.
 */

import type {
  BalancingConfig,
  PipelineMetrics,
  ExecutionResult,
  ReviewDecision,
  ErrorClassification,
} from '../types';
import { checkQuota } from '../balancingEngine';

interface ReviewInput {
  executionResults: ExecutionResult[];
  currentMetrics: PipelineMetrics;
  currentCycle: number;
  config: BalancingConfig;
  projectId: string;
}

/**
 * Execute the Review stage: analyze results and decide next action.
 */
export async function executeReviewStage(input: ReviewInput): Promise<{
  decision: ReviewDecision;
  updatedMetrics: PipelineMetrics;
  errors: ErrorClassification[];
}> {
  const { executionResults, currentMetrics, currentCycle, config, projectId } = input;

  // Aggregate metrics from execution results
  const completedCount = executionResults.filter((r) => r.success).length;
  const failedCount = executionResults.filter((r) => !r.success).length;
  const totalDuration = executionResults.reduce((sum, r) => sum + (r.durationMs || 0), 0);

  const updatedMetrics: PipelineMetrics = {
    ...currentMetrics,
    tasksCompleted: currentMetrics.tasksCompleted + completedCount,
    tasksFailed: currentMetrics.tasksFailed + failedCount,
    totalDurationMs: currentMetrics.totalDurationMs + totalDuration,
  };

  // Calculate success rate
  const totalExecuted = updatedMetrics.tasksCompleted + updatedMetrics.tasksFailed;
  const successRate = totalExecuted > 0
    ? updatedMetrics.tasksCompleted / totalExecuted
    : 0;

  // Classify errors from failed tasks
  const errors: ErrorClassification[] = [];
  for (const result of executionResults) {
    if (!result.success && result.error) {
      errors.push(classifyError(result, projectId));
    }
  }

  // Feed results to Brain (record behavioral signals)
  try {
    await recordBrainSignals(projectId, executionResults);
  } catch (error) {
    console.error('[review] Failed to record brain signals:', error);
  }

  // Decide whether to continue
  const decision = makeDecision(
    currentCycle,
    config,
    updatedMetrics,
    successRate,
    errors.length
  );

  return { decision, updatedMetrics, errors };
}

function makeDecision(
  currentCycle: number,
  config: BalancingConfig,
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
  result: ExecutionResult,
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

async function recordBrainSignals(
  projectId: string,
  results: ExecutionResult[]
): Promise<void> {
  // Record execution outcomes as behavioral signals
  for (const result of results) {
    try {
      await fetch(`${getBaseUrl()}/api/brain/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          signalType: 'implementation',
          data: {
            success: result.success,
            taskId: result.taskId,
            requirementName: result.requirementName,
            error: result.error,
            durationMs: result.durationMs,
            filesChanged: result.filesChanged || [],
          },
        }),
      });
    } catch {
      // Silent fail for brain signals
    }
  }
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
