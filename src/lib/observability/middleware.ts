/**
 * API Observability Middleware for Vibeman
 * Automatically tracks API route usage metrics with X-Ray context mapping
 * and structured console logging for debugging and auditing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { observabilityDb, xrayDb } from '@/app/db';
import { mapPathToContext, determineSourceLayer, type ContextMapping } from './contextMapper';
import { logger } from '@/lib/logger';
import { env } from '@/lib/config/envConfig';

const log = logger.child('obs');

const OBSERVABILITY_ENABLED = env.observabilityEnabled();
// Use actual Vibeman project ID from the database for dashboard integration
const VIBEMAN_PROJECT_ID = env.vibemanProjectId();

// Endpoints to exclude from tracking (health checks, status endpoints, etc.)
// These typically have high frequency but low business value
const EXCLUDED_ENDPOINTS = [
  '/api/health',
  '/api/status',
  '/api/ping',
  '/api/ready',
  '/api/live',
  '/api/observability', // Don't track observability calls themselves
];

/**
 * Check if endpoint should be excluded from tracking
 */
function shouldExcludeEndpoint(endpoint: string): boolean {
  return EXCLUDED_ENDPOINTS.some(excluded =>
    endpoint === excluded || endpoint.startsWith(excluded + '/')
  );
}

/**
 * Middleware wrapper that tracks API call metrics and adds structured logging.
 * Logs request start, completion with duration, and errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withObservability<T extends (request: NextRequest, ...args: any[]) => Promise<NextResponse<any>>>(
  handler: T,
  endpoint: string
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (request: NextRequest, ...args: any[]) => {
    // Skip if disabled or endpoint is excluded
    if (!OBSERVABILITY_ENABLED || shouldExcludeEndpoint(endpoint)) {
      return handler(request, ...args);
    }

    const elapsed = logger.startTimer();
    const method = request.method;
    let response: NextResponse;
    let errorMessage: string | undefined;

    log.debug('Request started', { method, endpoint });

    // Perform context lookup for X-Ray visualization
    const contextMapping = mapPathToContext(endpoint);
    const sourceLayer = determineSourceLayer(request);

    try {
      response = await handler(request, ...args);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const { durationMs } = elapsed();
      log.error('Request failed with unhandled error', {
        method,
        endpoint,
        error: errorMessage,
        durationMs,
      });
      response = NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const { durationMs } = elapsed();
    const requestSize = parseInt(request.headers.get('content-length') || '0');

    if (response.status >= 400) {
      log.warn('Request completed with error status', {
        method,
        endpoint,
        status: response.status,
        durationMs,
        error: errorMessage,
      });
    } else {
      log.debug('Request completed', {
        method,
        endpoint,
        status: response.status,
        durationMs,
      });
    }

    // Log to database asynchronously with X-Ray context (don't block response)
    logApiCall({
      endpoint,
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      status_code: response.status,
      response_time_ms: durationMs,
      request_size_bytes: requestSize,
      user_agent: request.headers.get('user-agent') || undefined,
      error_message: errorMessage,
      sourceLayer,
      contextMapping,
    });

    return response;
  }) as T;
}

/**
 * Log API call to database with X-Ray event (fire and forget)
 */
function logApiCall(data: {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status_code: number;
  response_time_ms: number;
  request_size_bytes?: number;
  user_agent?: string;
  error_message?: string;
  sourceLayer?: 'pages' | 'client' | 'server' | null;
  contextMapping?: ContextMapping | null;
}): void {
  // Use setImmediate to not block the response
  setImmediate(() => {
    try {
      // Log to obs_api_calls table
      const apiCall = observabilityDb.logApiCall({
        project_id: VIBEMAN_PROJECT_ID,
        endpoint: data.endpoint,
        method: data.method,
        status_code: data.status_code,
        response_time_ms: data.response_time_ms,
        request_size_bytes: data.request_size_bytes,
        user_agent: data.user_agent,
        error_message: data.error_message,
      });

      // Log X-Ray event with context mapping
      if (apiCall) {
        try {
          // Map context layer to target layer (pages/client are source layers, not targets)
          const targetLayer = data.contextMapping?.layer === 'external' ? 'external' : 'server';

          xrayDb.logEvent({
            api_call_id: null, // obs_api_calls lives in hot-writes DB; FK can't resolve cross-database
            context_id: data.contextMapping?.contextId || null,
            context_group_id: data.contextMapping?.contextGroupId || null,
            source_layer: data.sourceLayer || null,
            target_layer: targetLayer,
            method: data.method,
            path: data.endpoint,
            status: data.status_code,
            duration: data.response_time_ms,
            timestamp: Date.now(),
          });
        } catch (xrayError) {
          log.error('Failed to log X-Ray event', { error: xrayError });
        }
      }
    } catch (error) {
      // Don't break the app for observability failures
      log.error('Failed to log API call', { error });
    }
  });
}

/**
 * Express-style middleware for automatic tracking (alternative approach)
 * Can be used in middleware.ts for global tracking
 */
export function createObservabilityMiddleware() {
  return async function observabilityMiddleware(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const endpoint = new URL(request.url).pathname;

    // Skip if disabled or endpoint is excluded
    if (!OBSERVABILITY_ENABLED || shouldExcludeEndpoint(endpoint)) {
      return next();
    }

    const elapsed = logger.startTimer();
    const method = request.method;

    log.debug('Request started', { method, endpoint });

    // Perform context lookup for X-Ray visualization
    const contextMapping = mapPathToContext(endpoint);
    const sourceLayer = determineSourceLayer(request);

    let response: NextResponse;
    let errorMessage: string | undefined;

    try {
      response = await next();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const { durationMs } = elapsed();
      log.error('Request failed with unhandled error', {
        method,
        endpoint,
        error: errorMessage,
        durationMs,
      });
      throw error;
    }

    const { durationMs } = elapsed();

    if (response.status >= 400) {
      log.warn('Request completed with error status', {
        method,
        endpoint,
        status: response.status,
        durationMs,
      });
    } else {
      log.debug('Request completed', {
        method,
        endpoint,
        status: response.status,
        durationMs,
      });
    }

    logApiCall({
      endpoint,
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      status_code: response.status,
      response_time_ms: durationMs,
      request_size_bytes: parseInt(request.headers.get('content-length') || '0'),
      user_agent: request.headers.get('user-agent') || undefined,
      error_message: errorMessage,
      sourceLayer,
      contextMapping,
    });

    return response;
  };
}

/**
 * Get Vibeman's project ID for observability
 */
export function getVibemanProjectId(): string {
  return VIBEMAN_PROJECT_ID;
}
