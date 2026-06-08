/**
 * API Route: Observability Register
 *
 * POST /api/observability/register
 * Receives API call data from external projects
 * Also handles project registration confirmation after onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { observabilityRepository } from '@/app/db/repositories/observability.repository';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { project_id, status, batch, ...callData } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // If this is a status update (onboarding confirmation)
    if (status === 'onboarded') {
      let config = observabilityRepository.getConfig(project_id);

      if (!config) {
        // Create config if it doesn't exist
        config = observabilityRepository.createConfig({
          project_id,
          enabled: true,
          provider: 'local'
        });
      } else {
        // Enable observability
        observabilityRepository.updateConfig(project_id, { enabled: true });
      }

      logger.info('[API] Project onboarding confirmed', { projectId: project_id });

      return NextResponse.json({
        success: true,
        message: 'Project onboarding confirmed. Observability is now enabled.'
      });
    }

    // Handle batch of API call logs
    if (Array.isArray(batch)) {
      return handleBatch(project_id, batch);
    }

    // Otherwise, this is a single API call log
    return handleSingleCall(project_id, callData);

  } catch (error) {
    logger.error('[API] Observability register POST error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function shouldTrackCall(
  config: { sample_rate: number; endpoints_to_track: string[] | null },
  endpoint: string
): boolean {
  // Apply sampling
  const sampleRate = typeof config.sample_rate === 'number' && Number.isFinite(config.sample_rate)
    ? Math.max(0, Math.min(1, config.sample_rate))
    : 1.0;
  if (sampleRate < 1.0 && Math.random() > sampleRate) {
    return false;
  }

  // Check endpoint filter
  if (config.endpoints_to_track) {
    return config.endpoints_to_track.some(pattern => {
      if (pattern.endsWith('*')) {
        return endpoint.startsWith(pattern.slice(0, -1));
      }
      return endpoint === pattern;
    });
  }

  return true;
}

function handleSingleCall(project_id: string, callData: Record<string, unknown>) {
  const { endpoint, method, status_code, response_time_ms, request_size_bytes, response_size_bytes, user_agent, error_message, called_at } = callData;

  if (!endpoint || !method) {
    return NextResponse.json(
      { error: 'endpoint and method are required for API call logging' },
      { status: 400 }
    );
  }

  const config = observabilityRepository.getConfig(project_id);
  if (!config?.enabled) {
    return NextResponse.json({
      success: true,
      stored: false,
      message: 'Observability not enabled for this project'
    });
  }

  if (!shouldTrackCall(config, endpoint as string)) {
    return NextResponse.json({
      success: true,
      stored: false,
      message: 'Filtered out by sampling or endpoint filter'
    });
  }

  const apiCall = observabilityRepository.logApiCall({
    project_id,
    endpoint: endpoint as string,
    method: (method as string).toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    status_code: status_code as number | undefined,
    response_time_ms: response_time_ms as number | undefined,
    request_size_bytes: request_size_bytes as number | undefined,
    response_size_bytes: response_size_bytes as number | undefined,
    user_agent: user_agent as string | undefined,
    error_message: error_message as string | undefined,
    called_at: called_at as string | undefined
  });

  triggerAggregation(project_id);

  return NextResponse.json({
    success: true,
    stored: true,
    id: apiCall.id
  });
}

function handleBatch(project_id: string, batch: Record<string, unknown>[]) {
  const config = observabilityRepository.getConfig(project_id);
  if (!config?.enabled) {
    return NextResponse.json({
      success: true,
      stored: 0,
      total: batch.length,
      message: 'Observability not enabled for this project'
    });
  }

  let stored = 0;
  const errors: string[] = [];

  for (const item of batch) {
    const { endpoint, method, status_code, response_time_ms, request_size_bytes, response_size_bytes, user_agent, error_message, called_at } = item;

    if (!endpoint || !method) {
      errors.push(`Skipped item: missing endpoint or method`);
      continue;
    }

    if (!shouldTrackCall(config, endpoint as string)) {
      continue;
    }

    try {
      observabilityRepository.logApiCall({
        project_id,
        endpoint: endpoint as string,
        method: (method as string).toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        status_code: status_code as number | undefined,
        response_time_ms: response_time_ms as number | undefined,
        request_size_bytes: request_size_bytes as number | undefined,
        response_size_bytes: response_size_bytes as number | undefined,
        user_agent: user_agent as string | undefined,
        error_message: error_message as string | undefined,
        called_at: called_at as string | undefined
      });
      stored++;
    } catch (e) {
      errors.push(`Failed to log call to ${endpoint}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  triggerAggregation(project_id);

  return NextResponse.json({
    success: true,
    stored,
    total: batch.length,
    ...(errors.length > 0 ? { errors } : {})
  });
}

function triggerAggregation(project_id: string) {
  if (Math.random() < 0.01) {
    try {
      observabilityRepository.aggregateHourlyStats(project_id);
    } catch (e) {
      logger.error('[API] Failed to aggregate stats', { error: e });
    }
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

    const config = observabilityRepository.getConfig(projectId);
    const hasData = observabilityRepository.hasData(projectId);

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
