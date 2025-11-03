import { NextResponse } from 'next/server';
import { successResponse } from './helpers';
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

/**
 * Queues a requirement for async execution
 */
export async function queueExecution(
  projectPath: string,
  requirementName: string,
  projectId?: string
): Promise<NextResponse> {
  logger.info('Queuing requirement for execution', { requirementName, projectId });

  const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
  const taskId = executionQueue.addTask(projectPath, requirementName, projectId);

  logger.info('Task queued successfully', { taskId });

  return successResponse({
    taskId,
    mode: 'async',
  }, 'Requirement queued for execution');
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

  return successResponse({
    output: result.output,
    logFilePath: result.logFilePath,
    contextUpdates: contextUpdateResults,
    mode: 'sync',
  }, 'Requirement executed successfully');
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
