import { NextResponse } from 'next/server';
import {
  executeRequirement,
} from '@/app/Claude/lib/claudeCodeManager';
import {
  createProjectSnapshot,
  autoUpdateContexts,
} from '@/app/Claude/lib/contextAutoUpdate';
import { logger } from '@/lib/logger';
import {
  validateProjectPath,
  validateRequirementName,
  validateProjectId,
  validateGitConfig,
  validateSessionConfig,
} from '@/lib/validation/inputValidator';
import { validateBody } from '@/lib/validation/apiValidator';
import { sanitizePath, sanitizeFilename, sanitizeString, sanitizeShellArg, sanitizeId } from '@/lib/validation/sanitizers';
import {
  createApiErrorResponse,
  ApiErrorCode,
  handleApiError,
  type ErrorRequestContext,
} from '@/lib/api-errors';

const log = logger.child('execution');

interface ExecutionResult {
  success: boolean;
  output?: string;
  logFilePath?: string;
  error?: string;
  sessionLimitReached?: boolean;
}

/** Configuration for git operations after execution */
export interface GitExecutionConfig {
  enabled: boolean;
  commands: string[];
  commitMessage: string;
}

/** Session identifiers for tracking execution context */
export interface SessionConfig {
  sessionId?: string;
  claudeSessionId?: string;
}

/**
 * Queues a requirement for async execution.
 *
 * Validation runs before any processing via `validateBody()`.
 *
 * @param projectPath     - Absolute path to the project directory.
 * @param requirementName - Filename-safe requirement identifier.
 * @param projectId       - Optional UUID of the project record.
 * @param gitConfig       - Optional git operations config.
 * @param sessionConfig   - Optional session tracking identifiers.
 * @returns JSON response with `{ success, taskId, mode }` or an error envelope.
 */
export async function queueExecution(
  projectPath: string,
  requirementName: string,
  projectId?: string,
  gitConfig?: GitExecutionConfig,
  sessionConfig?: SessionConfig,
  requestContext?: ErrorRequestContext
): Promise<NextResponse> {
  const elapsed = logger.startTimer();

  try {
    // Validate all inputs before any processing
    const validation = validateBody(
      { projectPath, requirementName, projectId, gitConfig, sessionConfig },
      {
        required: [
          { field: 'projectPath', validator: validateProjectPath },
          { field: 'requirementName', validator: validateRequirementName },
        ],
        optional: [
          { field: 'projectId', validator: validateProjectId },
        ],
        custom: [
          (body) => validateGitConfig(body.gitConfig),
          (body) => validateSessionConfig(body.sessionConfig),
        ],
      },
    );
    if (!validation.success) return validation.error;

    // Sanitize inputs — strip shell metacharacters from values that may
    // reach child processes (git commit messages, command strings)
    const cleanPath = sanitizePath(projectPath);
    const cleanName = sanitizeFilename(requirementName);
    const cleanProjectId = projectId ? sanitizeId(projectId) : undefined;

    const cleanGitConfig = gitConfig ? {
      enabled: gitConfig.enabled,
      commands: gitConfig.commands.map(cmd => sanitizeShellArg(cmd)),
      commitMessage: sanitizeShellArg(gitConfig.commitMessage),
    } : undefined;

    const cleanSessionConfig = sessionConfig ? {
      sessionId: sessionConfig.sessionId ? sanitizeId(sessionConfig.sessionId) : undefined,
      claudeSessionId: sessionConfig.claudeSessionId ? sanitizeId(sessionConfig.claudeSessionId) : undefined,
    } : undefined;

    log.info('Queuing requirement for execution', {
      requirementName: cleanName,
      projectId: cleanProjectId,
      gitEnabled: cleanGitConfig?.enabled,
      sessionId: cleanSessionConfig?.sessionId,
      claudeSessionId: cleanSessionConfig?.claudeSessionId,
    });

    const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
    const taskId = executionQueue.addTask(cleanPath, cleanName, cleanProjectId, cleanGitConfig, cleanSessionConfig);

    const { durationMs } = elapsed();
    log.info('Task queued successfully', { taskId, requirementName: cleanName, durationMs });

    // Return data at root level for pipeline compatibility
    // (successResponse wraps data in a "data" property which breaks consumers)
    return NextResponse.json({
      success: true,
      message: 'Requirement queued for execution',
      taskId,
      mode: 'async',
    });
  } catch (error) {
    const { durationMs } = elapsed();
    log.warn('Failed to queue execution', { requirementName: sanitizeString(requirementName), durationMs, error });
    return handleApiError(error, 'queueExecution', ApiErrorCode.INTERNAL_ERROR, requestContext);
  }
}

/**
 * Executes requirement synchronously and performs context auto-update.
 *
 * Validation runs before any processing via `validateBody()`.
 *
 * @param projectPath     - Absolute path to the project directory.
 * @param requirementName - Filename-safe requirement identifier.
 * @param projectId       - Optional UUID of the project record.
 * @returns JSON response with execution result or an error envelope.
 */
export async function executeSync(
  projectPath: string,
  requirementName: string,
  projectId?: string,
  requestContext?: ErrorRequestContext
): Promise<NextResponse> {
  const elapsed = logger.startTimer();

  try {
    // Validate all inputs before any processing
    const validation = validateBody(
      { projectPath, requirementName, projectId },
      {
        required: [
          { field: 'projectPath', validator: validateProjectPath },
          { field: 'requirementName', validator: validateRequirementName },
        ],
        optional: [
          { field: 'projectId', validator: validateProjectId },
        ],
      },
    );
    if (!validation.success) return validation.error;

    // Sanitize inputs
    const cleanPath = sanitizePath(projectPath);
    const cleanName = sanitizeFilename(requirementName);
    const cleanProjectId = projectId ? sanitizeId(projectId) : undefined;

    log.info('Starting sync execution', { requirementName: cleanName, projectId: cleanProjectId });

    // Create snapshot before execution for context auto-update
    const beforeSnapshot = cleanProjectId ? createProjectSnapshot(cleanPath) : null;

    const result: ExecutionResult = await executeRequirement(cleanPath, cleanName);

    if (!result.success) {
      const { durationMs } = elapsed();
      log.warn('Sync execution failed', {
        requirementName: cleanName,
        projectId: cleanProjectId,
        error: result.error,
        sessionLimitReached: result.sessionLimitReached,
        durationMs,
      });

      if (result.sessionLimitReached) {
        return createApiErrorResponse(
          ApiErrorCode.RATE_LIMITED,
          'Session limit reached',
          {
            details: {
              logFilePath: result.logFilePath,
              sessionLimitReached: true,
            },
          }
        );
      }

      return createApiErrorResponse(
        ApiErrorCode.OPERATION_FAILED,
        sanitizeString(result.error || 'Failed to execute requirement'),
        {
          details: { logFilePath: result.logFilePath },
        }
      );
    }

    // Auto-update contexts after successful execution
    let contextUpdateResults = null;
    if (cleanProjectId && beforeSnapshot) {
      contextUpdateResults = await performContextAutoUpdate(cleanProjectId, cleanPath, beforeSnapshot);
    }

    const { durationMs } = elapsed();
    log.info('Sync execution completed', { requirementName: cleanName, projectId: cleanProjectId, durationMs });

    // Return data at root level for consistency
    return NextResponse.json({
      success: true,
      message: 'Requirement executed successfully',
      output: result.output,
      logFilePath: result.logFilePath,
      contextUpdates: contextUpdateResults,
      mode: 'sync',
    });
  } catch (error) {
    const { durationMs } = elapsed();
    log.warn('Sync execution error', { requirementName: sanitizeString(requirementName), durationMs, error });
    return handleApiError(error, 'executeSync', ApiErrorCode.INTERNAL_ERROR, requestContext);
  }
}

/**
 * Performs context auto-update with error handling
 */
async function performContextAutoUpdate(
  projectId: string,
  projectPath: string,
  beforeSnapshot: Map<string, number>
): Promise<unknown> {
  const elapsed = logger.startTimer();
  try {
    log.info('Starting context auto-update', { projectId });
    const results = await autoUpdateContexts(projectId, projectPath, beforeSnapshot);
    const { durationMs } = elapsed();
    log.info('Context auto-update completed', { projectId, durationMs, results });
    return results;
  } catch (error) {
    const { durationMs } = elapsed();
    log.error('Context auto-update failed', { projectId, durationMs, error });
    // Don't fail the whole request if context update fails
    return null;
  }
}
