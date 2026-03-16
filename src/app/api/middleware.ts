/**
 * API Route Middleware Utilities
 *
 * Composable middleware wrappers for Next.js API route handlers.
 * Provides request/response logging and centralized error handling
 * that can be combined with other wrappers like `withObservability`.
 *
 * @example
 * // Basic usage — logs requests and catches unhandled errors:
 * async function handleGet(request: NextRequest) {
 *   const data = db.getAll();
 *   return NextResponse.json({ data });
 * }
 * export const GET = withRequestLogging(handleGet, '/api/my-resource');
 *
 * @example
 * // Combined with observability:
 * export const GET = withObservability(
 *   withRequestLogging(handleGet, '/api/my-resource'),
 *   '/api/my-resource'
 * );
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { handleApiError, ApiErrorCode } from '@/lib/api-errors';

const log = logger.child('api');

/**
 * Wraps a route handler with structured request/response logging
 * and a safety-net error boundary.
 *
 * Logs:
 * - Request: method, endpoint, content-length (debug level)
 * - Response: status, duration (debug for 2xx, warn for 4xx/5xx)
 * - Errors: full details server-side, sanitized response to client
 *
 * @param handler - The async route handler
 * @param endpoint - Route label for log messages (e.g. '/api/ideas')
 * @param defaultCode - Fallback ApiErrorCode for unclassified errors
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withRequestLogging<T extends (request: NextRequest, ...args: any[]) => Promise<NextResponse<any>>>(
  handler: T,
  endpoint: string,
  defaultCode: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (request: NextRequest, ...args: any[]) => {
    const elapsed = logger.startTimer();
    const method = request.method;
    const contentLength = request.headers.get('content-length');

    log.debug(`${method} ${endpoint}`, {
      ...(contentLength && { contentLength: parseInt(contentLength) }),
    });

    let response: NextResponse;

    try {
      response = await handler(request, ...args);
    } catch (error) {
      const { durationMs } = elapsed();

      log.error(`${method} ${endpoint} — unhandled error`, {
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      });

      return handleApiError(error, `${method} ${endpoint}`, defaultCode);
    }

    const { durationMs } = elapsed();

    if (response.status >= 500) {
      log.warn(`${method} ${endpoint} ${response.status}`, { durationMs });
    } else if (response.status >= 400) {
      log.debug(`${method} ${endpoint} ${response.status}`, { durationMs });
    } else {
      log.debug(`${method} ${endpoint} ${response.status}`, { durationMs });
    }

    return response;
  }) as T;
}
