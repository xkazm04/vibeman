/**
 * API Response Guard Utilities
 *
 * Runtime validation for API response shapes to prevent
 * "Cannot read property X of undefined" crashes when
 * backend responses change or return error structures.
 *
 * Combines safe JSON parsing with zod schema validation
 * for defense-in-depth against malformed API responses.
 */

import { z } from 'zod';
import type { BehavioralContext, DbDirectionOutcome, DbBrainReflection } from '@/app/db/models/brain.types';

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
 *
 * @example
 *   const items = safeGet(data, 'requirements', []);
 *   // Never throws, returns [] if data is null or data.requirements is missing
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
 *
 * @example
 *   const data = await fetchApi<{ tasks: Task[] }>('/api/tasks');
 *   const tasks = safeGet(data, 'tasks', []);
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
 *
 * Use this AFTER safeResponseJson() to validate the shape.
 *
 * @example
 *   const raw = await safeResponseJson(response, '/api/goals');
 *   const data = parseApiResponse(raw, GoalsListSchema, '/api/goals');
 */
export function parseApiResponse<T>(
  data: unknown,
  schema: z.ZodType<T>,
  context: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3) // limit to first 3 to avoid huge error messages
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`${context} response validation failed: ${issues}`);
  }
  return result.data;
}

/**
 * Lenient parse — returns fallback on validation failure instead of throwing.
 * Use for non-critical data where a degraded experience is acceptable.
 *
 * @example
 *   const stats = parseApiResponseSafe(raw, StatsSchema, defaultStats);
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
// SHARED SCHEMAS — API response shapes used across multiple callers
// ============================================================================

// --- Brain API Schemas ---

export const BrainDecayResponseSchema = z.object({
  success: z.boolean(),
  affected: z.number(),
  decayed: z.number(),
  deleted: z.number(),
  settings: z.object({
    decayFactor: z.number(),
    retentionDays: z.number(),
  }),
});

const dbObject = <T>() => z.custom<T>(
  (val) => val !== null && typeof val === 'object',
  { message: 'Expected a non-null object' }
);

export const BrainContextResponseSchema = z.object({
  context: dbObject<BehavioralContext>().nullable().optional(),
});

export const BrainOutcomesResponseSchema = z.object({
  outcomes: z.array(dbObject<DbDirectionOutcome>()).default([]),
  stats: z.object({
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
    reverted: z.number(),
    pending: z.number(),
  }).default({ total: 0, successful: 0, failed: 0, reverted: 0, pending: 0 }),
});

export const BrainReflectionStatusSchema = z.object({
  isRunning: z.boolean().default(false),
  lastCompleted: dbObject<DbBrainReflection>().nullable().default(null),
  decisionsSinceLastReflection: z.number().default(0),
  nextThreshold: z.number().default(20),
  shouldTrigger: z.boolean().default(false),
  triggerReason: z.string().nullable().default(null),
  runningReflection: z.object({
    id: z.string(),
  }).nullable().default(null),
});

export const BrainReflectionTriggerSchema = z.object({
  reflectionId: z.string().optional(),
  promptContent: z.string().nullable().optional(),
});

export const BrainSignalsResponseSchema = z.object({
  success: z.boolean(),
  signals: z.array(z.record(z.unknown())).default([]),
});

// --- Goals API Schemas ---

const GoalRecordSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  title: z.string(),
  status: z.string(),
  order_index: z.number(),
}).passthrough(); // allow extra fields (description, dates, etc.)

export const GoalsListResponseSchema = z.object({
  goals: z.array(GoalRecordSchema),
});

export const GoalResponseSchema = z.object({
  goal: GoalRecordSchema,
});

export const GoalMutationResponseSchema = z.object({
  goal: GoalRecordSchema,
});

// --- Questions API Schemas ---

export const QuestionsResponseSchema = z.object({
  success: z.boolean(),
  questions: z.array(z.record(z.unknown())).default([]),
  grouped: z.array(z.object({
    contextMapId: z.string(),
    contextMapTitle: z.string(),
    questions: z.array(z.record(z.unknown())),
  })).default([]),
  counts: z.object({
    pending: z.number(),
    answered: z.number(),
    total: z.number(),
  }).default({ pending: 0, answered: 0, total: 0 }),
});

export const QuestionMutationSchema = z.object({
  success: z.boolean(),
  question: z.record(z.unknown()),
});

// --- Directions API Schemas ---

export const DirectionsResponseSchema = z.object({
  success: z.boolean(),
  directions: z.array(z.record(z.unknown())).default([]),
  grouped: z.array(z.object({
    contextMapId: z.string(),
    contextMapTitle: z.string(),
    directions: z.array(z.record(z.unknown())),
  })).default([]),
  counts: z.object({
    pending: z.number(),
    accepted: z.number(),
    rejected: z.number(),
    total: z.number(),
  }).default({ pending: 0, accepted: 0, rejected: 0, total: 0 }),
});

export const DirectionMutationSchema = z.object({
  success: z.boolean(),
  direction: z.record(z.unknown()),
});

export const AcceptDirectionResponseSchema = z.object({
  success: z.boolean(),
  direction: z.record(z.unknown()),
  requirementName: z.string(),
  requirementPath: z.string(),
});

// --- Generic Success Schema ---

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
});
