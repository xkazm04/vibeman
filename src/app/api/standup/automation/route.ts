/**
 * Standup Automation API
 * Endpoints for controlling the automation scheduler
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  startAutomation,
  stopAutomation,
  getAutomationStatus,
  getAutomationConfig,
  updateAutomationConfig,
  getAutomationHistory,
  StandupAutomationConfig,
} from '@/lib/standupAutomation';

/**
 * GET /api/standup/automation
 * Get current automation status and config
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const historyLimit = parseInt(searchParams.get('historyLimit') || '10', 10);

    const status = getAutomationStatus();
    const config = getAutomationConfig();

    const response: Record<string, any> = {
      success: true,
      status,
      config,
    };

    if (includeHistory) {
      response.history = getAutomationHistory(historyLimit);
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Automation API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get automation status',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/standup/automation
 * Start the automation scheduler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = body.config as Partial<StandupAutomationConfig> | undefined;

    const started = startAutomation(config);

    if (!started) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation is already running',
        },
        { status: 400 }
      );
    }

    const status = getAutomationStatus();

    logger.info('[Automation API] Automation started');

    return NextResponse.json({
      success: true,
      message: 'Automation started',
      status,
    });
  } catch (error) {
    logger.error('[Automation API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start automation',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/standup/automation
 * Stop the automation scheduler
 */
export async function DELETE() {
  try {
    const stopped = stopAutomation();

    if (!stopped) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation is not running',
        },
        { status: 400 }
      );
    }

    logger.info('[Automation API] Automation stopped');

    return NextResponse.json({
      success: true,
      message: 'Automation stopped',
    });
  } catch (error) {
    logger.error('[Automation API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop automation',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/standup/automation
 * Update automation configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = body as Partial<StandupAutomationConfig>;

    const newConfig = updateAutomationConfig(updates);

    logger.info('[Automation API] Config updated');

    return NextResponse.json({
      success: true,
      config: newConfig,
    });
  } catch (error) {
    logger.error('[Automation API] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update config',
      },
      { status: 500 }
    );
  }
}
