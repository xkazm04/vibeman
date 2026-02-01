import { NextRequest, NextResponse } from 'next/server';
import { validateRequired, errorResponse } from '../helpers';
import { queueExecution, executeSync } from '../executionHandlers';
import { withObservability } from '@/lib/observability/middleware';

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
    const body = await request.json();
    const {
      projectPath,
      requirementName,
      projectId,
      async: asyncMode = true,
      gitConfig,
      sessionConfig
    } = body;

    const validationError = validateRequired(
      { projectPath, requirementName },
      ['projectPath', 'requirementName']
    );
    if (validationError) return validationError;

    // Default to async mode (queued execution)
    if (asyncMode) {
      return queueExecution(projectPath, requirementName, projectId, gitConfig, sessionConfig);
    }

    // Synchronous execution (blocking)
    return executeSync(projectPath, requirementName, projectId);
  } catch (error) {
    return errorResponse(error, 'Error in POST /api/claude-code/execute');
  }
}

export const POST = withObservability(handlePost, '/api/claude-code/execute');
