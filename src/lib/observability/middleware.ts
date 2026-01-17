/**
 * API Observability Middleware for Vibeman
 * Automatically tracks API route usage metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { observabilityDb } from '@/app/db';

const OBSERVABILITY_ENABLED = process.env.OBSERVABILITY_ENABLED !== 'false'; // Enabled by default for Vibeman
const VIBEMAN_PROJECT_ID = 'vibeman-local'; // Vibeman's own project ID

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
 * Middleware wrapper that tracks API call metrics
 */
/**
 * Check if endpoint should be excluded from tracking
 */
function shouldExcludeEndpoint(endpoint: string): boolean {
  return EXCLUDED_ENDPOINTS.some(excluded =>
    endpoint === excluded || endpoint.startsWith(excluded + '/')
  );
}

export function withObservability<T extends (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  endpoint: string
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    // Skip if disabled or endpoint is excluded
    if (!OBSERVABILITY_ENABLED || shouldExcludeEndpoint(endpoint)) {
      return handler(request, ...args);
    }

    const startTime = Date.now();
    let response: NextResponse;
    let errorMessage: string | undefined;

    try {
      response = await handler(request, ...args);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      response = NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;
    const requestSize = parseInt(request.headers.get('content-length') || '0');

    // Log to database asynchronously (don't block response)
    logApiCall({
      endpoint,
      method: request.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      status_code: response.status,
      response_time_ms: responseTime,
      request_size_bytes: requestSize,
      user_agent: request.headers.get('user-agent') || undefined,
      error_message: errorMessage
    });

    return response;
  }) as T;
}

/**
 * Log API call to database (fire and forget)
 */
function logApiCall(data: {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status_code: number;
  response_time_ms: number;
  request_size_bytes?: number;
  user_agent?: string;
  error_message?: string;
}): void {
  // Use setImmediate to not block the response
  setImmediate(() => {
    try {
      observabilityDb.logApiCall({
        project_id: VIBEMAN_PROJECT_ID,
        ...data
      });
    } catch (error) {
      // Silently fail - don't break the app
      console.error('[Observability] Failed to log API call:', error);
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

    const startTime = Date.now();

    let response: NextResponse;
    let errorMessage: string | undefined;

    try {
      response = await next();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }

    const responseTime = Date.now() - startTime;

    logApiCall({
      endpoint,
      method: request.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      status_code: response.status,
      response_time_ms: responseTime,
      request_size_bytes: parseInt(request.headers.get('content-length') || '0'),
      user_agent: request.headers.get('user-agent') || undefined,
      error_message: errorMessage
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
