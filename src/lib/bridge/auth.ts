/**
 * Bridge Authentication
 * API key validation for bridge endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_API_KEY_HEADER = 'X-Bridge-API-Key';

/**
 * Get the configured bridge API key from environment
 * If not set, bridge is open (for local development)
 */
function getBridgeApiKey(): string | null {
  return process.env.BRIDGE_API_KEY || null;
}

/**
 * Validate the API key from request headers
 * Returns true if valid or if no key is configured (open mode)
 */
export function validateBridgeAuth(request: NextRequest): boolean {
  const configuredKey = getBridgeApiKey();

  // If no key configured, allow all requests (dev mode)
  if (!configuredKey) {
    return true;
  }

  const providedKey = request.headers.get(BRIDGE_API_KEY_HEADER);
  return providedKey === configuredKey;
}

/**
 * Middleware-style auth check that returns error response if invalid
 */
export function requireBridgeAuth(request: NextRequest): NextResponse | null {
  if (!validateBridgeAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing API key' },
      { status: 401 }
    );
  }
  return null;
}

/**
 * Helper to create unauthorized response
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message: 'Invalid or missing API key' },
    { status: 401 }
  );
}

/**
 * Helper to create error response
 */
export function bridgeErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { error: 'Bridge Error', message },
    { status }
  );
}

/**
 * Helper to create success response
 */
export function bridgeSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}
