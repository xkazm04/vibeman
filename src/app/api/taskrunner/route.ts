import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { validateRequestBody } from '@/lib/validation/apiValidator';
import {
  validateUUID,
  validateProjectPath,
  validateRequirementName,
  validateProjectId,
  validateOptionalString,
} from '@/lib/validation/inputValidator';
import { sanitizePath, sanitizeFilename, sanitizeId, sanitizeShellArg } from '@/lib/validation/sanitizers';
import {
  createApiErrorResponse,
  handleApiError,
  ApiErrorCode,
  extractRequestContext,
} from '@/lib/api-errors';

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
  if (cfg.commands.length > 20) {
    return 'gitConfig.commands must have 20 or fewer entries';
  }
  if (typeof cfg.commitMessage !== 'string' || cfg.commitMessage.trim().length === 0) {
    return 'gitConfig.commitMessage must be a non-empty string';
  }
  if (cfg.commitMessage.length > 1000) {
    return 'gitConfig.commitMessage must be 1000 characters or fewer';
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
 * GET /api/taskrunner
 * List execution tasks, optionally filtered by project.
 *
 * Query params:
 * - projectPath?: string (filter by project path)
 * - projectId?: string (filter by project ID)
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const projectId = searchParams.get('projectId');

    // Validate query params when provided
    if (projectId) {
      const idError = validateUUID(projectId);
      if (idError) {
        return createApiErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          `projectId ${idError}`,
          { fieldErrors: { projectId: idError }, logError: false },
        );
      }
    }

    const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');

    const tasks = projectPath
      ? executionQueue.getProjectTasks(sanitizePath(projectPath))
      : projectId
        ? executionQueue.getTasksByProjectId(sanitizeId(projectId))
        : executionQueue.getAllTasks();

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error, 'GET /api/taskrunner', ApiErrorCode.INTERNAL_ERROR);
  }
}

/**
 * POST /api/taskrunner
 * Queue a requirement for execution with full input validation and sanitization.
 *
 * @example Valid request body:
 * ```json
 * {
 *   "projectPath": "C:/Users/dev/projects/my-app",
 *   "requirementName": "add-auth-flow",
 *   "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *   "async": true,
 *   "gitConfig": {
 *     "enabled": true,
 *     "commands": ["git add .", "git commit -m \"{commitMessage}\""],
 *     "commitMessage": "feat: add authentication flow"
 *   },
 *   "sessionConfig": {
 *     "sessionId": "session-123"
 *   }
 * }
 * ```
 */
async function handlePost(request: NextRequest) {
  try {
    const result = await validateRequestBody(request, {
      required: [
        { field: 'projectPath', validator: validateProjectPath },
        { field: 'requirementName', validator: validateRequirementName },
      ],
      optional: [
        { field: 'projectId', validator: validateProjectId },
        { field: 'content', validator: validateOptionalString(50000, 'content') },
      ],
      custom: [
        (body) => validateGitConfig(body.gitConfig),
        (body) => validateSessionConfig(body.sessionConfig),
      ],
    });

    if (!result.success) return result.error;

    const body = result.data;
    const reqCtx = extractRequestContext(request);

    // Sanitize all inputs before passing downstream
    const cleanPath = sanitizePath(body.projectPath as string);
    const cleanName = sanitizeFilename(body.requirementName as string);
    const cleanProjectId = body.projectId ? sanitizeId(body.projectId as string) : undefined;

    const gitConfig = body.gitConfig as Record<string, unknown> | undefined;
    const cleanGitConfig = gitConfig ? {
      enabled: gitConfig.enabled as boolean,
      commands: (gitConfig.commands as string[]).map(cmd => sanitizeShellArg(cmd)),
      commitMessage: sanitizeShellArg(gitConfig.commitMessage as string),
    } : undefined;

    const sessionConfig = body.sessionConfig as Record<string, unknown> | undefined;
    const cleanSessionConfig = sessionConfig ? {
      sessionId: sessionConfig.sessionId ? sanitizeId(sessionConfig.sessionId as string) : undefined,
      claudeSessionId: sessionConfig.claudeSessionId ? sanitizeId(sessionConfig.claudeSessionId as string) : undefined,
    } : undefined;

    const asyncMode = body.async !== false; // Default to async

    if (asyncMode) {
      const { queueExecution } = await import('../claude-code/executionHandlers');
      return queueExecution(
        cleanPath,
        cleanName,
        cleanProjectId,
        cleanGitConfig as Parameters<typeof queueExecution>[3],
        cleanSessionConfig as Parameters<typeof queueExecution>[4],
        reqCtx,
      );
    }

    // Synchronous execution
    const { executeSync } = await import('../claude-code/executionHandlers');
    return executeSync(cleanPath, cleanName, cleanProjectId, reqCtx);
  } catch (error) {
    return handleApiError(
      error,
      'POST /api/taskrunner',
      ApiErrorCode.INTERNAL_ERROR,
      extractRequestContext(request),
    );
  }
}

/**
 * DELETE /api/taskrunner
 * Clear old completed tasks.
 *
 * Query params:
 * - clearOld=true: Clear all old completed tasks (default behaviour)
 */
async function handleDelete() {
  try {
    const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
    executionQueue.clearOldTasks();
    return NextResponse.json({ success: true, message: 'Old tasks cleared' });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/taskrunner', ApiErrorCode.INTERNAL_ERROR);
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/taskrunner');
export const POST = withObservability(handlePost, '/api/taskrunner');
export const DELETE = withObservability(handleDelete, '/api/taskrunner');
