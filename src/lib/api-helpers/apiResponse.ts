/**
 * Unified API Response Envelope
 *
 * Standardizes all Brain API endpoint responses with a consistent structure:
 * {
 *   success: boolean,
 *   data: T,
 *   error?: string,
 *   meta?: Record<string, unknown>
 * }
 *
 * This eliminates inconsistent response shapes across endpoints and provides
 * type-safe response construction.
 */

import { NextResponse } from 'next/server';

/**
 * Standard API response envelope
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

/**
 * Options for building API responses
 */
interface BuildResponseOptions<T> {
  /** HTTP status code (default: 200 for success, 500 for errors) */
  status?: number;
  /** Optional metadata to include in the response */
  meta?: Record<string, unknown>;
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Build a successful API response
 *
 * @example
 * return buildSuccessResponse({ signals, stats: { total: 10 } });
 * // => { success: true, data: { signals, stats: { total: 10 } } }
 *
 * @example
 * return buildSuccessResponse({ insights }, { meta: { cached: true, version: 2 } });
 * // => { success: true, data: { insights }, meta: { cached: true, version: 2 } }
 */
export function buildSuccessResponse<T>(
  data: T,
  options: BuildResponseOptions<T> = {}
): NextResponse<ApiResponse<T>> {
  const { status = 200, meta, headers } = options;

  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response, { status, headers });
}

/**
 * Build an error API response
 *
 * @example
 * return buildErrorResponse('projectId is required', { status: 400 });
 * // => { success: false, error: 'projectId is required' } with 400 status
 *
 * @example
 * return buildErrorResponse('Internal server error');
 * // => { success: false, error: 'Internal server error' } with 500 status
 */
export function buildErrorResponse(
  error: string | Error,
  options: BuildResponseOptions<never> = {}
): NextResponse<ApiResponse<never>> {
  const { status = 500, meta, headers } = options;

  const errorMessage = error instanceof Error ? error.message : error;

  const response: ApiResponse<never> = {
    success: false,
    error: errorMessage,
  };

  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response, { status, headers });
}

/**
 * Wrap a handler function with standardized error handling
 *
 * @example
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchData();
 *   return buildSuccessResponse(data);
 * });
 */
export function withErrorHandler<T extends Array<unknown>>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('[API Handler Error]:', error);
      return buildErrorResponse(
        error instanceof Error ? error.message : 'Internal server error'
      );
    }
  };
}
