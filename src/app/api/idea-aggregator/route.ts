import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import {
  checkAggregation,
  aggregateFiles,
  aggregateAllRoles,
  type AggregatableRole,
  type AggregationCheckResult,
} from '@/app/features/TaskRunner/lib/ideaAggregator';
import {
  IdeasErrorCode,
  createMissingFieldError,
  withIdeasErrorHandler,
} from '@/app/features/Ideas/lib/ideasHandlers';

/**
 * GET - Check if aggregation is possible for a project
 * Query params:
 *   - projectPath: Path to the project
 */
async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get('projectPath');

  if (!projectPath) {
    return createMissingFieldError('projectPath');
  }

  const commandsPath = path.join(projectPath, '.claude', 'commands');
  const result: AggregationCheckResult = checkAggregation(commandsPath);

  return NextResponse.json({
    success: true,
    ...result,
  });
}

/**
 * POST - Execute aggregation
 * Body:
 *   - projectPath: Path to the project
 *   - role: Optional - specific role to aggregate (if not provided, aggregates all eligible roles)
 */
async function handlePost(request: NextRequest) {
  const body = await request.json();
  const { projectPath, role } = body;

  if (!projectPath) {
    return createMissingFieldError('projectPath');
  }

  const commandsPath = path.join(projectPath, '.claude', 'commands');

  // If a specific role is provided, aggregate only that role
  if (role) {
    const result = aggregateFiles(commandsPath, role as AggregatableRole);
    return NextResponse.json({
      success: result.success,
      results: [result],
      error: result.error,
    });
  }

  // Otherwise, aggregate all eligible roles
  const results = aggregateAllRoles(commandsPath);
  const allSuccess = results.every(r => r.success);
  const errors = results.filter(r => !r.success).map(r => r.error);

  return NextResponse.json({
    success: allSuccess,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export const GET = withIdeasErrorHandler(handleGet, IdeasErrorCode.INTERNAL_ERROR);
export const POST = withIdeasErrorHandler(handlePost, IdeasErrorCode.FILE_OPERATION_FAILED);
