/**
 * Server-side input sanitizers for API route request bodies.
 *
 * These operate on raw strings *before* they reach business logic — they
 * strip or neutralise characters that could cause path-traversal, command
 * injection, XSS, or log-injection issues.  For HTML/XSS sanitization of
 * rendered content, use `@/lib/sanitize` (DOMPurify-based) instead.
 *
 * Sanitization rules:
 * - Paths:      null bytes removed, normalized via `path.normalize()`
 * - Filenames:  reduced to basename, control chars stripped
 * - Strings:    control chars stripped, length-capped
 * - Shell args: metacharacters escaped to prevent command injection
 * - IDs:        non-alphanumeric/dash characters stripped (UUID-safe)
 * - JSON values: recursive string sanitization within parsed objects
 */

import path from 'path';

// ── Path sanitization ───────────────────────────────────────────────

/**
 * Normalise and sanitise a filesystem path:
 * - Strips null bytes
 * - Normalises slashes (Windows backslash → forward slash)
 * - Collapses repeated separators
 * - Trims leading/trailing whitespace
 *
 * Does NOT validate existence or permissions — pair with
 * `validateProjectPath` from `inputValidator` for that.
 */
export function sanitizePath(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw.trim();

  // Remove null bytes (prevent null-byte injection in file operations)
  cleaned = cleaned.replace(/\0/g, '');

  // Normalize via Node's path (resolves . and collapses separators)
  cleaned = path.normalize(cleaned);

  return cleaned;
}

// ── String sanitization ─────────────────────────────────────────────

/**
 * Strip control characters (U+0000–U+001F except tab, newline, carriage
 * return) that could corrupt logs or terminal output.
 */
export function stripControlChars(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  // Keep \t (0x09), \n (0x0A), \r (0x0D)
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Sanitise a plain-text string for safe inclusion in log messages or
 * error responses.  Strips control chars and truncates to `maxLength`.
 */
export function sanitizeString(raw: string, maxLength = 1000): string {
  if (!raw || typeof raw !== 'string') return '';
  return stripControlChars(raw).slice(0, maxLength);
}

/**
 * Ensure a value intended as a filename contains no path separators or
 * traversal sequences.  Returns the basename only.
 */
export function sanitizeFilename(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw.trim();

  // Remove null bytes and control characters
  cleaned = stripControlChars(cleaned);
  cleaned = cleaned.replace(/\0/g, '');

  // Extract basename to strip any directory components
  cleaned = path.basename(cleaned);

  return cleaned;
}

// ── ID sanitization ─────────────────────────────────────────────────

/**
 * Sanitise a string intended as an identifier (UUID, session ID, etc.).
 * Strips everything except alphanumeric characters and hyphens, then
 * truncates to `maxLength`. Safe for use in SQL parameters and log output.
 */
export function sanitizeId(raw: string, maxLength = 128): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, maxLength);
}

// ── Shell argument sanitization ─────────────────────────────────────

/**
 * Shell metacharacters that can trigger command injection when a value
 * is interpolated into a shell command string. These are stripped rather
 * than escaped to avoid double-escaping issues across platforms.
 */
const SHELL_METACHAR_RE = /[;&|`$(){}[\]!#<>\\]/g;

/**
 * Sanitise a string that may be used as a shell argument (e.g. git
 * commit messages, branch names). Strips shell metacharacters and
 * control characters to prevent command injection.
 *
 * This is a defence-in-depth measure — callers should still use
 * parameterised execution (e.g. `execFile`) rather than shell strings
 * where possible.
 */
export function sanitizeShellArg(raw: string, maxLength = 1000): string {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = stripControlChars(raw);
  cleaned = cleaned.replace(SHELL_METACHAR_RE, '');

  return cleaned.slice(0, maxLength);
}

// ── JSON value sanitization ─────────────────────────────────────────

/**
 * Recursively sanitise all string values within a parsed JSON structure.
 * Non-string primitives (numbers, booleans, null) are passed through
 * unchanged. Applies `sanitizeString` to every string leaf.
 *
 * Use this for arbitrary user-provided JSON payloads where individual
 * field sanitizers aren't practical.
 */
export function sanitizeJsonValues<T>(value: T, maxStringLength = 1000): T {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return sanitizeString(value, maxStringLength) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeJsonValues(item, maxStringLength)) as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Sanitise keys too — prevents log injection via object keys
      const cleanKey = sanitizeString(key, 255);
      result[cleanKey] = sanitizeJsonValues(val, maxStringLength);
    }
    return result as unknown as T;
  }

  // Numbers, booleans — pass through
  return value;
}
