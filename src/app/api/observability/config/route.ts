/**
 * API Route: Observability Config
 *
 * GET /api/observability/config?projectId=xxx
 * PUT /api/observability/config (update configuration)
 * POST /api/observability/config (create configuration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { observabilityRepository } from '@/app/db/repositories/observability.repository';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const config = observabilityRepository.getConfig(projectId);

    if (!config) {
      return NextResponse.json({
        success: true,
        config: null,
        message: 'No configuration found. Create one to enable observability.'
      });
    }

    return NextResponse.json({
      success: true,
      config
    });

  } catch (error) {
    logger.error('[API] Observability config GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { project_id, enabled, provider, sentry_dsn, sample_rate, endpoints_to_track } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Check if config already exists
    const existing = observabilityRepository.getConfig(project_id);
    if (existing) {
      return NextResponse.json(
        { error: 'Configuration already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    const config = observabilityRepository.createConfig({
      project_id,
      enabled,
      provider,
      sentry_dsn,
      sample_rate,
      endpoints_to_track
    });

    logger.info('[API] Created observability config', { projectId: project_id });

    return NextResponse.json({
      success: true,
      config
    }, { status: 201 });

  } catch (error) {
    logger.error('[API] Observability config POST error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const { project_id, enabled, provider, sentry_dsn, sample_rate, endpoints_to_track } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Check if config exists
    const existing = observabilityRepository.getConfig(project_id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Configuration not found. Use POST to create.' },
        { status: 404 }
      );
    }

    // Validate Sentry DSN if switching to Sentry provider
    if (provider === 'sentry' && !sentry_dsn && !existing.sentry_dsn) {
      return NextResponse.json(
        { error: 'sentry_dsn is required when using Sentry provider' },
        { status: 400 }
      );
    }

    const config = observabilityRepository.updateConfig(project_id, {
      enabled,
      provider,
      sentry_dsn,
      sample_rate,
      endpoints_to_track
    });

    logger.info('[API] Updated observability config', { projectId: project_id });

    return NextResponse.json({
      success: true,
      config
    });

  } catch (error) {
    logger.error('[API] Observability config PUT error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const deleted = observabilityRepository.deleteConfig(projectId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    logger.info('[API] Deleted observability config and data', { projectId });

    return NextResponse.json({
      success: true,
      message: 'Configuration and all related data deleted'
    });

  } catch (error) {
    logger.error('[API] Observability config DELETE error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
