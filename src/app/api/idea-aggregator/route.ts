import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import {
  checkAggregation,
  aggregateFiles,
  aggregateAllRoles,
  type AggregatableRole,
  type AggregationCheckResult,
} from '@/app/features/TaskRunner/lib/ideaAggregator';
import { logger } from '@/lib/logger';

/**
 * GET - Check if aggregation is possible for a project
 * Query params:
 *   - projectPath: Path to the project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    const commandsPath = path.join(projectPath, '.claude', 'commands');
    const result: AggregationCheckResult = checkAggregation(commandsPath);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error checking aggregation:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Execute aggregation
 * Body:
 *   - projectPath: Path to the project
 *   - role: Optional - specific role to aggregate (if not provided, aggregates all eligible roles)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, role } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
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
  } catch (error) {
    logger.error('Error executing aggregation:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
