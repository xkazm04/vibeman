/**
 * Lifecycle API - Main endpoint
 * GET: Get lifecycle status
 * POST: Control lifecycle (start, stop, trigger)
 */

import { NextRequest, NextResponse } from 'next/server';
import { lifecycleOrchestrator } from '@/app/features/Ideas/sub_Lifecycle/lib/lifecycleOrchestrator';
import { LifecycleTrigger, LifecycleConfig } from '@/app/features/Ideas/sub_Lifecycle/lib/lifecycleTypes';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const includeEvents = searchParams.get('includeEvents') === 'true';
    const eventLimit = parseInt(searchParams.get('eventLimit') || '50', 10);

    const status = lifecycleOrchestrator.getStatus();
    const currentCycle = lifecycleOrchestrator.getCurrentCycle();
    const config = lifecycleOrchestrator.getConfig();

    const response: Record<string, unknown> = {
      status,
      currentCycle,
      config,
    };

    if (includeHistory) {
      response.cycleHistory = lifecycleOrchestrator.getCycleHistory();
    }

    if (includeEvents) {
      response.events = lifecycleOrchestrator.getEventHistory(eventLimit);
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error getting lifecycle status:', { error });
    return NextResponse.json(
      { error: 'Failed to get lifecycle status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, trigger, triggerMetadata, config } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (start, stop, trigger, configure, initialize)' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'initialize':
        if (!projectId) {
          return NextResponse.json(
            { error: 'projectId is required for initialize action' },
            { status: 400 }
          );
        }
        await lifecycleOrchestrator.initialize(projectId, config as Partial<LifecycleConfig>);
        return NextResponse.json({
          success: true,
          message: 'Lifecycle orchestrator initialized',
          config: lifecycleOrchestrator.getConfig(),
        });

      case 'start':
        lifecycleOrchestrator.start();
        return NextResponse.json({
          success: true,
          message: 'Lifecycle orchestrator started',
          status: lifecycleOrchestrator.getStatus(),
        });

      case 'stop':
        lifecycleOrchestrator.stop();
        return NextResponse.json({
          success: true,
          message: 'Lifecycle orchestrator stopped',
          status: lifecycleOrchestrator.getStatus(),
        });

      case 'trigger':
        if (!trigger) {
          return NextResponse.json(
            { error: 'trigger is required for trigger action' },
            { status: 400 }
          );
        }

        const validTriggers: LifecycleTrigger[] = [
          'code_change', 'git_push', 'git_commit', 'scheduled', 'manual', 'scan_complete', 'idea_implemented'
        ];

        if (!validTriggers.includes(trigger)) {
          return NextResponse.json(
            { error: `Invalid trigger: ${trigger}. Valid triggers: ${validTriggers.join(', ')}` },
            { status: 400 }
          );
        }

        const cycle = await lifecycleOrchestrator.triggerCycle(
          trigger as LifecycleTrigger,
          triggerMetadata
        );

        return NextResponse.json({
          success: true,
          message: 'Lifecycle cycle triggered',
          cycle,
        });

      case 'configure':
        if (!config) {
          return NextResponse.json(
            { error: 'config is required for configure action' },
            { status: 400 }
          );
        }
        lifecycleOrchestrator.updateConfig(config as Partial<LifecycleConfig>);
        return NextResponse.json({
          success: true,
          message: 'Lifecycle configuration updated',
          config: lifecycleOrchestrator.getConfig(),
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be initialize, start, stop, trigger, or configure' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error controlling lifecycle:', { error });
    return NextResponse.json(
      { error: 'Failed to control lifecycle', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
