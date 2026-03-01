/**
 * Common API Response Schemas & Utilities
 *
 * Runtime validation utilities and shared schemas used across all API domains.
 */

import { z } from 'zod';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely parse a fetch Response as JSON.
 * Returns the parsed data or throws a descriptive error
 * if the response is not valid JSON (e.g. HTML error pages).
 */
export async function safeResponseJson<T = unknown>(
  response: Response,
  context?: string
): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    throw new Error(
      `${context || 'API'} returned non-JSON response (${response.status})`
    );
  }

  try {
    return await response.json() as T;
  } catch {
    throw new Error(
      `${context || 'API'} returned invalid JSON (${response.status})`
    );
  }
}

/**
 * Safely extract a property from a parsed response object.
 * Returns the fallback value if the data is null/undefined
 * or the property doesn't exist.
 */
export function safeGet<T>(
  data: unknown,
  key: string,
  fallback: T
): T {
  if (data == null || typeof data !== 'object') return fallback;
  const value = (data as Record<string, unknown>)[key];
  return (value !== undefined && value !== null) ? value as T : fallback;
}

/**
 * Fetch JSON from an API endpoint with built-in error handling.
 * Throws descriptive errors for non-OK responses and non-JSON content.
 */
export async function fetchApi<T = unknown>(
  url: string,
  options?: RequestInit,
  context?: string
): Promise<T> {
  const response = await fetch(url, options);
  const data = await safeResponseJson<T>(response, context || url);

  if (!response.ok) {
    const errorMsg = safeGet(data, 'error', '') || safeGet(data, 'message', '');
    throw new Error(errorMsg || `Request failed: ${response.status}`);
  }

  return data;
}

// ============================================================================
// ZOD-BASED RUNTIME VALIDATION
// ============================================================================

/**
 * Parse a raw API response through a zod schema.
 * Returns the validated+typed data, or throws a descriptive error
 * listing which fields failed validation.
 */
export function parseApiResponse<T>(
  data: unknown,
  schema: z.ZodType<T>,
  context: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`${context} response validation failed: ${issues}`);
  }
  return result.data;
}

/**
 * Lenient parse — returns fallback on validation failure instead of throwing.
 * Use for non-critical data where a degraded experience is acceptable.
 */
export function parseApiResponseSafe<T>(
  data: unknown,
  schema: z.ZodType<T>,
  fallback: T,
  context?: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (context) {
      console.warn(`[ResponseGuard] ${context} validation failed:`, result.error.issues.slice(0, 3));
    }
    return fallback;
  }
  return result.data;
}

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

/** Generic success response */
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

/** Reusable helper for loose DB object validation */
export const dbObject = <T>() => z.custom<T>(
  (val) => val !== null && typeof val === 'object',
  { message: 'Expected a non-null object' }
);
