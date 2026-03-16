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
  validate,
} from '@/lib/validation/inputValidator';
import { sanitizePath, sanitizeFilename, sanitizeString } from '@/lib/validation/sanitizers';
import {
  createApiErrorResponse,
  ApiErrorCode,
  handleApiError,
} from '@/lib/api-errors';
import { ValidationError } from '@/lib/api/errorHandler';

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
 * Validate the optional gitConfig parameter shape.
 * Returns an error message or null if valid.
 */
function validateGitConfig(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    return 'gitConfig must be an object';
  }
  const cfg = value as Record<string, unknown>;
  if (typeof cfg.enabled !== 'boolean') {
    return 'gitConfig.enabled must be a boolean';
  }
  if (!Array.isArray(cfg.commands) || !cfg.commands.every((c: unknown) => typeof c === 'string')) {
    return 'gitConfig.commands must be an array of strings';
  }
  if (typeof cfg.commitMessage !== 'string' || cfg.commitMessage.trim().length === 0) {
    return 'gitConfig.commitMessage must be a non-empty string';
  }
  return null;
}

/**
 * Validate the optional sessionConfig parameter shape.
 * Returns an error message or null if valid.
 */
function validateSessionConfig(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    return 'sessionConfig must be an object';
  }
  const cfg = value as Record<string, unknown>;
  if (cfg.sessionId !== undefined && typeof cfg.sessionId !== 'string') {
    return 'sessionConfig.sessionId must be a string';
  }
  if (cfg.claudeSessionId !== undefined && typeof cfg.claudeSessionId !== 'string') {
    return 'sessionConfig.claudeSessionId must be a string';
  }
  return null;
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
  const elapsed = logger.startTimer();

  try {
    // Validate required inputs
    validate([
      { field: 'projectPath', value: projectPath, validator: validateProjectPath },
      { field: 'requirementName', value: requirementName, validator: validateRequirementName },
    ]);

    // Validate optional inputs
    if (projectId) {
      validate([{ field: 'projectId', value: projectId, validator: validateProjectId }]);
    }
    const gitError = validateGitConfig(gitConfig);
    if (gitError) {
      return createApiErrorResponse(ApiErrorCode.VALIDATION_ERROR, gitError, { logError: false });
    }
    const sessionError = validateSessionConfig(sessionConfig);
    if (sessionError) {
      return createApiErrorResponse(ApiErrorCode.VALIDATION_ERROR, sessionError, { logError: false });
    }

    // Sanitize inputs
    const cleanPath = sanitizePath(projectPath);
    const cleanName = sanitizeFilename(requirementName);

    log.info('Queuing requirement for execution', {
      requirementName: cleanName,
      projectId,
      gitEnabled: gitConfig?.enabled,
      sessionId: sessionConfig?.sessionId,
      claudeSessionId: sessionConfig?.claudeSessionId,
    });

    const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
    const taskId = executionQueue.addTask(cleanPath, cleanName, projectId, gitConfig, sessionConfig);

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
    log.warn('Failed to queue execution', { requirementName, durationMs, error });
    if (error instanceof ValidationError) {
      return createApiErrorResponse(ApiErrorCode.VALIDATION_ERROR, error.message, { logError: false });
    }
    return handleApiError(error, 'queueExecution');
  }
}

/**
 * Executes requirement synchronously and performs context auto-update
 */
export async function executeSync(
  projectPath: string,
  requirementName: string,
  projectId?: string
): Promise<NextResponse> {
  const elapsed = logger.startTimer();

  try {
    // Validate required inputs
    validate([
      { field: 'projectPath', value: projectPath, validator: validateProjectPath },
      { field: 'requirementName', value: requirementName, validator: validateRequirementName },
    ]);

    // Validate optional projectId
    if (projectId) {
      validate([{ field: 'projectId', value: projectId, validator: validateProjectId }]);
    }

    // Sanitize inputs
    const cleanPath = sanitizePath(projectPath);
    const cleanName = sanitizeFilename(requirementName);

    log.info('Starting sync execution', { requirementName: cleanName, projectId });

    // Create snapshot before execution for context auto-update
    const beforeSnapshot = projectId ? createProjectSnapshot(cleanPath) : null;

    const result: ExecutionResult = await executeRequirement(cleanPath, cleanName);

    if (!result.success) {
      const { durationMs } = elapsed();
      log.warn('Sync execution failed', {
        requirementName: cleanName,
        projectId,
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
    if (projectId && beforeSnapshot) {
      contextUpdateResults = await performContextAutoUpdate(projectId, cleanPath, beforeSnapshot);
    }

    const { durationMs } = elapsed();
    log.info('Sync execution completed', { requirementName: cleanName, projectId, durationMs });

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
    log.warn('Sync execution error', { requirementName, durationMs, error });
    if (error instanceof ValidationError) {
      return createApiErrorResponse(ApiErrorCode.VALIDATION_ERROR, error.message, { logError: false });
    }
    return handleApiError(error, 'executeSync');
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
