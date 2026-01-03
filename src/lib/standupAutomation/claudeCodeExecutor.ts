/**
 * Claude Code Executor for Standup Automation
 * Executes automation cycles via Claude Code CLI with session tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { automationSessionRepository } from '@/app/db/repositories/automation-session.repository';
import { executionQueue } from '@/app/Claude/lib/claudeExecutionQueue';
import { createRequirement } from '@/app/Claude/sub_ClaudeCodeManager/folderManager';
import { logger } from '@/lib/logger';
import {
  buildGoalGenerationPrompt,
  buildGoalEvaluationPrompt,
  buildFullAutomationPrompt,
} from './automationPrompts';
import { gatherGenerationContext } from './goalGenerator';
import { gatherGoalContext } from './goalEvaluator';
import { goalDb } from '@/app/db';
import type {
  AutomationExecutionRequest,
  StandupAutomationConfig,
  AutomationSession,
} from './types';

const AUTOMATION_REQUIREMENT_PREFIX = 'standup-automation-';

/**
 * Execute a standup automation cycle via Claude Code
 * Returns immediately with session info - results come via API callbacks
 */
export async function executeAutomationViaClaudeCode(params: {
  projectId: string;
  projectPath: string;
  projectName: string;
  config: StandupAutomationConfig;
  resumeSessionId?: string;
}): Promise<{ sessionId: string; taskId: string }> {
  const { projectId, projectPath, projectName, config, resumeSessionId } = params;

  logger.info('[ClaudeCodeExecutor] Starting automation execution', {
    projectId,
    projectPath,
    modes: config.modes,
    strategy: config.strategy,
    resumeSessionId,
  });

  // Create or get automation session
  let session: ReturnType<typeof automationSessionRepository.getById>;
  let sessionId: string;

  if (resumeSessionId) {
    session = automationSessionRepository.getById(resumeSessionId);
    if (!session) {
      throw new Error(`Session ${resumeSessionId} not found for resume`);
    }
    sessionId = session.id;
    automationSessionRepository.updatePhase(sessionId, 'running');
  } else {
    session = automationSessionRepository.create({
      projectId,
      projectPath,
      config,
    });
    sessionId = session.id;
  }

  // Gather context for prompt building
  const generationContext = await gatherGenerationContext(projectId);

  // Get goals for evaluation if enabled
  let evaluationGoals: Awaited<ReturnType<typeof goalDb.getGoalsByProject>> = [];
  if (config.modes.evaluateGoals) {
    const allGoals = goalDb.getGoalsByProject(projectId);
    evaluationGoals = allGoals.filter(
      g => g.status === 'open' || g.status === 'in_progress'
    );
  }

  // Build the automation prompt
  const prompt = buildFullAutomationPrompt({
    sessionId,
    projectId,
    projectPath,
    projectName,
    config,
    generationContext,
    evaluationGoals,
  });

  // Create requirement file
  const requirementName = `${AUTOMATION_REQUIREMENT_PREFIX}${sessionId.slice(0, 8)}`;

  const createResult = createRequirement(projectPath, requirementName, prompt, true);
  if (!createResult.success) {
    const errorMsg = createResult.error || 'Unknown error';
    automationSessionRepository.fail(sessionId, `Failed to create requirement: ${errorMsg}`);
    throw new Error(`Failed to create requirement: ${errorMsg}`);
  }

  logger.info('[ClaudeCodeExecutor] Requirement file created', {
    requirementName,
    projectPath,
    filePath: createResult.filePath,
  });

  // Queue execution
  const taskId = executionQueue.addTask(
    projectPath,
    requirementName,
    projectId,
    undefined, // No git config for automation
    {
      sessionId,
      claudeSessionId: resumeSessionId ? session?.claude_session_id || undefined : undefined,
    }
  );

  // Update session with task ID
  automationSessionRepository.updateTaskId(sessionId, taskId);

  logger.info('[ClaudeCodeExecutor] Execution queued', {
    sessionId,
    taskId,
    requirementName,
  });

  return { sessionId, taskId };
}

/**
 * Execute goal generation only via Claude Code
 */
export async function executeGoalGenerationViaClaudeCode(params: {
  projectId: string;
  projectPath: string;
  projectName: string;
  strategy: StandupAutomationConfig['strategy'];
}): Promise<{ sessionId: string; taskId: string }> {
  const { projectId, projectPath, projectName, strategy } = params;

  const config: StandupAutomationConfig = {
    enabled: true,
    intervalMinutes: 0,
    projectIds: [projectId],
    autonomyLevel: 'cautious',
    strategy,
    modes: {
      evaluateGoals: false,
      updateStatuses: false,
      generateGoals: true,
      createAnalysisTasks: false,
    },
    notifyOnChanges: true,
  };

  // Create session
  const session = automationSessionRepository.create({
    projectId,
    projectPath,
    config,
  });

  // Gather context
  const context = await gatherGenerationContext(projectId);

  // Build prompt
  const prompt = buildGoalGenerationPrompt({
    sessionId: session.id,
    projectId,
    projectPath,
    projectName,
    context,
    strategy,
  });

  // Create requirement
  const requirementName = `${AUTOMATION_REQUIREMENT_PREFIX}gen-${session.id.slice(0, 8)}`;
  const createResult = createRequirement(projectPath, requirementName, prompt, true);
  if (!createResult.success) {
    throw new Error(`Failed to create requirement: ${createResult.error}`);
  }

  // Queue execution
  const taskId = executionQueue.addTask(
    projectPath,
    requirementName,
    projectId
  );

  automationSessionRepository.updateTaskId(session.id, taskId);

  return { sessionId: session.id, taskId };
}

/**
 * Execute goal evaluation only via Claude Code
 */
export async function executeGoalEvaluationViaClaudeCode(params: {
  projectId: string;
  projectPath: string;
}): Promise<{ sessionId: string; taskId: string }> {
  const { projectId, projectPath } = params;

  // Get goals to evaluate
  const allGoals = goalDb.getGoalsByProject(projectId);
  const goalsToEvaluate = allGoals.filter(
    g => g.status === 'open' || g.status === 'in_progress'
  );

  if (goalsToEvaluate.length === 0) {
    throw new Error('No goals to evaluate');
  }

  const config: StandupAutomationConfig = {
    enabled: true,
    intervalMinutes: 0,
    projectIds: [projectId],
    autonomyLevel: 'cautious',
    strategy: 'build',
    modes: {
      evaluateGoals: true,
      updateStatuses: true,
      generateGoals: false,
      createAnalysisTasks: false,
    },
    notifyOnChanges: true,
  };

  // Create session
  const session = automationSessionRepository.create({
    projectId,
    projectPath,
    config,
  });

  // Gather contexts for each goal
  const contexts = await Promise.all(
    goalsToEvaluate.map(async goal => ({
      goalId: goal.id,
      context: await gatherGoalContext(goal),
    }))
  );

  // Build prompt
  const prompt = buildGoalEvaluationPrompt({
    sessionId: session.id,
    projectId,
    projectPath,
    goals: goalsToEvaluate,
    contexts,
  });

  // Create requirement
  const requirementName = `${AUTOMATION_REQUIREMENT_PREFIX}eval-${session.id.slice(0, 8)}`;
  const createResult = createRequirement(projectPath, requirementName, prompt, true);
  if (!createResult.success) {
    throw new Error(`Failed to create requirement: ${createResult.error}`);
  }

  // Queue execution
  const taskId = executionQueue.addTask(
    projectPath,
    requirementName,
    projectId
  );

  automationSessionRepository.updateTaskId(session.id, taskId);

  return { sessionId: session.id, taskId };
}

/**
 * Get the status of an automation session
 */
export function getAutomationSessionStatus(sessionId: string): AutomationSession | null {
  const dbSession = automationSessionRepository.getById(sessionId);
  if (!dbSession) return null;

  const config = automationSessionRepository.parseConfig(dbSession);
  const result = automationSessionRepository.parseResult(dbSession);

  return {
    id: dbSession.id,
    projectId: dbSession.project_id,
    projectPath: dbSession.project_path,
    phase: dbSession.phase,
    taskId: dbSession.task_id || undefined,
    claudeSessionId: dbSession.claude_session_id || undefined,
    startedAt: dbSession.started_at,
    completedAt: dbSession.completed_at || undefined,
    config,
    result: result || undefined,
    errorMessage: dbSession.error_message || undefined,
  };
}

/**
 * Resume a failed or incomplete automation session
 */
export async function resumeAutomationSession(sessionId: string): Promise<{ taskId: string }> {
  const session = automationSessionRepository.getById(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (session.phase === 'complete') {
    throw new Error('Cannot resume a completed session');
  }

  const config = automationSessionRepository.parseConfig(session);

  // Re-execute with the same session
  const result = await executeAutomationViaClaudeCode({
    projectId: session.project_id,
    projectPath: session.project_path,
    projectName: '', // Will be looked up
    config,
    resumeSessionId: session.claude_session_id || undefined,
  });

  return { taskId: result.taskId };
}

/**
 * Cancel a running automation session
 */
export function cancelAutomationSession(sessionId: string): boolean {
  const session = automationSessionRepository.getById(sessionId);
  if (!session) return false;

  if (session.phase === 'complete' || session.phase === 'failed') {
    return false; // Already finished
  }

  return automationSessionRepository.fail(sessionId, 'Cancelled by user');
}

/**
 * Get all active automation sessions
 */
export function getActiveAutomationSessions(): AutomationSession[] {
  const dbSessions = automationSessionRepository.getAllActive();

  return dbSessions.map(dbSession => {
    const config = automationSessionRepository.parseConfig(dbSession);
    return {
      id: dbSession.id,
      projectId: dbSession.project_id,
      projectPath: dbSession.project_path,
      phase: dbSession.phase,
      taskId: dbSession.task_id || undefined,
      claudeSessionId: dbSession.claude_session_id || undefined,
      startedAt: dbSession.started_at,
      config,
    };
  });
}

/**
 * Cleanup old automation sessions
 */
export function cleanupOldSessions(daysOld: number = 7): number {
  return automationSessionRepository.deleteOlderThan(daysOld);
}
