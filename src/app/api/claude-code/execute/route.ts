import { NextRequest } from 'next/server';
import {
  validateRequiredFields,
  handleApiError,
  ApiErrorCode,
  createApiErrorResponse,
} from '@/lib/api-errors';
import { queueExecution, executeSync } from '../executionHandlers';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';

/**
 * POST /api/claude-code/execute - Execute a requirement
 *
 * RESTful endpoint for requirement execution.
 * Supports both sync and async modes via query param or body.
 *
 * Body:
 * - projectPath: string (required)
 * - requirementName: string (required)
 * - projectId?: string
 * - async?: boolean (default: true for async/queued execution)
 * - gitConfig?: { enabled: boolean, commands: string[], commitMessage: string }
 * - sessionConfig?: { sessionId?: string, claudeSessionId?: string }
 */
async function handlePost(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return createApiErrorResponse(
        ApiErrorCode.INVALID_FORMAT,
        'Request body must be valid JSON',
        { logError: false }
      );
    }

    const {
      projectPath,
      requirementName,
      projectId,
      async: asyncMode = true,
      gitConfig,
      sessionConfig
    } = body;

    // Check required fields are present before deeper validation in handlers
    const missingError = validateRequiredFields(
      { projectPath, requirementName },
      ['projectPath', 'requirementName']
    );
    if (missingError) return missingError;

    // Default to async mode (queued execution)
    if (asyncMode) {
      return queueExecution(
        projectPath as string,
        requirementName as string,
        projectId as string | undefined,
        gitConfig as Parameters<typeof queueExecution>[3],
        sessionConfig as Parameters<typeof queueExecution>[4]
      );
    }

    // Synchronous execution (blocking)
    return executeSync(
      projectPath as string,
      requirementName as string,
      projectId as string | undefined
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/claude-code/execute');
  }
}

export const POST = withObservability(withRateLimit(handlePost, '/api/claude-code/execute', 'expensive'), '/api/claude-code/execute');
