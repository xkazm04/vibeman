import { NextRequest, NextResponse } from 'next/server';
import { projectDb } from '@/lib/project_database';
import { detectProjectTypeSync } from '@/lib/projectTypeDetector';
import type { ProjectType } from '@/types';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { validateRequestBody } from '@/lib/validation/apiValidator';
import {
  validateUUID,
  validateProjectPath,
  validateProjectName,
  validateProjectDescription,
  validateProjectTypeEnum,
  validatePort,
  validateRunScript,
  validateGitRepository,
  validateGitBranch,
  validateBooleanFlag,
} from '@/lib/validation/inputValidator';
import { sanitizeString, sanitizeId, sanitizePath } from '@/lib/validation/sanitizers';
import {
  createApiErrorResponse,
  handleApiError,
  ApiErrorCode,
} from '@/lib/api-errors';

/**
 * GET /api/manager
 * List all projects.
 */
async function handleGet() {
  try {
    const projects = projectDb.getAllProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    return handleApiError(error, 'GET /api/manager', ApiErrorCode.DATABASE_ERROR);
  }
}

/**
 * POST /api/manager
 * Create a new project with full input validation and sanitization.
 *
 * @example Valid request body:
 * ```json
 * {
 *   "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *   "name": "My Web App",
 *   "path": "C:/Users/dev/projects/my-web-app",
 *   "port": 3000,
 *   "type": "nextjs",
 *   "run_script": "npm run dev",
 *   "git_repository": "owner/repo",
 *   "git_branch": "main"
 * }
 * ```
 */
async function handlePost(request: NextRequest) {
  try {
    const result = await validateRequestBody(request, {
      required: [
        { field: 'id', validator: validateUUID },
        { field: 'name', validator: validateProjectName },
        { field: 'path', validator: validateProjectPath },
      ],
      optional: [
        { field: 'port', validator: validatePort },
        { field: 'type', validator: validateProjectTypeEnum },
        { field: 'workspace_id', validator: validateUUID },
        { field: 'description', validator: validateProjectDescription },
        { field: 'related_project_id', validator: validateUUID },
        { field: 'run_script', validator: validateRunScript },
        { field: 'git_repository', validator: validateGitRepository },
        { field: 'git_branch', validator: validateGitBranch },
        { field: 'allow_multiple_instances', validator: validateBooleanFlag },
        { field: 'base_port', validator: validatePort },
        { field: 'instance_of', validator: validateUUID },
      ],
    });

    if (!result.success) return result.error;

    const body = result.data;

    // Sanitize string inputs
    const sanitizedName = sanitizeString(body.name as string, 255);
    const sanitizedPath = sanitizePath(body.path as string);

    // Auto-detect project type if not provided
    let projectType: string = (body.type as string) || 'generic';
    if (!body.type) {
      try {
        projectType = detectProjectTypeSync(sanitizedPath);
      } catch {
        projectType = 'generic';
      }
    }

    const project = projectDb.createProject({
      id: sanitizeId(body.id as string),
      name: sanitizedName,
      path: sanitizedPath,
      port: body.port != null ? (body.port as number) : null,
      workspace_id: body.workspace_id ? sanitizeId(body.workspace_id as string) : null,
      type: projectType,
      related_project_id: body.related_project_id
        ? sanitizeId(body.related_project_id as string)
        : undefined,
      run_script: body.run_script
        ? sanitizeString(body.run_script as string, 500)
        : undefined,
      git_repository: body.git_repository
        ? sanitizeString(body.git_repository as string, 500)
        : undefined,
      git_branch: body.git_branch
        ? sanitizeString(body.git_branch as string, 255)
        : undefined,
      allow_multiple_instances: body.allow_multiple_instances === 1,
      base_port: body.base_port as number | undefined,
      instance_of: body.instance_of
        ? sanitizeId(body.instance_of as string)
        : undefined,
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violations from projectDb
    if (error instanceof Error && error.message.includes('already exists')) {
      return createApiErrorResponse(
        ApiErrorCode.RESOURCE_ALREADY_EXISTS,
        error.message,
        { logError: false },
      );
    }
    return handleApiError(error, 'POST /api/manager', ApiErrorCode.DATABASE_ERROR);
  }
}

/**
 * PUT /api/manager
 * Update an existing project.
 *
 * @example Valid request body:
 * ```json
 * {
 *   "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *   "name": "Updated App Name",
 *   "port": 3001,
 *   "type": "react"
 * }
 * ```
 */
async function handlePut(request: NextRequest) {
  try {
    const result = await validateRequestBody(request, {
      required: [
        { field: 'id', validator: validateUUID },
      ],
      optional: [
        { field: 'name', validator: validateProjectName },
        { field: 'path', validator: validateProjectPath },
        { field: 'port', validator: validatePort },
        { field: 'type', validator: validateProjectTypeEnum },
        { field: 'workspace_id', validator: validateUUID },
        { field: 'description', validator: validateProjectDescription },
        { field: 'related_project_id', validator: validateUUID },
        { field: 'run_script', validator: validateRunScript },
        { field: 'git_repository', validator: validateGitRepository },
        { field: 'git_branch', validator: validateGitBranch },
        { field: 'allow_multiple_instances', validator: validateBooleanFlag },
        { field: 'base_port', validator: validatePort },
      ],
    });

    if (!result.success) return result.error;

    const body = result.data;
    const projectId = sanitizeId(body.id as string);

    // Build sanitized updates
    const updates: Record<string, string | number | boolean | null | undefined> = {};
    if (body.name !== undefined) updates.name = sanitizeString(body.name as string, 255);
    if (body.path !== undefined) updates.path = sanitizePath(body.path as string);
    if (body.port !== undefined) updates.port = body.port as number;
    if (body.type !== undefined) updates.type = body.type as string;
    if (body.workspace_id !== undefined) updates.workspace_id = sanitizeId(body.workspace_id as string);
    if (body.related_project_id !== undefined) updates.related_project_id = sanitizeId(body.related_project_id as string);
    if (body.run_script !== undefined) updates.run_script = sanitizeString(body.run_script as string, 500);
    if (body.git_repository !== undefined) updates.git_repository = sanitizeString(body.git_repository as string, 500);
    if (body.git_branch !== undefined) updates.git_branch = sanitizeString(body.git_branch as string, 255);
    if (body.allow_multiple_instances !== undefined) updates.allow_multiple_instances = body.allow_multiple_instances === 1;
    if (body.base_port !== undefined) updates.base_port = body.base_port as number;

    const project = projectDb.updateProject(projectId, updates);

    if (!project) {
      return createApiErrorResponse(
        ApiErrorCode.RESOURCE_NOT_FOUND,
        `No project found with id: ${projectId}`,
        { logError: false },
      );
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return createApiErrorResponse(
        ApiErrorCode.RESOURCE_ALREADY_EXISTS,
        error.message,
        { logError: false },
      );
    }
    return handleApiError(error, 'PUT /api/manager', ApiErrorCode.DATABASE_ERROR);
  }
}

/**
 * DELETE /api/manager
 * Delete a project by ID.
 *
 * @example Valid request body:
 * ```json
 * { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
 * ```
 */
async function handleDelete(request: NextRequest) {
  try {
    const result = await validateRequestBody(request, {
      required: [
        { field: 'id', validator: validateUUID },
      ],
    });

    if (!result.success) return result.error;

    const projectId = sanitizeId(result.data.id as string);
    const deleted = projectDb.deleteProject(projectId);

    if (!deleted) {
      return createApiErrorResponse(
        ApiErrorCode.RESOURCE_NOT_FOUND,
        `No project found with id: ${projectId}`,
        { logError: false },
      );
    }

    logger.info('[DELETE /api/manager] Project deleted', { projectId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/manager', ApiErrorCode.DATABASE_ERROR);
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/manager');
export const POST = withObservability(handlePost, '/api/manager');
export const PUT = withObservability(handlePut, '/api/manager');
export const DELETE = withObservability(handleDelete, '/api/manager');
