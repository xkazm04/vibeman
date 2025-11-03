import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { BuildFixerResult } from './route';

/**
 * Creates a build fixer response with consistent structure
 */
export function createBuildFixerResponse(
  data: Partial<BuildFixerResult>,
  startTime: number,
  status = 200
): NextResponse<BuildFixerResult> {
  const response: BuildFixerResult = {
    success: data.success ?? false,
    totalErrors: data.totalErrors ?? 0,
    totalWarnings: data.totalWarnings ?? 0,
    requirementFiles: data.requirementFiles ?? [],
    buildCommand: data.buildCommand ?? '',
    executionTime: Date.now() - startTime,
    error: data.error,
  };

  return NextResponse.json(response, { status });
}

/**
 * Validates that a project path is provided
 */
export function validateProjectPath(projectPath: unknown): NextResponse | null {
  if (!projectPath) {
    logger.warn('Build fixer request missing project path');
    return NextResponse.json(
      { error: 'Project path is required' },
      { status: 400 }
    );
  }
  return null;
}
