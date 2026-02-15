/**
 * Error Sanitization Utility
 *
 * Strips sensitive information from error messages and details before
 * they are included in client-facing API responses.
 *
 * Sensitive patterns include: file paths, stack traces, SQL queries,
 * API keys, connection strings, and internal module names.
 */

// Patterns that indicate sensitive internal information
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Windows absolute paths (C:\Users\..., D:\projects\...)
  { pattern: /[A-Z]:\\[^\s"',)}\]]+/gi, replacement: '[path]' },
  // Unix absolute paths (/home/user/..., /var/www/...)
  { pattern: /\/(?:home|var|usr|tmp|etc|opt|srv|root)\/[^\s"',)}\]]+/g, replacement: '[path]' },
  // Stack trace lines (at Module._compile, at Object.<anonymous>)
  { pattern: /\s+at\s+[\w$.]+\s*\([^)]*\)/g, replacement: '' },
  { pattern: /\s+at\s+[^\n]+:\d+:\d+/g, replacement: '' },
  // "Error: ..." followed by stack lines
  { pattern: /\n\s+at\s+.+/g, replacement: '' },
  // SQL-like statements
  { pattern: /\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s+.{10,}/gi, replacement: '[query]' },
  // Connection strings
  { pattern: /(?:postgres|mysql|mongodb|redis|sqlite):\/\/[^\s"',)}\]]+/gi, replacement: '[connection]' },
  // API keys / tokens (long hex or base64 strings)
  { pattern: /(?:key|token|secret|password|apikey|api_key|auth)[\s=:]+["']?[A-Za-z0-9+/=_-]{20,}["']?/gi, replacement: '[redacted]' },
  // Bearer tokens
  { pattern: /Bearer\s+[A-Za-z0-9._-]+/gi, replacement: 'Bearer [redacted]' },
  // Node module paths
  { pattern: /node_modules\/[^\s"',)}\]]+/g, replacement: '[module]' },
];

/**
 * Sanitize a string by removing sensitive patterns.
 * Returns the cleaned string safe for client-facing responses.
 */
export function sanitizeErrorMessage(input: string): string {
  let result = input;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  // Collapse multiple whitespace/newlines left by removals
  result = result.replace(/\n{2,}/g, '\n').replace(/\s{2,}/g, ' ').trim();
  return result;
}

/**
 * Sanitize error details (string or object) for client-facing responses.
 * - Strings are pattern-cleaned
 * - Objects have their string values recursively cleaned
 * - Stack traces are fully stripped (only logged server-side)
 */
export function sanitizeErrorDetails(
  details: string | Record<string, unknown> | undefined
): string | Record<string, unknown> | undefined {
  if (details === undefined) return undefined;

  if (typeof details === 'string') {
    // If it looks like a stack trace, replace entirely
    if (isStackTrace(details)) {
      return undefined;
    }
    return sanitizeErrorMessage(details);
  }

  if (typeof details === 'object' && details !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      // Skip stack trace fields entirely
      if (key === 'stack' || key === 'stackTrace') continue;
      if (typeof value === 'string') {
        if (isStackTrace(value)) continue;
        sanitized[key] = sanitizeErrorMessage(value);
      } else {
        sanitized[key] = value;
      }
    }
    // If all fields were stripped, return undefined
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  return undefined;
}

/**
 * Check if a string looks like a stack trace.
 */
function isStackTrace(str: string): boolean {
  // Stack traces typically contain "at " lines with file:line:col
  const atLineCount = (str.match(/\s+at\s+/g) || []).length;
  return atLineCount >= 2;
}

/**
 * Create a safe, generic error message for the client based on error code category.
 * The original message is logged server-side; the client sees a generic message.
 *
 * For 4xx errors, the original message is usually safe (validation, not-found).
 * For 5xx errors, return a generic message to prevent information disclosure.
 */
export function safeClientMessage(originalMessage: string, statusCode: number): string {
  // 4xx messages are typically safe - they describe user input problems
  if (statusCode >= 400 && statusCode < 500) {
    return sanitizeErrorMessage(originalMessage);
  }

  // 5xx: return generic message, never expose internal details
  return 'An internal error occurred';
}
