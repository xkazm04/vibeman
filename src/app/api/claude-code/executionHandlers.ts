import { NextResponse } from 'next/server';
import {
  executeRequirement,
} from '@/app/Claude/lib/claudeCodeManager';
import {
  createProjectSnapshot,
  autoUpdateContexts,
} from '@/app/Claude/lib/contextAutoUpdate';
import { logger } from '@/lib/logger';

interface ExecutionResult {
  success: boolean;
  output?: string;
  logFilePath?: string;
  error?: string;
  sessionLimitReached?: boolean;
}

export interface GitExecutionConfig {
  enabled: boolean;
  commands: string[];
  commitMessage: string;
}

export interface SessionConfig {
  sessionId?: string;
  claudeSessionId?: string;
}

/**
 * Queues a requirement for async execution
 */
export async function queueExecution(
  projectPath: string,
  requirementName: string,
  projectId?: string,
  gitConfig?: GitExecutionConfig,
  sessionConfig?: SessionConfig
): Promise<NextResponse> {
  logger.info('Queuing requirement for execution', {
    requirementName,
    projectId,
    gitEnabled: gitConfig?.enabled,
    sessionId: sessionConfig?.sessionId,
    claudeSessionId: sessionConfig?.claudeSessionId,
  });

  const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
  const taskId = executionQueue.addTask(projectPath, requirementName, projectId, gitConfig, sessionConfig);

  logger.info('Task queued successfully', { taskId });

  // Return data at root level for pipeline compatibility
  // (successResponse wraps data in a "data" property which breaks consumers)
  return NextResponse.json({
    success: true,
    message: 'Requirement queued for execution',
    taskId,
    mode: 'async',
  });
}

/**
 * Executes requirement synchronously and performs context auto-update
 */
export async function executeSync(
  projectPath: string,
  requirementName: string,
  projectId?: string
): Promise<NextResponse> {
  // Create snapshot before execution for context auto-update
  const beforeSnapshot = projectId ? createProjectSnapshot(projectPath) : null;

  const result: ExecutionResult = await executeRequirement(projectPath, requirementName);

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error || 'Failed to execute requirement',
        sessionLimitReached: result.sessionLimitReached || false,
        logFilePath: result.logFilePath,
      },
      { status: result.sessionLimitReached ? 429 : 500 }
    );
  }

  // Auto-update contexts after successful execution
  let contextUpdateResults = null;
  if (projectId && beforeSnapshot) {
    contextUpdateResults = await performContextAutoUpdate(projectId, projectPath, beforeSnapshot);
  }

  // Return data at root level for consistency
  return NextResponse.json({
    success: true,
    message: 'Requirement executed successfully',
    output: result.output,
    logFilePath: result.logFilePath,
    contextUpdates: contextUpdateResults,
    mode: 'sync',
  });
}

/**
 * Performs context auto-update with error handling
 */
async function performContextAutoUpdate(
  projectId: string,
  projectPath: string,
  beforeSnapshot: Map<string, number>
): Promise<unknown> {
  try {
    logger.info('Starting context auto-update');
    const results = await autoUpdateContexts(projectId, projectPath, beforeSnapshot);
    logger.info('Context auto-update completed', { results });
    return results;
  } catch (error) {
    logger.error('Context auto-update failed', { error });
    // Don't fail the whole request if context update fails
    return null;
  }
}
