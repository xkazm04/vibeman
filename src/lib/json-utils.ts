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
