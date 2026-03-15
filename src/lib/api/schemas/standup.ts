/**
 * Standup API Schemas
 *
 * Zod schemas for JSON-serialized fields in standup records.
 * Use parseStandupJsonArray in place of safeParseJsonArray to get
 * typed results with validation error logging.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

export const StandupBlockerSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  relatedContext: z.string().optional(),
  suggestedAction: z.string().optional(),
});

export const StandupHighlightSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['achievement', 'milestone', 'quality_improvement', 'velocity_boost']),
  metric: z.string().optional(),
});

export const StandupFocusAreaSchema = z.object({
  area: z.string(),
  contextId: z.string().optional(),
  scanType: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  reason: z.string(),
});

/**
 * Parse a nullable JSON string as a typed array, validating each element against
 * the given Zod schema. Invalid items are filtered out and logged rather than
 * silently dropped. Returns an empty array on JSON parse failure.
 */
export function parseStandupJsonArray<T>(
  schema: z.ZodType<T>,
  value: string | null | undefined,
  fieldName?: string
): T[] {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    logger.warn('Failed to parse standup JSON field', { fieldName });
    return [];
  }

  if (!Array.isArray(parsed)) {
    logger.warn('Standup JSON field is not an array', { fieldName });
    return [];
  }

  const results: T[] = [];
  for (const item of parsed) {
    const result = schema.safeParse(item);
    if (result.success) {
      results.push(result.data);
    } else {
      logger.warn('Standup JSON array item failed schema validation', {
        fieldName,
        errors: result.error.flatten(),
      });
    }
  }
  return results;
}
