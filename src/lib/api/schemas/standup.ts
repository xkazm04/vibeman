/**
 * Standup API Schemas
 *
 * Zod schemas for JSON-serialized fields in standup records.
 * Each schema includes a `_v` version stamp. On read, unversioned
 * (legacy) records are migrated to the current shape via
 * `migrateStandupItem` before validation.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

/** Current schema version for all standup JSON blobs */
export const STANDUP_JSON_VERSION = 1;

export const StandupBlockerSchema = z.object({
  _v: z.number().optional(),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  relatedContext: z.string().optional(),
  suggestedAction: z.string().optional(),
});

export const StandupHighlightSchema = z.object({
  _v: z.number().optional(),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['achievement', 'milestone', 'quality_improvement', 'velocity_boost']),
  metric: z.string().optional(),
});

export const StandupFocusAreaSchema = z.object({
  _v: z.number().optional(),
  area: z.string(),
  contextId: z.string().optional(),
  scanType: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  reason: z.string(),
});

/**
 * Migrate a single standup JSON item from its stored version to the
 * current version. Legacy items (no `_v`) are treated as version 0.
 *
 * Add new migration steps here as the schema evolves:
 *   if (version < 2) { /* transform from v1 → v2 *\/ }
 */
function migrateStandupItem(item: Record<string, unknown>): Record<string, unknown> {
  const version = typeof item._v === 'number' ? item._v : 0;

  // v0 → v1: stamp version (no shape change, current types are v1)
  if (version < 1) {
    item._v = STANDUP_JSON_VERSION;
  }

  return item;
}

/**
 * Parse a nullable JSON string as a typed array, validating each element against
 * the given Zod schema. Before validation, each item is run through
 * `migrateStandupItem` so legacy records are upgraded to the current shape.
 * Invalid items are filtered out and logged rather than silently dropped.
 * Returns an empty array on JSON parse failure.
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
    if (typeof item === 'object' && item !== null) {
      migrateStandupItem(item as Record<string, unknown>);
    }
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
