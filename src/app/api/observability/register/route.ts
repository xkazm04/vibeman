/**
 * API Route: Observability Register
 *
 * POST /api/observability/register
 * Receives API call data from external projects
 * Also handles project registration confirmation after onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { observabilityDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { project_id, status, ...callData } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // If this is a status update (onboarding confirmation)
    if (status === 'onboarded') {
      let config = observabilityDb.getConfig(project_id);

      if (!config) {
        // Create config if it doesn't exist
        config = observabilityDb.createConfig({
          project_id,
          enabled: true,
          provider: 'local'
        });
      } else {
        // Enable observability
        observabilityDb.updateConfig(project_id, { enabled: true });
      }

      logger.info('[API] Project onboarding confirmed', { projectId: project_id });

      return NextResponse.json({
        success: true,
        message: 'Project onboarding confirmed. Observability is now enabled.'
      });
    }

    // Otherwise, this is an API call log
    const { endpoint, method, status_code, response_time_ms, request_size_bytes, response_size_bytes, user_agent, error_message, called_at } = callData;

    if (!endpoint || !method) {
      return NextResponse.json(
        { error: 'endpoint and method are required for API call logging' },
        { status: 400 }
      );
    }

    // Check if observability is enabled for this project
    const config = observabilityDb.getConfig(project_id);
    if (!config?.enabled) {
      // Silently accept but don't store if not enabled
      return NextResponse.json({
        success: true,
        stored: false,
        message: 'Observability not enabled for this project'
      });
    }

    // Apply sampling
    if (config.sample_rate < 1.0 && Math.random() > config.sample_rate) {
      return NextResponse.json({
        success: true,
        stored: false,
        message: 'Sampled out'
      });
    }

    // Check endpoint filter
    if (config.endpoints_to_track) {
      const trackedEndpoints = config.endpoints_to_track;
      const shouldTrack = trackedEndpoints.some(pattern => {
        // Simple glob matching
        if (pattern.endsWith('*')) {
          return endpoint.startsWith(pattern.slice(0, -1));
        }
        return endpoint === pattern;
      });

      if (!shouldTrack) {
        return NextResponse.json({
          success: true,
          stored: false,
          message: 'Endpoint not in tracking list'
        });
      }
    }

    // Log the API call
    const apiCall = observabilityDb.logApiCall({
      project_id,
      endpoint,
      method: method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      status_code,
      response_time_ms,
      request_size_bytes,
      response_size_bytes,
      user_agent,
      error_message,
      called_at
    });

    // Periodically aggregate stats (every 100 calls roughly)
    if (Math.random() < 0.01) {
      try {
        observabilityDb.aggregateHourlyStats(project_id);
      } catch (e) {
        // Don't fail the request if aggregation fails
        logger.error('[API] Failed to aggregate stats', { error: e });
      }
    }

    return NextResponse.json({
      success: true,
      stored: true,
      id: apiCall.id
    });

  } catch (error) {
    logger.error('[API] Observability register POST error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/observability/register?projectId=xxx
 * Check if a project is registered and its configuration
 */
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

    const config = observabilityDb.getConfig(projectId);
    const hasData = observabilityDb.hasData(projectId);

    return NextResponse.json({
      success: true,
      registered: !!config,
      enabled: config?.enabled || false,
      hasData,
      config
    });

  } catch (error) {
    logger.error('[API] Observability register GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
