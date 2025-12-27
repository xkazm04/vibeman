/**
 * Automation Engine
 * Core orchestrator for standup automation - ties together all components
 *
 * Supports two execution modes:
 * 1. Direct LLM (legacy): Uses Anthropic client directly for quick evaluations
 * 2. Claude Code (new): Uses Claude Code CLI for deep codebase exploration
 */

import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { projectDb } from '@/lib/project_database';
import { goalDb } from '@/app/db';
import {
  StandupAutomationConfig,
  AutomationCycleResult,
  GoalStatusChange,
  GoalCandidate,
  CreatedTask,
  AutomationSession,
} from './types';
import {
  evaluateProjectGoals,
  shouldAutoApply,
  applyStatusChange,
} from './goalEvaluator';
import { generateGoals, createApprovedGoals } from './goalGenerator';
import { createTask, createCandidatesReviewTask } from './taskCreator';
import {
  registerCycleRunner,
  getConfig,
  recordTokenUsage,
} from './automationScheduler';
import {
  executeAutomationViaClaudeCode,
  executeGoalGenerationViaClaudeCode,
  executeGoalEvaluationViaClaudeCode,
  getAutomationSessionStatus,
  getActiveAutomationSessions,
} from './claudeCodeExecutor';

/**
 * Modes override for selective execution
 */
export interface ModesOverride {
  evaluateGoals?: boolean;
  updateStatuses?: boolean;
  generateGoals?: boolean;
  createAnalysisTasks?: boolean;
}

/**
 * Run automation cycle for a single project
 * @param projectId - The project to run the cycle for
 * @param modesOverride - Optional modes to override config (for manual triggers)
 */
export async function runProjectCycle(
  projectId: string,
  modesOverride?: ModesOverride
): Promise<AutomationCycleResult> {
  const startTime = Date.now();
  const config = getConfig();
  const project = projectDb.getProject(projectId);

  // Merge modes with override (override takes precedence)
  const effectiveModes = modesOverride
    ? { ...config.modes, ...modesOverride }
    : config.modes;

  const result: AutomationCycleResult = {
    id: randomUUID(),
    projectId,
    projectName: project?.name || 'Unknown',
    timestamp: new Date().toISOString(),
    duration: 0,
    goalsEvaluated: 0,
    statusesUpdated: [],
    goalsGenerated: [],
    tasksCreated: [],
    tokensUsed: { input: 0, output: 0 },
    errors: [],
  };

  try {
    logger.info('[AutomationEngine] Running cycle for project:', {
      projectId,
      projectName: project?.name,
      configModes: config.modes,
      modesOverride,
      effectiveModes,
      isOverride: !!modesOverride,
    });

    // Phase 1: Evaluate existing goals
    if (effectiveModes.evaluateGoals) {
      try {
        const evalResult = await evaluateProjectGoals(
          projectId,
          config.autonomyLevel
        );

        result.goalsEvaluated = evalResult.evaluations.length;
        result.statusesUpdated = evalResult.statusChanges;
        result.tokensUsed.input += evalResult.tokensUsed.input;
        result.tokensUsed.output += evalResult.tokensUsed.output;

        logger.info('[AutomationEngine] Goal evaluation complete:', {
          evaluated: evalResult.evaluations.length,
          statusChanges: evalResult.statusChanges.length,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Goal evaluation failed: ${msg}`);
        logger.error('[AutomationEngine] Goal evaluation error:', error);
      }
    }

    // Phase 2: Generate new goals based on strategy
    if (effectiveModes.generateGoals) {
      logger.info('[AutomationEngine] Phase 2: Starting goal generation', {
        projectId,
        strategy: config.strategy,
      });

      try {
        const genResult = await generateGoals(projectId, config.strategy);

        result.goalsGenerated = genResult.candidates;
        result.tokensUsed.input += genResult.tokensUsed.input;
        result.tokensUsed.output += genResult.tokensUsed.output;

        logger.info('[AutomationEngine] Goal generation returned', {
          candidateCount: genResult.candidates.length,
          tokensUsed: genResult.tokensUsed,
        });

        // In autonomous mode, auto-create high-priority goals
        if (config.autonomyLevel === 'autonomous') {
          const highPriorityGoals = genResult.candidates.filter(c => c.priorityScore >= 80);
          if (highPriorityGoals.length > 0) {
            createApprovedGoals(highPriorityGoals, projectId);
            logger.info('[AutomationEngine] Auto-created goals:', highPriorityGoals.length);
          }
        }

        logger.info('[AutomationEngine] Goal generation complete:', {
          candidates: genResult.candidates.length,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Goal generation failed: ${msg}`);
        logger.error('[AutomationEngine] Goal generation error:', {
          error: msg,
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    } else {
      logger.info('[AutomationEngine] Phase 2: Skipped (generateGoals disabled)', {
        effectiveModes,
      });
    }

    // Phase 3: Create analysis tasks
    if (effectiveModes.createAnalysisTasks && project?.path) {
      try {
        // Create tasks for status changes that need review
        const tasksToCreate: Array<{ goalId: string; title: string; type: 'progress_check' | 'blocker_resolution' }> = [];

        // Add progress check tasks for goals that had status suggestions but weren't auto-applied
        for (const change of result.statusesUpdated) {
          if (!change.autoApplied) {
            tasksToCreate.push({
              goalId: change.goalId,
              title: change.goalTitle,
              type: 'progress_check',
            });
          }
        }

        // Create tasks
        for (const taskInfo of tasksToCreate) {
          const task = await createTask({
            type: taskInfo.type,
            goalId: taskInfo.goalId,
            goalTitle: taskInfo.title,
            projectPath: project.path,
          });

          if (task) {
            result.tasksCreated.push(task);
          }
        }

        // Create review task for generated candidates if any
        if (result.goalsGenerated.length > 0 && config.autonomyLevel !== 'autonomous') {
          const reviewTask = await createCandidatesReviewTask(
            projectId,
            project.path,
            result.goalsGenerated
          );
          if (reviewTask) {
            result.tasksCreated.push(reviewTask);
          }
        }

        logger.info('[AutomationEngine] Task creation complete:', {
          tasks: result.tasksCreated.length,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Task creation failed: ${msg}`);
        logger.error('[AutomationEngine] Task creation error:', error);
      }
    }

    result.duration = Date.now() - startTime;

    logger.info('[AutomationEngine] Cycle complete:', {
      projectId,
      duration: result.duration,
      goalsEvaluated: result.goalsEvaluated,
      statusesUpdated: result.statusesUpdated.length,
      goalsGenerated: result.goalsGenerated.length,
      tasksCreated: result.tasksCreated.length,
      errors: result.errors.length,
    });

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Cycle failed: ${msg}`);
    result.duration = Date.now() - startTime;
    logger.error('[AutomationEngine] Cycle failed:', error);
    return result;
  }
}

/**
 * Run automation cycle for all configured projects
 * @param modesOverride - Optional modes to override config (for manual triggers)
 */
export async function runAllProjectsCycle(
  modesOverride?: ModesOverride
): Promise<AutomationCycleResult[]> {
  const config = getConfig();
  const results: AutomationCycleResult[] = [];

  // Merge modes with override for logging
  const effectiveModes = modesOverride
    ? { ...config.modes, ...modesOverride }
    : config.modes;

  // Determine which projects to process
  let projectIds: string[];

  if (config.projectIds === 'all') {
    const allProjects = projectDb.getAllProjects();
    projectIds = allProjects.map(p => p.id);
  } else {
    projectIds = config.projectIds;
  }

  logger.info('[AutomationEngine] Starting batch cycle:', {
    projectCount: projectIds.length,
    autonomyLevel: config.autonomyLevel,
    modes: effectiveModes,
    isOverride: !!modesOverride,
  });

  // Process each project
  for (const projectId of projectIds) {
    // Check if project has any active goals worth evaluating
    const goals = goalDb.getGoalsByProject(projectId);
    const hasActiveGoals = goals.some(g =>
      g.status === 'open' || g.status === 'in_progress'
    );

    if (!hasActiveGoals && !effectiveModes.generateGoals) {
      logger.debug('[AutomationEngine] Skipping project with no active goals:', projectId);
      continue;
    }

    const result = await runProjectCycle(projectId, modesOverride);
    results.push(result);

    // Small delay between projects
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Aggregate token usage for logging
  const totalTokens = results.reduce(
    (sum, r) => ({
      input: sum.input + r.tokensUsed.input,
      output: sum.output + r.tokensUsed.output,
    }),
    { input: 0, output: 0 }
  );

  logger.info('[AutomationEngine] Batch cycle complete:', {
    projectsProcessed: results.length,
    totalGoalsEvaluated: results.reduce((sum, r) => sum + r.goalsEvaluated, 0),
    totalStatusChanges: results.reduce((sum, r) => sum + r.statusesUpdated.length, 0),
    totalGoalsGenerated: results.reduce((sum, r) => sum + r.goalsGenerated.length, 0),
    totalTasksCreated: results.reduce((sum, r) => sum + r.tasksCreated.length, 0),
    totalTokens,
  });

  return results;
}

/**
 * Initialize the automation engine
 * Registers the cycle runner with the scheduler
 */
export function initializeEngine(): void {
  registerCycleRunner(runAllProjectsCycle);
  logger.info('[AutomationEngine] Engine initialized');
}

// Auto-initialize on module load
initializeEngine();

// ============ Claude Code Execution Mode ============

/**
 * Start a Claude Code automation cycle for a project
 * Returns immediately with session info - results come via API callbacks
 *
 * @param projectId - The project to run automation for
 * @param modesOverride - Optional modes to override config
 * @returns Session info with taskId for tracking
 */
export async function startClaudeCodeCycle(
  projectId: string,
  modesOverride?: ModesOverride
): Promise<{ sessionId: string; taskId: string }> {
  const config = getConfig();
  const project = projectDb.getProject(projectId);

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  if (!project.path) {
    throw new Error(`Project ${projectId} has no path configured`);
  }

  // Merge modes with override
  const effectiveConfig: StandupAutomationConfig = {
    ...config,
    modes: modesOverride ? { ...config.modes, ...modesOverride } : config.modes,
  };

  logger.info('[AutomationEngine] Starting Claude Code cycle', {
    projectId,
    projectName: project.name,
    modes: effectiveConfig.modes,
    strategy: effectiveConfig.strategy,
  });

  return executeAutomationViaClaudeCode({
    projectId,
    projectPath: project.path,
    projectName: project.name,
    config: effectiveConfig,
  });
}

/**
 * Start Claude Code goal generation for a project
 */
export async function startClaudeCodeGeneration(
  projectId: string,
  strategy?: StandupAutomationConfig['strategy']
): Promise<{ sessionId: string; taskId: string }> {
  const config = getConfig();
  const project = projectDb.getProject(projectId);

  if (!project?.path) {
    throw new Error(`Project ${projectId} not found or has no path`);
  }

  return executeGoalGenerationViaClaudeCode({
    projectId,
    projectPath: project.path,
    projectName: project.name,
    strategy: strategy || config.strategy,
  });
}

/**
 * Start Claude Code goal evaluation for a project
 */
export async function startClaudeCodeEvaluation(
  projectId: string
): Promise<{ sessionId: string; taskId: string }> {
  const project = projectDb.getProject(projectId);

  if (!project?.path) {
    throw new Error(`Project ${projectId} not found or has no path`);
  }

  return executeGoalEvaluationViaClaudeCode({
    projectId,
    projectPath: project.path,
  });
}

/**
 * Get the status of an automation session
 */
export function getSessionStatus(sessionId: string): AutomationSession | null {
  return getAutomationSessionStatus(sessionId);
}

/**
 * Get all active Claude Code automation sessions
 */
export function getActiveSessions(): AutomationSession[] {
  return getActiveAutomationSessions();
}

/**
 * Start Claude Code cycles for all configured projects
 * Returns immediately - results come via API callbacks
 */
export async function startClaudeCodeCycleForAllProjects(
  modesOverride?: ModesOverride
): Promise<Array<{ projectId: string; sessionId: string; taskId: string }>> {
  const config = getConfig();
  const results: Array<{ projectId: string; sessionId: string; taskId: string }> = [];

  // Determine which projects to process
  let projectIds: string[];

  if (config.projectIds === 'all') {
    const allProjects = projectDb.getAllProjects();
    projectIds = allProjects.map(p => p.id);
  } else {
    projectIds = config.projectIds;
  }

  logger.info('[AutomationEngine] Starting Claude Code batch cycle', {
    projectCount: projectIds.length,
  });

  for (const projectId of projectIds) {
    try {
      // Check if project has any active goals worth evaluating
      const goals = goalDb.getGoalsByProject(projectId);
      const hasActiveGoals = goals.some(
        g => g.status === 'open' || g.status === 'in_progress'
      );

      const effectiveModes = modesOverride
        ? { ...config.modes, ...modesOverride }
        : config.modes;

      if (!hasActiveGoals && !effectiveModes.generateGoals) {
        logger.debug('[AutomationEngine] Skipping project with no active goals', {
          projectId,
        });
        continue;
      }

      const { sessionId, taskId } = await startClaudeCodeCycle(projectId, modesOverride);
      results.push({ projectId, sessionId, taskId });

      // Small delay between starting projects to avoid overwhelming the queue
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('[AutomationEngine] Failed to start cycle for project', {
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

// Re-export scheduler functions for convenience
export {
  start as startAutomation,
  stop as stopAutomation,
  runNow as runAutomationNow,
  getAutomationStatus,
  getConfig as getAutomationConfig,
  updateConfig as updateAutomationConfig,
  getHistory as getAutomationHistory,
} from './automationScheduler';
