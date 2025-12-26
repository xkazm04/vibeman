/**
 * Standup Automation Run API
 * Trigger an immediate automation cycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  runProjectCycle,
  runAllProjectsCycle,
  ModesOverride,
} from '@/lib/standupAutomation';

/**
 * POST /api/standup/automation/run
 * Trigger an immediate automation cycle
 *
 * Body:
 * - projectId?: string - Run for a specific project (optional)
 * - modes?: ModesOverride - Override which modes to run (optional)
 *   - evaluateGoals?: boolean
 *   - updateStatuses?: boolean
 *   - generateGoals?: boolean
 *   - createAnalysisTasks?: boolean
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { projectId, modes } = body as {
      projectId?: string;
      modes?: ModesOverride;
    };

    logger.info('[Automation Run API] Manual trigger', {
      projectId,
      modes,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    });

    let results;

    if (projectId) {
      // Run for specific project
      const result = await runProjectCycle(projectId, modes);
      results = [result];
    } else {
      // Run for all projects
      results = await runAllProjectsCycle(modes);
    }

    // Aggregate results for response
    const summary = {
      projectsProcessed: results.length,
      goalsEvaluated: results.reduce((sum, r) => sum + r.goalsEvaluated, 0),
      statusesUpdated: results.reduce((sum, r) => sum + r.statusesUpdated.length, 0),
      goalsGenerated: results.reduce((sum, r) => sum + r.goalsGenerated.length, 0),
      tasksCreated: results.reduce((sum, r) => sum + r.tasksCreated.length, 0),
      errors: results.reduce((sum, r) => sum + r.errors.length, 0),
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      tokensUsed: {
        input: results.reduce((sum, r) => sum + r.tokensUsed.input, 0),
        output: results.reduce((sum, r) => sum + r.tokensUsed.output, 0),
      },
    };

    logger.info('[Automation Run API] Cycle complete', summary);

    // Include debug info in response for troubleshooting
    const debug = {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      modesRequested: modes,
      projectsWithErrors: results.filter(r => r.errors.length > 0).map(r => ({
        project: r.projectName,
        errors: r.errors,
      })),
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
      debug,
    });
  } catch (error) {
    logger.error('[Automation Run API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run automation',
      },
      { status: 500 }
    );
  }
}
