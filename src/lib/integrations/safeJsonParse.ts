/**
 * Safely parse JSON with a fallback value.
 *
 * Shared utility extracted from integration API routes to avoid
 * triplicated definitions.
 */
export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
