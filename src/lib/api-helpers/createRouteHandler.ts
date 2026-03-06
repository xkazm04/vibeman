/**
 * createRouteHandler - Unified route factory with automatic middleware composition
 *
 * Consolidates the 3 competing middleware patterns (withObservability, withRateLimit, withAccessControl)
 * into a single semantic declaration.
 *
 * Benefits:
 * - Single source of truth for middleware composition per route
 * - Consistent error handling across all routes (auto-wrapped)
 * - Central audit registry for all API endpoints
 * - Guaranteed middleware order: accessControl → rateLimit → observability → errorHandling
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { withAccessControl, type AccessRole, type ProjectSource } from '@/lib/api-helpers/accessControl';
import { handleApiError, ApiErrorCode } from '@/lib/api-errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RouteMiddlewareConfig {
  /**
   * Enable observability/logging
   * @default true
   */
  observability?: boolean;

  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    tier: 'standard' | 'expensive';
  };

  /**
   * Access control configuration
   */
  accessControl?: {
    requireProject?: ProjectSource;
    minRole?: AccessRole;
  };
}

export interface CreateRouteHandlerOptions {
  /** Required: API endpoint path (e.g. '/api/ideas') */
  endpoint: string;

  /** Middleware configuration - all optional and composable */
  middleware?: RouteMiddlewareConfig;

  /** HTTP method for audit logging */
  method?: HttpMethod;

  /** Custom error code for unhandled errors @default ApiErrorCode.INTERNAL_ERROR */
  errorCode?: ApiErrorCode;
}

// ---------------------------------------------------------------------------
// Middleware Audit Registry
// ---------------------------------------------------------------------------

export interface RouteRegistryEntry {
  endpoint: string;
  method: HttpMethod;
  observability: boolean;
  rateLimit: string | false;
  accessControl: string | false;
  registeredAt: number;
}

const registry: RouteRegistryEntry[] = [];

/** Read-only snapshot of the middleware audit registry */
export function getRouteRegistry(): readonly RouteRegistryEntry[] {
  return registry;
}

// ---------------------------------------------------------------------------
// Compose middleware in the correct order
// ---------------------------------------------------------------------------

function composeMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  endpoint: string,
  options?: RouteMiddlewareConfig
): (req: NextRequest) => Promise<NextResponse> {
  let wrapped = handler;

  // Apply in reverse order so outermost runs first:
  // 1. Observability (outermost — always applied unless explicitly disabled)
  if (options?.observability !== false) {
    wrapped = withObservability(wrapped, endpoint);
  }

  // 2. Rate limiting (middle layer)
  if (options?.rateLimit) {
    wrapped = withRateLimit(wrapped, endpoint, options.rateLimit.tier);
  }

  // 3. Access control (innermost — runs first)
  if (options?.accessControl) {
    wrapped = withAccessControl(wrapped, endpoint, {
      requireProject: options.accessControl.requireProject,
      minRole: options.accessControl.minRole,
    });
  }

  return wrapped;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a unified route handler with automatic middleware composition
 * and standardized error handling.
 *
 * @example
 * ```ts
 * export const GET = createRouteHandler(handleGet, {
 *   endpoint: '/api/ideas',
 *   middleware: { rateLimit: { tier: 'expensive' } },
 * });
 * ```
 */
export function createRouteHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CreateRouteHandlerOptions
): (req: NextRequest) => Promise<NextResponse> {
  const { endpoint, middleware, method = 'GET', errorCode = ApiErrorCode.INTERNAL_ERROR } = options;

  // Register this route in the audit registry
  registry.push({
    endpoint,
    method,
    observability: middleware?.observability !== false,
    rateLimit: middleware?.rateLimit ? middleware.rateLimit.tier : false,
    accessControl: middleware?.accessControl
      ? `minRole:${middleware.accessControl.minRole || 'viewer'}`
      : false,
    registeredAt: Date.now(),
  });

  // Wrap handler with standardized error catching
  const safeHandler = async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error, `${method} ${endpoint}`, errorCode);
    }
  };

  return composeMiddleware(safeHandler, endpoint, middleware);
}

// ---------------------------------------------------------------------------
// Quick-start helpers for common patterns
// ---------------------------------------------------------------------------

export const RoutePatterns = {
  /** Simple endpoint — observability + error handling */
  simple: (
    handler: (req: NextRequest) => Promise<NextResponse>,
    endpoint: string,
    method: HttpMethod = 'GET'
  ) => createRouteHandler(handler, { endpoint, method }),

  /** Expensive operation — rate limit + observability */
  expensive: (
    handler: (req: NextRequest) => Promise<NextResponse>,
    endpoint: string,
    method: HttpMethod = 'POST'
  ) =>
    createRouteHandler(handler, {
      endpoint,
      method,
      middleware: { rateLimit: { tier: 'expensive' } },
    }),

  /** Protected endpoint — access control + rate limit + observability */
  protected: (
    handler: (req: NextRequest) => Promise<NextResponse>,
    endpoint: string,
    accessOptions?: { requireProject?: ProjectSource; minRole?: AccessRole },
    method: HttpMethod = 'GET'
  ) =>
    createRouteHandler(handler, {
      endpoint,
      method,
      middleware: {
        accessControl: {
          requireProject: accessOptions?.requireProject || 'body',
          minRole: accessOptions?.minRole || 'viewer',
        },
        rateLimit: { tier: 'standard' },
      },
    }),

  /** Admin endpoint — strict access control */
  admin: (
    handler: (req: NextRequest) => Promise<NextResponse>,
    endpoint: string,
    method: HttpMethod = 'POST'
  ) =>
    createRouteHandler(handler, {
      endpoint,
      method,
      middleware: {
        accessControl: { minRole: 'admin' },
      },
    }),
};
