/**
 * Safe JSON parsing utilities.
 *
 * Replaces the try { JSON.parse(...) } catch { fallback } pattern
 * duplicated across the codebase.
 */

/** Parse a JSON string, returning `fallback` on failure or empty input. */
export function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/** Parse a JSON string expected to be an array; returns `[]` on failure or non-array. */
export function parseJsonArray<T = unknown>(str: string | null | undefined): T[] {
  const parsed = safeParseJson<unknown>(str, []);
  return Array.isArray(parsed) ? parsed as T[] : [];
}

/**
 * Parse a JSON string expected to be an object; returns `fallback` on failure or a
 * non-object result. Unlike `safeParseJson`, a parse failure on a NON-EMPTY string
 * is logged: a malformed JSON column is corruption worth surfacing, not silently
 * swallowing into a blank `{}`.
 */
export function safeParseJsonObject<T extends object>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    const parsed = JSON.parse(str);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as T;
    }
    console.warn('[json-utils] safeParseJsonObject: parsed value is not an object; using fallback');
    return fallback;
  } catch (err) {
    console.warn('[json-utils] safeParseJsonObject: malformed JSON, using fallback:', err instanceof Error ? err.message : err);
    return fallback;
  }
}
