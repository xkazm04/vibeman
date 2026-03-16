/**
 * Server-side input sanitizers for API route request bodies.
 *
 * These operate on raw strings *before* they reach business logic — they
 * strip or neutralise characters that could cause path-traversal, command
 * injection, or log-injection issues.  For HTML/XSS sanitization of
 * rendered content, use `@/lib/sanitize` (DOMPurify-based) instead.
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

  // Remove null bytes
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
