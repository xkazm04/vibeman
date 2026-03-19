/**
 * Safe JSON parse with structured error logging for cross-task data.
 * Returns { value, warning } — if parsing fails, value is the fallback
 * and warning describes the corruption for upstream callers.
 */

interface SafeParseResult<T> {
  value: T;
  warning: string | null;
}

export function safeParseJson<T>(
  raw: string | null | undefined,
  fallback: T,
  context: { field: string; recordId: string }
): SafeParseResult<T> {
  if (raw == null || raw === '') {
    return { value: fallback, warning: null };
  }

  try {
    return { value: JSON.parse(raw) as T, warning: null };
  } catch (err) {
    const preview = raw.length > 120 ? raw.slice(0, 120) + '…' : raw;
    const message = `Corrupt JSON in ${context.field} (record ${context.recordId}): ${err instanceof Error ? err.message : 'parse error'}`;

    console.error(`[cross-task] ${message} | raw preview: ${preview}`);

    return {
      value: fallback,
      warning: message,
    };
  }
}
