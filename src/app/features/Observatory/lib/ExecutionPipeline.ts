/**
 * Execution Pipeline
 * Integrates with Claude Code to run auto-fixes
 * Tracks outcomes and feeds back into learning system
 */

import * as path from 'path';
import * as fs from 'fs';
import { observatoryDb } from '@/app/db';
import type { DbAutoFixItem, CreateExecutionOutcome } from '@/app/db/models/observatory.types';
import { markAutoFixExecuting, completeAutoFix } from './ActionEngine';
import { triggerPostExecutionObservation } from './ObservationService';
import { collectAllSignals } from './signals';

// Execution states
export type ExecutionState = 'pending' | 'preparing' | 'executing' | 'verifying' | 'completed' | 'failed';

// Execution context
export interface ExecutionContext {
  projectPath: string;
  projectId: string;
  autoFix: DbAutoFixItem;
  state: ExecutionState;
  executionId?: string;
  error?: string;
}

// Pre-execution snapshot
interface PreExecutionSnapshot {
  files: Map<string, string>; // file path -> content hash
  healthScore: number | null;
  complexityScores: Record<string, number>;
}

/**
 * Create a pre-execution snapshot of the target files
 */
async function createPreExecutionSnapshot(
  projectPath: string,
  targetFiles: string[]
): Promise<PreExecutionSnapshot> {
  const files = new Map<string, string>();
  const complexityScores: Record<string, number> = {};

  // Get file hashes
  for (const file of targetFiles) {
    const fullPath = path.isAbsolute(file) ? file : path.join(projectPath, file);
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Simple hash using length + first/last chars (fast approximation)
        const hash = `${content.length}-${content.slice(0, 100)}-${content.slice(-100)}`;
        files.set(file, hash);
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Get current signals for health score
  try {
    const signals = await collectAllSignals(projectPath, targetFiles);
    const healthScore = signals.aggregated.overallScore;

    for (const result of signals.providers) {
      if (result.providerId === 'complexity') {
        const data = result.data as Record<string, unknown>;
        const mostComplex = data.mostComplex as Array<{ file: string; score: number }> | undefined;
        if (mostComplex) {
          for (const item of mostComplex) {
            complexityScores[item.file] = item.score;
          }
        }
      }
    }

    return { files, healthScore, complexityScores };
  } catch {
    return { files, healthScore: null, complexityScores };
  }
}

/**
 * Compare pre and post execution states
 */
async function compareStates(
  projectPath: string,
  targetFiles: string[],
  preSnapshot: PreExecutionSnapshot
): Promise<{
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  healthImprovement: number | null;
  complexityImprovement: Record<string, number>;
  newIssues: number;
}> {
  const filesChanged: string[] = [];
  let linesAdded = 0;
  let linesRemoved = 0;
  const complexityImprovement: Record<string, number> = {};

  // Check which files changed
  for (const file of targetFiles) {
    const fullPath = path.isAbsolute(file) ? file : path.join(projectPath, file);
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const newHash = `${content.length}-${content.slice(0, 100)}-${content.slice(-100)}`;

        if (preSnapshot.files.get(file) !== newHash) {
          filesChanged.push(file);

          // Rough line count comparison
          const oldLength = parseInt(preSnapshot.files.get(file)?.split('-')[0] || '0', 10);
          const newLength = content.split('\n').length;
          if (newLength > oldLength) {
            linesAdded += newLength - oldLength;
          } else {
            linesRemoved += oldLength - newLength;
          }
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Get post-execution signals
  let healthImprovement: number | null = null;
  let newIssues = 0;

  try {
    const signals = await collectAllSignals(projectPath, targetFiles);

    if (preSnapshot.healthScore !== null) {
      healthImprovement = signals.aggregated.overallScore - preSnapshot.healthScore;
    }

    // Check for complexity improvements
    for (const result of signals.providers) {
      if (result.providerId === 'complexity') {
        const data = result.data as Record<string, unknown>;
        const mostComplex = data.mostComplex as Array<{ file: string; score: number }> | undefined;
        if (mostComplex) {
          for (const item of mostComplex) {
            if (preSnapshot.complexityScores[item.file] !== undefined) {
              complexityImprovement[item.file] = item.score - preSnapshot.complexityScores[item.file];
            }
          }
        }
      }
    }

    // Count new issues (negative health = more issues)
    if (healthImprovement !== null && healthImprovement < -5) {
      newIssues = Math.ceil(Math.abs(healthImprovement) / 10);
    }
  } catch {
    // Use defaults if signal collection fails
  }

  return {
    filesChanged,
    linesAdded,
    linesRemoved,
    healthImprovement,
    complexityImprovement,
    newIssues,
  };
}

/**
 * Write requirement file for Claude Code execution
 */
function writeRequirementFile(
  projectPath: string,
  autoFix: DbAutoFixItem
): string {
  const requirementsDir = path.join(projectPath, '.claude', 'requirements');

  // Ensure directory exists
  if (!fs.existsSync(requirementsDir)) {
    fs.mkdirSync(requirementsDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedTitle = autoFix.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const filename = `autofix_${sanitizedTitle}_${timestamp}.md`;
  const filePath = path.join(requirementsDir, filename);

  // Write requirement content
  fs.writeFileSync(filePath, autoFix.generated_requirement);

  return filePath;
}

/**
 * Execute an auto-fix
 */
export async function executeAutoFix(
  context: ExecutionContext
): Promise<{
  success: boolean;
  executionId: string;
  outcome?: CreateExecutionOutcome;
  error?: string;
}> {
  const { projectPath, projectId, autoFix } = context;

  // Generate execution ID
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Parse target files
    let targetFiles: string[];
    try {
      targetFiles = JSON.parse(autoFix.target_files);
    } catch {
      targetFiles = [autoFix.target_files];
    }

    // 1. Create pre-execution snapshot
    const preSnapshot = await createPreExecutionSnapshot(projectPath, targetFiles);

    // 2. Mark as executing
    markAutoFixExecuting(autoFix.id, executionId);

    // 3. Create execution outcome record
    const outcome = observatoryDb.createExecutionOutcome({
      project_id: projectId,
      execution_id: executionId,
      prediction_id: autoFix.prediction_id,
      execution_type: 'refactor',
      requirement_content: autoFix.generated_requirement,
      target_files: targetFiles,
    });

    // 4. Write requirement file
    const requirementPath = writeRequirementFile(projectPath, autoFix);

    // 5. Store pre-execution state
    observatoryDb.updateExecutionOutcome(outcome.id, {
      pre_complexity_scores: preSnapshot.complexityScores,
      pre_health_score: preSnapshot.healthScore || undefined,
    });

    // Note: Actual Claude Code execution would happen here via the TaskRunner
    // For now, we just prepare the requirement and track the outcome
    // The actual execution is handled by the existing TaskRunner module

    return {
      success: true,
      executionId,
      outcome: {
        project_id: projectId,
        execution_id: executionId,
        prediction_id: autoFix.prediction_id,
        execution_type: 'refactor',
        requirement_content: autoFix.generated_requirement,
        target_files: targetFiles,
      },
    };
  } catch (error) {
    // Mark as failed
    completeAutoFix(autoFix.id, false);

    return {
      success: false,
      executionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Complete an execution and record outcomes
 */
export async function completeExecution(
  projectPath: string,
  executionId: string,
  success: boolean,
  tokensUsed?: number
): Promise<void> {
  // Get the execution outcome
  const outcome = observatoryDb.getExecutionOutcomeByExecutionId(executionId);
  if (!outcome) return;

  // Parse target files
  let targetFiles: string[];
  try {
    targetFiles = outcome.target_files ? JSON.parse(outcome.target_files) : [];
  } catch {
    targetFiles = [];
  }

  // Create pre-snapshot from stored data
  const preSnapshot: PreExecutionSnapshot = {
    files: new Map(),
    healthScore: outcome.pre_health_score,
    complexityScores: outcome.pre_complexity_scores
      ? JSON.parse(outcome.pre_complexity_scores)
      : {},
  };

  // Compare states
  const comparison = await compareStates(projectPath, targetFiles, preSnapshot);

  // Determine outcome rating
  let rating: 'excellent' | 'good' | 'neutral' | 'poor' | 'failed';
  let regressionDetected = false;

  if (!success) {
    rating = 'failed';
  } else if (comparison.newIssues > 0) {
    rating = 'poor';
    regressionDetected = true;
  } else if (comparison.healthImprovement !== null && comparison.healthImprovement > 10) {
    rating = 'excellent';
  } else if (comparison.healthImprovement !== null && comparison.healthImprovement > 0) {
    rating = 'good';
  } else {
    rating = 'neutral';
  }

  // Update execution outcome
  observatoryDb.updateExecutionOutcome(outcome.id, {
    success,
    files_changed: comparison.filesChanged,
    lines_added: comparison.linesAdded,
    lines_removed: comparison.linesRemoved,
    tokens_used: tokensUsed,
    post_health_score: preSnapshot.healthScore !== null && comparison.healthImprovement !== null
      ? preSnapshot.healthScore + comparison.healthImprovement
      : undefined,
    health_improvement: comparison.healthImprovement || undefined,
    issues_resolved: comparison.healthImprovement && comparison.healthImprovement > 0
      ? Math.floor(comparison.healthImprovement / 10)
      : 0,
    new_issues_introduced: comparison.newIssues,
    outcome_rating: rating,
    regression_detected: regressionDetected,
    completed_at: new Date().toISOString(),
  });

  // Trigger post-execution observation
  triggerPostExecutionObservation(outcome.project_id, executionId, comparison.filesChanged);
}

/**
 * Get execution history for a project
 */
export function getExecutionHistory(projectId: string, limit = 50) {
  return observatoryDb.getRecentExecutionOutcomes(projectId, limit);
}

/**
 * Get execution success rate
 */
export function getExecutionSuccessRate(projectId: string, days = 30) {
  return observatoryDb.getExecutionSuccessRate(projectId, days);
}

